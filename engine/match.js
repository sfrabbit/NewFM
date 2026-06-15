// ============================================================
// 比赛引擎 — 新6核心模块系统（2026年6月重构）
// ============================================================
// 完全使用新的6个核心模块：
//   pass, dribble, shoot, tackle, contest, save
//
// 每个事件都经过：
//   1. 情境判断（determineSituation）
//   2. 动作选择（selectAction）
//   3. 模块执行（executeAction）
//   4. 结果处理（球权转移/射门处理）
// ============================================================

const { Rng } = require("./rng");
const { findNearestOpponent } = require("./teams");
const { determineSituation, selectAction, executeAction, buildContext } = require("./situations");
const { getZoneV, getZoneH, zoneToCoord, coordToZone, getPlayerZone, PITCH_LENGTH, PITCH_WIDTH } = require("./zones");
const { updatePlayerPositions, calculateCompactness } = require("./movement");

class MatchEngine {
  constructor(home, away, seed = null) {
    this.rng = new Rng(seed === null ? undefined : seed);
    this.home = home;
    this.away = away;

    this.minute = 0;
    this.second = 0;
    this.stoppage_time = 0;
    this.is_half_time = false;
    this.is_full_time = false;
    this.halftime_reached = false;

    this.score_home = 0;
    this.score_away = 0;

    this.ball_zone = "MID_D_C";
    this._ballCoord = { x: 0, y: 0 };  // 球的真实坐标(米)，从zone中心推导
    this.possession = "home";
    this.ball_carrier = null;

    this.set_piece = null;
    this.is_transition = false;
    this.is_scramble = false;
    this.is_breaking_away = false;
    this.last_event_follow_up = null;
    this._scramble_chain = 0;
    this._collapse_timer = 0;

    this.events = [];
    this.stats = {
      home: { shots: 0, shots_on_target: 0, possession: 0, passes: 0, tackles: 0, fouls: 0, corners: 0, saves: 0 },
      away: { shots: 0, shots_on_target: 0, possession: 0, passes: 0, tackles: 0, fouls: 0, corners: 0, saves: 0 },
    };
    this.possession_counter = 0;
    this.possession_home = 0;

    this._zones_home = null;
    this._zones_away = null;

    // ===== 22人移动系统 =====
    this._playerCoords = {};  // pid → { x, y } 真实坐标(米)
    this._tickCount = 0;
    this._movementHistory = []; // 每N步记录一次位置快照
  }

  _getZones(team) {
    if (team === "home") {
      if (!this._zones_home) this._zones_home = this.home.getPlayerZones();
      return this._zones_home;
    }
    if (!this._zones_away) this._zones_away = this.away.getPlayerZones();
    return this._zones_away;
  }

  _invalidateZones() { this._zones_home = null; this._zones_away = null; }
  _attTeam() { return this.possession === "home" ? this.home : this.away; }
  _defTeam() { return this.possession === "home" ? this.away : this.home; }
  _attZones() { return this._getZones(this.possession); }
  _defZones() { return this._getZones(this.possession === "home" ? "away" : "home"); }

  /** 球zone更新后同步真实坐标 */
  _syncBallCoord() {
    if (this.ball_zone) {
      try { this._ballCoord = zoneToCoord(this.ball_zone); }
      catch(e) { this._ballCoord = { x: 0, y: 0 }; }
    }
  }

  _getCarrierPlayer() {
    if (!this.ball_carrier) return null;
    return this._attTeam().players[this.ball_carrier] || null;
  }

  _getOpponentPlayer() {
    // 用球的真实坐标 + 防守方真实坐标找最近对手（不再用zone距离）
    const defTeam = this._defTeam();
    const ballC = this._ballCoord;
    let bestPid = null, bestDist = Infinity;
    for (const [pid, c] of Object.entries(this._playerCoords)) {
      if (c.team === this.possession) continue; // 跳过己方
      const dx = ballC.x - c.x, dy = ballC.y - c.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < bestDist) { bestDist = d; bestPid = pid; }
    }
    if (!bestPid) return null;
    return defTeam.players[bestPid] || null;
  }

  /** 计算球到最近防守者的真实距离(米) */
  _ballDefDist() {
    const ballC = this._ballCoord;
    let minD = Infinity;
    for (const [, c] of Object.entries(this._playerCoords)) {
      if (c.team === this.possession) continue;
      const dx = ballC.x - c.x, dy = ballC.y - c.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < minD) minD = d;
    }
    return minD === Infinity ? 25 : minD;
  }

  _getGkPlayer(teamId = null) {
    const t = teamId ? (teamId === "home" ? this.home : this.away) : this._defTeam();
    for (const p of Object.values(t.players)) {
      if (p.role === "GK") return p;
    }
    return null;
  }

  /** 从当前进攻方选择一个非门将球员作为持球者(加权随机) */
  _pickNonGkCarrier() {
    const attZ = this._attZones();
    const attTeam = this._attTeam();
    const entries = Object.entries(attZ).filter(([pid, [, role]]) => {
      const p = attTeam.players[pid];
      return p && role !== 'GK';  // 排除门将
    });

    if (entries.length === 0) return;

    // 根据球的区域调整接球者权重：禁区找前锋，中场找组织者，后场找后卫
    const v = getZoneV(this.ball_zone);
    const weights = entries.map(([pid, [, role]]) => {
      // 进攻区域：前锋和边锋是第一选择
      if (v === 'BOX_A' || v === 'DEEP_A') {
        if (/^(ST_)/.test(role)) return 50;
        if (/^(W_|IF_|AM_)/.test(role)) return 35;
        if (/^(CM_)/.test(role)) return 20;
        return 10;
      }
      // 中场：组织核心
      if (v === 'MID_A' || v === 'MID_D') {
        if (/^(CM_|AM_)/.test(role)) return 40;
        if (/^(ST_|W_|IF_)/.test(role)) return 30;
        if (/^(DM_)/.test(role)) return 20;
        return 15;
      }
      // 后场：后卫和防守中场
      if (/^(DM_|CB_)/.test(role)) return 40;
      if (/^(FB_|WB_)/.test(role)) return 30;
      if (/^(CM_)/.test(role)) return 25;
      return 15;
    });

    // 加权随机选择
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.rng.random() * total;
    for (let i = 0; i < entries.length; i++) {
      r -= weights[i];
      if (r <= 0 || i === entries.length - 1) {
        this.ball_carrier = entries[i][0];
        this.ball_zone = entries[i][1][0];
        return;
      }
    }
  }

  _pickGkCarrier() {
    const attZ = this._attZones();
    const attTeam = this._attTeam();
    for (const [pid, [, role]] of Object.entries(attZ)) {
      if (role === 'GK') {
        this.ball_carrier = pid;
        return;
      }
    }
    // 找不到GK时fallback到非GK
    this._pickNonGkCarrier();
  }

  // 传球落点：连续 riskLevel(0-1) → 连续距离
  // riskLevel 0 = 5-12m 完全安全, 0.5 = 12-25m 标准推进, 1 = 30-55m 长传
  _advanceBallByPass(riskLevel) {
    const coord = zoneToCoord(this.ball_zone);
    if (!coord) return;

    const r = typeof riskLevel === 'number' ? Math.max(0, Math.min(1, riskLevel)) : 0.4;
    // 连续映射：前进距离和平移距离都随 riskLevel 线性增长
    const minF = 3 + r * 12,   maxF = 10 + r * 40;
    const maxLat = 3 + r * 20;

    const forwardM = minF + this.rng.random() * (maxF - minF);
    const lateralM = (this.rng.random() - 0.5) * maxLat * 2;

    const newX = coord.x + forwardM;
    const newY = coord.y + lateralM;
    this.ball_zone = coordToZone(newX, newY);
  }

  // 盘带推进：用真实米制距离
  _advanceBallByDribble(dribbleType) {
    const coord = zoneToCoord(this.ball_zone);
    if (!coord) return;

    let forwardM, lateralM;
    switch (dribbleType) {
      case 'burst':
        forwardM = 8 + this.rng.random() * 7;            // 8-15m 冲刺
        lateralM = (this.rng.random() - 0.5) * 6;        // ±3m
        break;
      case 'control':
        forwardM = 3 + this.rng.random() * 5;             // 3-8m 稳步
        lateralM = (this.rng.random() - 0.5) * 4;
        break;
      case 'force':
        forwardM = 3 + this.rng.random() * 7;             // 3-10m 强突
        lateralM = (this.rng.random() - 0.5) * 4;
        break;
      case 'feint':
        forwardM = 3 + this.rng.random() * 7;             // 3-10m
        lateralM = (this.rng.random() - 0.5) * 10;        // ±5m 晃开角度
        break;
      case 'shield':
        forwardM = this.rng.random() * 3;                 // 0-3m 护球
        lateralM = 0;
        break;
      default:
        forwardM = 5; lateralM = 0;
    }

    const newX = coord.x + forwardM;
    const newY = coord.y + lateralM;
    this.ball_zone = coordToZone(newX, newY);
  }

  // ============================================================
  // 22人移动系统
  // ============================================================

  /** 初始化所有22名球员的真实坐标(从zone推导) */
  _initPlayerCoords() {
    this._playerCoords = {};

    // 主场: zone → 坐标
    for (const [pid, p] of Object.entries(this.home.players)) {
      const zone = getPlayerZone(p.role, this.home.tactics);
      const { x, y } = zoneToCoord(zone);
      this._playerCoords[pid] = {
        x, y, defaultX: x, defaultY: y,
        role: p.role, attrs: p.attrs,
        fatigue: 0, distanceCovered: 0,
        team: 'home'
      };
    }

    // 客场: mirrored zone → 坐标, 然后翻转x(客场攻击方向相反)
    const { mirrorZone: mz } = require("./zones");
    for (const [pid, p] of Object.entries(this.away.players)) {
      const rawZone = getPlayerZone(p.role, this.away.tactics);
      const zone = mz(rawZone);
      const { x, y } = zoneToCoord(zone);
      this._playerCoords[pid] = {
        x: -x, y: y, defaultX: -x, defaultY: y,
        role: p.role, attrs: p.attrs,
        fatigue: 0, distanceCovered: 0,
        team: 'away'
      };
    }
  }

  /** 推断当前球队的战术风格 */
  _inferTacticalStyle(team) {
    const t = team.tactics;
    const pi = t.getPressingMod();
    if (pi >= 1) return 'high_press';
    if (pi <= -1) return 'low_block';
    if (t.getCompactnessMod() >= 1) return 'low_block';
    if (t.getTempoMod() <= -1) return 'medium_block';
    return 'medium_block';
  }

  /**
   * 每步更新22名球员位置
   * @param {number} dt 时间步长(秒)
   */
  _stepMovementPlayers(dt) {
    // 构建22人数组
    const allPlayers = [];
    for (const [pid, coord] of Object.entries(this._playerCoords)) {
      const team = coord.team === 'home' ? this.home : this.away;
      const playerObj = team.players[pid];
      if (!playerObj) continue;

      const isAttacking = this.possession === coord.team;

      allPlayers.push({
        id: pid,
        role: coord.role,
        team: coord.team,
        attrs: coord.attrs || playerObj.attrs || {},
        x: coord.x, y: coord.y,
        defaultX: coord.defaultX, defaultY: coord.defaultY,
        fatigue: coord.fatigue || 0,
        distanceCovered: coord.distanceCovered || 0,
        teamRole: isAttacking ? 'attacking' : 'defending',
        side: coord.defaultY != null ? (coord.defaultY < -5 ? 'left' : (coord.defaultY > 5 ? 'right' : null)) : null
      });
    }

    // 获取球的真实坐标
    let ballCoord = { x: 0, y: 0 };
    try {
      ballCoord = zoneToCoord(this.ball_zone);
    } catch(e) {
      // fallback
    }

    // 推断两个队的战术风格
    const attStyle = this._inferTacticalStyle(this._attTeam());

    const ctx = {
      pitchWidth: PITCH_WIDTH, pitchLength: PITCH_LENGTH,
      ballPosition: ballCoord,
      tacticalStyle: attStyle,
      allPlayers
    };

    // 执行移动
    const updated = updatePlayerPositions(allPlayers, ctx, dt);

    // 回写坐标
    for (const p of updated) {
      if (this._playerCoords[p.id]) {
        this._playerCoords[p.id].x = p.x;
        this._playerCoords[p.id].y = p.y;
        this._playerCoords[p.id].fatigue = p.fatigue || 0;
        this._playerCoords[p.id].distanceCovered = p.distanceCovered || 0;
      }
    }

    // 同步疲劳度到球员对象
    for (const p of updated) {
      const team = p.team === 'home' ? this.home : this.away;
      const po = team.players[p.id];
      if (po) po.fatigue = p.fatigue || 0;
    }

    // 记录移动快照(每5步)
    this._tickCount++;
    if (this._tickCount % 5 === 0) {
      const snapshot = {
        tick: this._tickCount,
        minute: this.minute,
        players: updated.map(p => ({
          id: p.id, role: p.role, team: p.team,
          x: p.x.toFixed(1), y: p.y.toFixed(1),
          fatigue: (p.fatigue * 100).toFixed(0) + '%'
        }))
      };
      this._movementHistory.push(snapshot);
      if (this._movementHistory.length > 50) this._movementHistory.shift();
    }
  }

  // ============================================================

  initMatch(firstPossession = "home") {
    this.possession = firstPossession;
    this._invalidateZones();

    // 初始化22人坐标
    this._initPlayerCoords();

    const attZones = this._attZones();
    const attTeam = this._attTeam();
    for (const [pid, [z, role]] of Object.entries(attZones)) {
      if (role.startsWith("ST_")) {
        this.ball_carrier = pid;
        this.ball_zone = z;
        return;
      }
    }
    const fallbackPid = Object.keys(attTeam.players).pop();
    this.ball_carrier = fallbackPid;
    this.ball_zone = (attZones[fallbackPid] || ["MID_D_C", "ST_C"])[0];
  }

  _advanceTime(min, max) {
    const sec = this.rng.randint(min, max);
    this.second += sec;
    while (this.second >= 60) { this.second -= 60; this.minute += 1; }
    if (this.minute >= 45 && !this.halftime_reached) {
      this.halftime_reached = true;
      this.is_half_time = true;
    }
    if (this.minute >= 90) {
      if (this.stoppage_time === 0) this.stoppage_time = this.rng.randint(2, 5);
      if (this.minute >= 90 + this.stoppage_time) this.is_full_time = true;
    }
  }

  _updateStats(type, success) {
    const tk = this.possession === "home" ? "home" : "away";
    this.possession_counter += 1;
    if (this.possession === "home") this.possession_home += 1;

    if (type === 'pass') this.stats[tk].passes += 1;
    if (type === 'tackle') this.stats[tk].tackles += 1;
  }

  _generateEventDescription(situation, actionType, result, playerName, zoneName) {
    const { type, subType } = situation;

    switch (type) {
      case 'pass':
        if (result.successProb > 0.7) {
          return `[${this.minute}'] ${playerName}在${zoneName}完成精准传球`;
        } else if (result.successProb > 0.4) {
          return `[${this.minute}'] ${playerName}在${zoneName}尝试传球${result.interceptProb > 0.3 ? '被拦截!' : ''}`;
        } else {
          return `[${this.minute}'] ${playerName}在${zoneName}传球失误`;
        }

      case 'dribble':
        if (result.successRate > 0.7) {
          return `[${this.minute}'] ${playerName}在${zoneName}成功盘带突破`;
        } else if (result.successRate > 0.4) {
          return `[${this.minute}'] ${playerName}在${zoneName}尝试盘带${result.intent?.feint?.isDeceived ? '假动作骗过防守!' : ''}`;
        } else {
          return `[${this.minute}'] ${playerName}在${zoneName}盘带被断`;
        }

      case 'shoot':
        this.stats[this.possession === "home" ? "home" : "away"].shots += 1;
        if (result.totalProb > 0.3) {
          this.stats[this.possession === "home" ? "home" : "away"].shots_on_target += 1;
          return `[${this.minute}'] ${playerName}在${zoneName}射门! 球进了! ⚽`;
        } else if (result.onTargetRate > 0.5) {
          this.stats[this.possession === "home" ? "home" : "away"].shots_on_target += 1;
          return `[${this.minute}'] ${playerName}在${zoneName}射门! 被门将扑出!`;
        } else {
          return `[${this.minute}'] ${playerName}在${zoneName}射门打偏`;
        }

      case 'tackle':
        if (result.winProb > 0.6) {
          this.stats[this.possession === "home" ? "home" : "away"].tackles += 1;
          return `[${this.minute}'] ${playerName}成功抢断!${result.anticipation?.isCorrect ? '预判准确!' : ''}`;
        } else if (result.foulProb > 0.3) {
          this.stats[this.possession === "home" ? "home" : "away"].fouls += 1;
          return `[${this.minute}'] ${playerName}抢断犯规!`;
        } else {
          return `[${this.minute}'] ${playerName}抢断失败`;
        }

      case 'contest':
        if (result.winProb > 0.6) {
          return `[${this.minute}'] ${playerName}争顶成功!`;
        } else {
          return `[${this.minute}'] ${playerName}争顶失败`;
        }

      case 'save':
        this.stats[this.possession === "home" ? "away" : "home"].saves += 1;
        if (result.saveProb > 0.5) {
          return `[${this.minute}'] 门将精彩扑救!${result.anticipation?.isCorrect ? '预判准确!' : ''}`;
        } else {
          return `[${this.minute}'] 门将扑救失败`;
        }

      default:
        return `[${this.minute}'] ${playerName}在${zoneName}处理球`;
    }
  }

  _resolveResult(situation, actionType, result, carrier, opponent, gk) {
    const { type } = situation;
    const rng = this.rng.random();

    switch (type) {
      case 'pass': {
        const success = rng < result.successProb;
        this._updateStats('pass', success);

        if (success) {
          // 传球落点由传球类型决定：safe=保持/推1格, normal=推1格, risky=穿1-2层, long=跨2-3层
          this._advanceBallByPass(actionType);
          this._invalidateZones();
          this.ball_carrier = null;
          this._pickNonGkCarrier();
          return { success: true, desc: '传球成功', followUp: null };
        } else {
          // 传球失败：球权转移给防守方最近的球员
          this.possession = this.possession === "home" ? "away" : "home";
          this._invalidateZones();
          this.ball_carrier = null;
          this._pickNonGkCarrier();
          return { success: false, desc: '传球被断', followUp: null };
        }
      }

      case 'dribble': {
        const success = rng < result.successRate;
        this._updateStats('dribble', success);

        if (success) {
          // 盘带推进由类型决定：burst跨1-2层，control稳步，shield原地，feint+force小幅
          this._advanceBallByDribble(actionType);
          return { success: true, desc: '盘带突破', followUp: null };
        } else {
          if (this.rng.random() < 0.7) {
            this.possession = this.possession === "home" ? "away" : "home";
            this._invalidateZones();
            this.ball_carrier = null;
            this._pickNonGkCarrier();
          }
          return { success: false, desc: '盘带被断', followUp: null };
        }
      }

      case 'shoot': {
        // 射门处理
        const notBlocked = rng > result.blockRate;
        if (!notBlocked) {
          // 被阻挡
          return { success: false, desc: '射门被阻挡', followUp: 'blocked' };
        }

        const onTarget = this.rng.random() < result.onTargetRate;
        if (!onTarget) {
          this.stats[this.possession === "home" ? "home" : "away"].shots += 1;
          return { success: false, desc: '射门偏出', followUp: 'goal_kick' };
        }

        this.stats[this.possession === "home" ? "home" : "away"].shots += 1;
        this.stats[this.possession === "home" ? "home" : "away"].shots_on_target += 1;

        // 射正，门将扑救
        const gkResult = executeAction('save', 'save', gk.attrs, {
          ...situation.context,
          shotDirection: result.shotDirection || 'center',
          shotDistance: situation.context.distance,
          shotPower: 0.7,
          shotHeight: 0.3
        });

        const saved = this.rng.random() < gkResult.saveProb;
        if (saved) {
          this.stats[this.possession === "home" ? "away" : "home"].saves += 1;
          return { success: true, desc: '射正被扑', followUp: 'shot_saved' };
        }

        // 进球！
        if (this.possession === "home") {
          this.score_home += 1;
        } else {
          this.score_away += 1;
        }
        return { success: true, desc: 'GOAL!', followUp: 'goal' };
      }

      case 'tackle': {
        const success = rng < result.winProb;
        this._updateStats('tackle', success);

        if (result.foulProb > 0.3 && this.rng.random() < result.foulProb) {
          this.stats[this.possession === "home" ? "home" : "away"].fouls += 1;
          return { success: false, desc: '犯规', followUp: 'foul' };
        }

        if (success) {
          // 抢断成功：防守方获得球权
          this.possession = this.possession === "home" ? "away" : "home";
          this._invalidateZones();
          this.ball_carrier = null;
          this._pickNonGkCarrier();
          return { success: true, desc: '抢断成功', followUp: null };
        } else {
          return { success: false, desc: '抢断失败', followUp: null };
        }
      }

      case 'contest': {
        const success = rng < result.winProb;

        if (success) {
          return { success: true, desc: '争顶成功', followUp: null };
        } else {
          // 争顶失败：球权转移
          this.possession = this.possession === "home" ? "away" : "home";
          this._invalidateZones();
          this.ball_carrier = null;
          return { success: false, desc: '争顶失败', followUp: null };
        }
      }

      default:
        return { success: false, desc: '未知动作', followUp: null };
    }
  }

  step() {
    if (this.is_full_time) return null;

    // 确保有持球者 — 优先选择非门将的进攻/中场球员
    if (this.ball_carrier === null) {
      this._pickNonGkCarrier();
    }
    if (this.ball_carrier === null) return null;

    let carrier = this._getCarrierPlayer();
    if (!carrier) {
      const att = this._attTeam();
      const k = Object.keys(att.players);
      if (k.length === 0) return null;
      this.ball_carrier = k[0];
      carrier = att.players[k[0]];
      if (!carrier) return null;
    }

    // 处理后续事件
    const followUp = this.last_event_follow_up;
    this.last_event_follow_up = null;

    if (followUp === "goal") {
      this._advanceTime(30, 45);
      return {
        type: "goal",
        desc: `⚽ GOAL! ${this.possession === "home" ? this.home.name : this.away.name} 进球! 比分 ${this.score_home}-${this.score_away}`,
        minute: this.minute
      };
    }

    // ── 射门后的球权转移 ──
    if (followUp === "goal_kick") {
      // 射偏 → 对方门将开门球
      this.possession = this.possession === "home" ? "away" : "home";
      this._invalidateZones();
      this.ball_carrier = this._pickGkCarrier();
      this.ball_zone = 'BOX_D_C';
      this.set_piece = 'goal_kick';
      this._advanceTime(10, 20);
      carrier = this._getCarrierPlayer();
      if (!carrier) return null;
    }
    else if (followUp === "shot_saved") {
      // 射正被扑 → 扑救成功，门将持球或角球
      this.possession = this.possession === "home" ? "away" : "home";
      this._invalidateZones();
      if (this.rng.random() < 0.7) {
        // 门将抱住球，开球
        this.ball_carrier = this._pickGkCarrier();
        this.ball_zone = 'BOX_D_C';
      } else {
        // 扑出底线 → 角球给对方
        this.possession = this.possession === "home" ? "away" : "home";
        this.ball_carrier = this._pickNonGkCarrier();
        this.ball_zone = 'BOX_A_C';
        // 标记为定位球，下次step处理为角球
        this.set_piece = 'corner';
      }
      this._advanceTime(15, 25);
      carrier = this._getCarrierPlayer();
      if (!carrier) return null;
    }
    else if (followUp === "blocked") {
      // 射门被挡 → 球权不确定，反弹到中场
      if (this.rng.random() < 0.4) {
        this.possession = this.possession === "home" ? "away" : "home";
      }
      this._invalidateZones();
      this.ball_carrier = this._pickNonGkCarrier();
      this.ball_zone = 'MID_A_C';
      this._advanceTime(5, 12);
      carrier = this._getCarrierPlayer();
      if (!carrier) return null;
    }

    // 构建比赛上下文
    const realDefDist = this._ballDefDist();
    const matchContext = {
      is_transition: this.is_transition,
      is_scramble: this.is_scramble,
      is_breaking_away: this.is_breaking_away,
      fatigue: carrier.fatigue || 0,
      setPiece: this.set_piece,
      realDefDist: realDefDist,
      realPressure: Math.max(0, Math.min(1, 1 - (realDefDist - 0.3) / 4.7)),
      match_minute: this.minute,
    };

    // 1. 情境判断（传入持球者属性，让球员自己做决策）
    const situation = determineSituation(
      this.rng, this.ball_zone, carrier.role, carrier.attrs, this.possession,
      this._defZones(), this._attTeam().tactics, this.set_piece, matchContext,
      this._defTeam().tactics
    );

    // 2. 动作选择
    const actionType = selectAction(this.rng, situation, this._attTeam().tactics, carrier.attrs);

    // 3. 获取对手和门将
    const opponent = this._getOpponentPlayer();
    const gk = this._getGkPlayer();

    // 4. 执行动作
    const result = executeAction(
      situation.type, actionType, carrier.attrs, situation.context,
      opponent ? opponent.attrs : null, gk ? gk.attrs : null
    );

    // 5. 处理结果
    const resolution = this._resolveResult(situation, actionType, result, carrier, opponent, gk);

    // 更新动作链：球/持球者/区域是否发生变化？
    // 6. 生成事件描述
    const zoneName = this.ball_zone;
    const desc = this._generateEventDescription(situation, actionType, result, carrier.role_name || '球员', zoneName);

    // 7. 同步球真实坐标
    this._syncBallCoord();

    // 8. 22人移动更新（在时间推进前，使用本次动作耗时）
    const timeCost = { pass: [8, 15], dribble: [10, 18], shoot: [5, 12], tackle: [8, 15], contest: [10, 18], save: [3, 8] };
    const [tmin, tmax] = timeCost[situation.type] || [10, 15];
    const stepDT = (tmin + tmax) / 2;  // 平均秒数
    this._stepMovementPlayers(stepDT);

    // 9. 时间推进
    this._advanceTime(tmin, tmax);

    // 10. 更新后续事件
    if (resolution.followUp) {
      this.last_event_follow_up = resolution.followUp;
    }

    // 10. 重置状态
    this.is_transition = false;
    this.is_scramble = false;
    this.set_piece = null;

    const event = {
      type: situation.type,
      subType: situation.subType,
      action: actionType,
      desc,
      success: resolution.success,
      minute: this.minute,
      team: this.possession,
      zone: this.ball_zone,
      carrier_pid: this.ball_carrier,
      carrier_side: this.possession,
      result: {
        successProb: result.successProb || result.successRate || result.winProb || result.saveProb,
        intent: result.intent || result.anticipation || null
      }
    };

    this.events.push(event);
    return event;
  }

  runMatch({ maxActions = 400, verbose = false } = {}) {
    this.initMatch();
    let n = 0;
    while (!this.is_full_time && n < maxActions) {
      const r = this.step();
      if (r && verbose && r.desc) console.log(r.desc);
      n++;
    }
    return this.matchSummary();
  }

  matchSummary() {
    const h = this.stats.home, a = this.stats.away;

    // 构建带真实坐标的位置快照
    const home_positions = this.home.getPositionSnapshot();
    const away_positions = this.away.getPositionSnapshot({ mirror: true });

    // 附加真实坐标
    for (const pos of home_positions) {
      const coord = this._playerCoords[pos.pid];
      if (coord) {
        pos.x = coord.x; pos.y = coord.y;
        pos.fatigue = coord.fatigue || 0;
        pos.distanceCovered = coord.distanceCovered || 0;
      }
    }
    for (const pos of away_positions) {
      const coord = this._playerCoords[pos.pid];
      if (coord) {
        pos.x = coord.x; pos.y = coord.y;
        pos.fatigue = coord.fatigue || 0;
        pos.distanceCovered = coord.distanceCovered || 0;
      }
    }

    // 紧凑度统计
    const homeDef = [];
    const awayDef = [];
    for (const [pid, c] of Object.entries(this._playerCoords)) {
      if (c.team === 'home') homeDef.push(c);
      else awayDef.push(c);
    }
    const homeCompact = calculateCompactness(homeDef);
    const awayCompact = calculateCompactness(awayDef);

    return {
      score: `${this.score_home}-${this.score_away}`,
      home: this.home.name,
      away: this.away.name,
      shots: `${h.shots}-${a.shots}`,
      shots_on_target: `${h.shots_on_target}-${a.shots_on_target}`,
      possession_home_pct: 100 * this.possession_home / Math.max(1, this.possession_counter),
      passes: `${h.passes}-${a.passes}`,
      tackles: `${h.tackles}-${a.tackles}`,
      fouls: `${h.fouls}-${a.fouls}`,
      corners: `${h.corners}-${a.corners}`,
      saves: `${h.saves}-${a.saves}`,
      events: this.events,
      minute: this.minute,
      home_positions,
      away_positions,
      // 移动系统数据
      movement: {
        home_compactness: homeCompact,
        away_compactness: awayCompact,
        snapshots: this._movementHistory,
        tick_count: this._tickCount,
        ball_zone: this.ball_zone,
        ball_coord: this._ballCoord
      }
    };
  }
}

module.exports = { MatchEngine };
