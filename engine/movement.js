/**
 * 22人移动模块 v3 — 基于角色+结构动态推导，无阵型预设
 *
 * 核心设计:
 *  - 不预设"4-4-2"或"4-3-3"等阵型名
 *  - 跑动行为从球员的实际角色和团队结构中推导
 *  - 任何阵型（哪怕11个GK）都能跑出合理行为
 *
 * 研究来源:
 *  - 《The Mixer》by Michael Cox
 *    Ch10 One Up Front
 *    Ch15 The Midfield Trio
 *    Ch18 Inverted Wingers
 *    Ch23 Pressing Issues
 *    Ch25 Second Balls & Back Threes
 */

const { getZoneCenter } = require("./zones");

// ============================================================
// §1 基础定义
// ============================================================

const TACTICAL_STYLES = {
  HIGH_PRESS: 'high_press',
  MEDIUM_BLOCK: 'medium_block',
  LOW_BLOCK: 'low_block',
  COUNTER_ATTACK: 'counter_attack'
};

// 角色 → 位置类型（从role缩写推导，供外部使用）
const POSITION_TYPES = {
  GK: 'GK', CB: 'CB', FB: 'FB', WB: 'WB',
  DM: 'DM', CM: 'CM', AM: 'AM', WM: 'WM', ST: 'ST'
};

// ============================================================
// §2 角色解析 — 从角色名推导位置类型和侧向
// ============================================================

const ROLE_REGISTRY = {
  GK:   { pos: 'GK', side: null },
  // 中后卫
  CB:   { pos: 'CB', side: null },  CB_L: { pos: 'CB', side: 'left' },
  CB_R: { pos: 'CB', side: 'right' }, LCB: { pos: 'CB', side: 'left' },
  RCB:  { pos: 'CB', side: 'right' },
  // 边后卫
  LB:   { pos: 'FB', side: 'left' },  RB:   { pos: 'FB', side: 'right' },
  FB_L: { pos: 'FB', side: 'left' },  FB_R: { pos: 'FB', side: 'right' },
  // 翼卫
  LWB:  { pos: 'WB', side: 'left' },  RWB:  { pos: 'WB', side: 'right' },
  WB_L: { pos: 'WB', side: 'left' },  WB_R: { pos: 'WB', side: 'right' },
  // 防守中场
  DM:   { pos: 'DM', side: null },  CDM:  { pos: 'DM', side: null },
  DM_C: { pos: 'DM', side: null },
  // 中场
  CM:   { pos: 'CM', side: null },  CM_L: { pos: 'CM', side: 'left' },
  CM_R: { pos: 'CM', side: 'right' }, CM_C: { pos: 'CM', side: null },
  LCM:  { pos: 'CM', side: 'left' }, RCM:  { pos: 'CM', side: 'right' },
  // 攻击中场
  AM:   { pos: 'AM', side: null },  CAM:  { pos: 'AM', side: null },
  AM_C: { pos: 'AM', side: null },
  // 边锋/边前卫
  LW:   { pos: 'WM', side: 'left' },  RW:   { pos: 'WM', side: 'right' },
  LM:   { pos: 'WM', side: 'left' },  RM:   { pos: 'WM', side: 'right' },
  W_L:  { pos: 'WM', side: 'left' },  W_R:  { pos: 'WM', side: 'right' },
  // 前锋
  ST:   { pos: 'ST', side: null },  CF:   { pos: 'ST', side: null },
  ST_L: { pos: 'ST', side: 'left' },  ST_R: { pos: 'ST', side: 'right' },
  ST_C: { pos: 'ST', side: null },  LF:   { pos: 'ST', side: 'left' },
  RF:   { pos: 'ST', side: 'right' }
};

function parseRole(role) {
  return ROLE_REGISTRY[role] || { pos: 'CM', side: null };
}

// ============================================================
// §3 团队结构分析 — 从11个角色推导结构特征
// ============================================================

/**
 * 分析一个团队的11个角色+位置，提取结构特征
 * 返回每个球员的行为上下文
 */
function analyzeTeamStructure(players, tacticalStyle) {
  const counts = {};     // 各位置类型数量
  const perPlayer = [];  // 每个球员的上下文

  for (const p of players) {
    const info = parseRole(p.role);
    counts[info.pos] = (counts[info.pos] || 0) + 1;
  }

  // 第二遍：为每个球员生成上下文
  // 先找出防线最靠后的球员(参考点)
  const nonGK = players.filter(p => parseRole(p.role).pos !== 'GK');
  const avgDefX = nonGK.length > 0
    ? nonGK.reduce((s, p) => s + (p.defaultX || 0), 0) / nonGK.length
    : 20;

  for (const p of players) {
    const info = parseRole(p.role);
    const pos = info.pos;
    const defaultX = p.defaultX || 0;
    const defaultY = p.defaultY || 0;

    // 结构特征
    const sameTypeCount = counts[pos] || 1;
    const hasDM = (counts.DM || 0) > 0;
    const hasAM = (counts.AM || 0) > 0;
    const hasWM = (counts.WM || 0) > 0;
    const hasFB = (counts.FB || 0) > 0;
    const isSoloST = (counts.ST || 0) === 1;
    const totalDefenders = (counts.CB || 0) + (counts.FB || 0) + (counts.WB || 0);

    // 衍生特征
    const depthRank = defaultX - avgDefX;  // 正向=靠前
    const absWidth = Math.abs(defaultY);
    const isVeryWide = absWidth > 25;      // 是否为边路球员
    const isCentral = absWidth < 10;       // 是否在中路

    // 是否有同侧边路球员
    const hasWM_SameSide = info.side && players.some(q => {
      const qi = parseRole(q.role);
      return qi.pos === 'WM' && qi.side === info.side;
    });

    // 是否有同侧边后卫
    const hasFB_SameSide = info.side && players.some(q => {
      const qi = parseRole(q.role);
      return (qi.pos === 'FB' || qi.pos === 'WB') && qi.side === info.side;
    });

    perPlayer.push({
      pos,
      side: info.side,
      defaultX,
      defaultY,
      absWidth,
      depthRank,
      isVeryWide,
      isCentral,
      // 结构计数
      sameTypeCount,
      hasDM,
      hasAM,
      isSoloST,
      totalDefenders,
      // 侧向关系
      hasWM_SameSide,
      hasFB_SameSide,
      // 战术
      tacticalStyle
    });
  }

  return perPlayer;
}

// ============================================================
// §4 意图判断 — 移动速度 / 决策质量 / 防线高度
// ============================================================

function calculateMovementSpeed(pace, stamina, fatigue = 0) {
  const baseSpeed = 5.0 + (pace - 10) * 0.6;
  const staminaFactor = 0.7 + (stamina / 20) * 0.3;
  const fatigueFactor = 1 - (fatigue * 0.3);
  return Math.max(2, baseSpeed * staminaFactor * fatigueFactor);
}

function calculateDecisionQuality(attrs) {
  const iq = attrs.足球理解 || 10;
  const ds = attrs.决断速度 || 10;
  return (iq / 20) * 0.6 + (ds / 20) * 0.4;
}

function calculateDefensiveLineHeight(tacticalStyle, footballIQ) {
  const base = {
    'high_press': 75, 'medium_block': 50,
    'low_block': 25, 'counter_attack': 30
  }[tacticalStyle] || 50;
  return Math.max(10, Math.min(90, base + (footballIQ - 10) * 1.5));
}

// ============================================================
// §5 决策层 — 基于角色+结构，动态推导目标位置
// ============================================================

function calculateTargetPosition(player, context) {
  const {
    pos, side, defaultX, defaultY, absWidth, depthRank,
    isVeryWide, isCentral,
    sameTypeCount, hasDM, hasAM, isSoloST, totalDefenders,
    hasWM_SameSide, hasFB_SameSide, tacticalStyle
  } = player.structure || analyzeTeamStructure(context.allPlayers || [], context.tacticalStyle || 'medium_block')[player.idx || 0];

  const {
    pitchWidth = 68, pitchLength = 105,
    ballPosition = { x: 0, y: 0 }
  } = context;

  const attrs = player.attrs || {};
  const teamRole = player.teamRole || 'attacking';
  const footballIQ = attrs.足球理解 || 10;
  const dq = calculateDecisionQuality(attrs);
  const halfL = pitchLength / 2;
  const halfW = pitchWidth / 2;
  const ballX = ballPosition.x;
  const ballY = ballPosition.y;

  const highPress = (tacticalStyle === 'high_press');
  const lowBlock = (tacticalStyle === 'low_block');
  const counterAtk = (tacticalStyle === 'counter_attack');
  const defLine = calculateDefensiveLineHeight(tacticalStyle, footballIQ);

  let baseX = defaultX, baseY = defaultY;
  let ox = 0, oy = 0;

  switch (pos) {

    // =========================================================
    // 门将
    // =========================================================
    case 'GK': {
      const sweepBonus = (totalDefenders === 3) ? 5 : 0;
      if (teamRole === 'defending') {
        ox = -halfL + 2;
      } else {
        ox = -halfL + (defLine / 100) * 15 + sweepBonus;
      }
      oy = ballY * 0.3;
      if (lowBlock) ox = -halfL + 1;
      break;
    }

    // =========================================================
    // 中后卫
    // =========================================================
    case 'CB': {
      const isThreeCB = sameTypeCount === 3;
      const isCentralCB = isThreeCB && absWidth < 6;

      if (teamRole === 'defending') {
        baseX = (defLine / 100) * halfL * 0.85;
        ox = (ballX - baseX) * 0.2;
        oy = isThreeCB && !isCentralCB
          ? (side === 'left' ? -8 : 8)
          : (side === 'left' ? -5 : 5);
        if (lowBlock) oy *= 0.7;
      } else {
        ox = Math.min(ballX - 15, halfL * 0.5);
        if (isThreeCB && !isCentralCB)
          oy = (side === 'left' ? -6 : 6);
      }
      break;
    }

    // =========================================================
    // 边翼卫（基于结构推导，而非阵型名）
    // =========================================================
    case 'WB': {
      const sideY = side === 'left' ? -halfW * 0.9 : halfW * 0.9;
      if (teamRole === 'attacking') {
        ox = (ballX - baseX) * 0.7;
        oy = sideY - baseY;
        if (highPress) ox += 8;
      } else {
        baseX = (defLine / 100) * halfL * 0.85;
        ox = (ballX - baseX) * 0.3;
        oy = sideY - baseY;
        if (lowBlock) { baseX += 5; ox -= 3; }
      }
      break;
    }

    // =========================================================
    // 边后卫（通用4后卫体系）
    // =========================================================
    case 'FB': {
      const sideY = side === 'left' ? -halfW * 0.7 : halfW * 0.7;
      const hasWM = hasWM_SameSide;

      if (teamRole === 'attacking') {
        let af = 0.50; // 基础套边系数
        if (!hasWM) af += 0.10;  // 无同侧WM → 更积极（你是主要宽度来源）
        if (hasWM)  af -= 0.05;  // 有同侧WM → 不需要过度套边（WM已提供宽度）
        if (highPress) af += 0.05;
        if (counterAtk) af += 0.15;

        ox = (ballX - baseX) * af;
        oy = sideY - baseY;

        // 中场阻截: 内收到中场
        if (tacticalStyle === 'medium_block' && dq > 0.55)
          oy *= 0.5;
      } else {
        baseX = (defLine / 100) * halfL * 0.85;
        let rf = 0.3;
        if (lowBlock) rf = 0.5;
        if (counterAtk) rf = 0.6;
        ox = (ballX - baseX) * rf;
        oy = sideY - baseY;
        if (lowBlock) oy *= 0.8;
      }
      break;
    }

    // =========================================================
    // 防守中场
    // =========================================================
    case 'DM': {
      const isSoloDM = sameTypeCount === 1;
      if (teamRole === 'defending') {
        baseX = (defLine / 100) * halfL * 0.85 + 8;
        ox = (ballX - baseX) * 0.4;
        oy = isSoloDM ? (ballY - baseY) * 0.6 : (ballY - baseY) * 0.35;
        if (lowBlock) { baseX -= 5; ox -= 2; }
      } else {
        ox = ballX - 12;
        if (player.partnerStayed) ox += 5;
        oy = (ballY - baseY) * 0.3;
      }
      break;
    }

    // =========================================================
    // 中场 — 核心：行为由团队结构推导
    // =========================================================
    case 'CM': {
      if (teamRole === 'attacking') {
        let af = 0.50;  // 基础前插系数

        // 双中场: 一人攻一人守 ("if one went forward, the other stayed back")
        if (sameTypeCount === 2) {
          af = player.partnerPushedUp ? 0.12 : 0.50;
        }
        // 三中场: 更自由前插
        if (sameTypeCount >= 3) {
          af = isCentral ? 0.35 : 0.55;  // 中间CM前插少，外侧自由
        }
        // 有DM保护 → 更多前插自由
        if (hasDM) af += 0.05;
        // 有AM在前 → 略微减少前插（AM已经在前面了）
        if (hasAM) af -= 0.05;
        // 反击更快
        if (counterAtk) af += 0.10;

        ox = (ballX - baseX) * af + 5;
        oy = (ballY - baseY) * (isCentral ? 0.5 : 0.7);
      } else {
        baseX = (defLine / 100) * halfL * 0.85 + 12;
        ox = (ballX - baseX) * 0.35;
        oy = (ballY - baseY) * (isCentral ? 0.5 : 0.7);
        if (lowBlock) { baseX -= 5; ox -= 2; }
      }
      break;
    }

    // =========================================================
    // 攻击中场 — 在锋线身后创造机会
    // =========================================================
    case 'AM': {
      if (teamRole === 'attacking') {
        // 距离前锋的距离取决于单/双前锋
        const stDist = isSoloST ? 10 : 8;  // 单前锋时站近一些辅助
        ox = ballX + stDist;
        oy = (ballY - baseY) * 0.5;
        if (counterAtk) ox += 5;
      } else {
        if (highPress)      ox = ballX - 5;
        else if (lowBlock)  ox = ballX - 20;
        else                ox = ballX - 10;
        oy = (ballY - baseY) * 0.4;
      }
      break;
    }

    // =========================================================
    // 边锋/边前卫
    // =========================================================
    case 'WM': {
      const invertFoot = attrs.决断速度 > 14 &&
        player.preferredFoot === (side === 'left' ? 'right' : 'left');
      const hasFB_B = hasFB_SameSide;

      if (teamRole === 'attacking') {
        let af = 0.55;
        // 后方有边后卫 → 可以更靠前（有人补防）
        if (hasFB_B) af += 0.08;
        // 后方有翼卫 → 更靠前（WB会补位）
        // (WB case handled separately in getPositionType)
        if (counterAtk) af += 0.20;

        if (invertFoot && dq > 0.6) {
          // 内切边锋 (The Mixer Ch18)
          ox = ballX + 10;
          oy = (ballY - baseY) * 0.4;
        } else {
          ox = (ballX - baseX) * af;
          oy = (side === 'left' ? -halfW * 0.8 : halfW * 0.8) - baseY;
        }

        // 无FB/WB在身后 → 需要更深回收(4-4-2的WM)
        if (!hasFB_B) ox *= 0.85;

      } else {
        let rf;
        if (highPress)     rf = 0.15;
        else if (lowBlock) rf = 0.55;
        else               rf = 0.30;

        ox = (ballX - baseX) * rf;
        oy = (side === 'left' ? -halfW * 0.6 : halfW * 0.6) - baseY;
        if (lowBlock) oy *= 0.7;
      }
      break;
    }

    // =========================================================
    // 前锋 — 单/双差异
    // =========================================================
    case 'ST': {
      if (teamRole === 'attacking') {
        if (counterAtk) {
          ox = Math.min(ballX + 20, halfL - 2);
          oy = (ballY - baseY) * 0.7;
        } else if (highPress && dq > 0.65) {
          ox = ballX;  // False 9 回撤
          oy = (ballY - baseY) * 0.5;
        } else if (isSoloST) {
          // 单前锋：孤立，需要回撤和拉边
          ox = Math.min(ballX + 12, halfL - 3);
          oy = (ballY - baseY) * 0.6;
          if (dq > 0.55) ox -= 5;  // 高智商会回撤
        } else {
          // 双前锋：联动
          ox = Math.min(ballX + 15, halfL - 2);
          oy = (ballY - baseY) * 0.5;
          if (player.partnerDropped) ox += 8;
        }
      } else {
        if (highPress) {
          ox = ballX + 5;
          oy = ballY * 0.5;
        } else if (lowBlock || counterAtk) {
          ox = Math.max(ballX - 5, halfL * 0.3);
          oy = (ballY - baseY) * 0.3;
        } else {
          ox = ballX - 8;
          oy = (ballY - baseY) * 0.5;
        }
      }
      break;
    }
  }

  const fx = baseX + ox * dq;
  const fy = baseY + oy * dq;
  return {
    x: Math.max(-halfL + 1, Math.min(halfL - 1, fx)),
    y: Math.max(-halfW + 1, Math.min(halfW - 1, fy))
  };
}

// ============================================================
// §6 外部入口
// ============================================================

/**
 * 获取球员的位置类型（公用的解析函数）
 */
function getPositionType(role) {
  const info = parseRole(role);
  return info.pos;
}

/**
 * 计算单个球员目标位置（外部调用入口）
 * player需包含: role, attrs, defaultX, defaultY, teamRole
 * context需包含: pitchWidth, pitchLength, ballPosition, tacticalStyle, allPlayers
 */
function calculateTargetPositionEx(player, context) {
  // 自动分析团队结构（缓存到context以避免重复）
  if (!context._structure && context.allPlayers) {
    context._structure = analyzeTeamStructure(
      context.allPlayers,
      context.tacticalStyle || 'medium_block'
    );
  }

  // 确定此球员在结构分析中的索引
  let struct = null;
  if (context._structure) {
    const idx = context.allPlayers
      ? context.allPlayers.findIndex(p => p === player || p.id === player.id)
      : -1;
    struct = (idx >= 0) ? context._structure[idx] : null;
  }

  // 如果没有结构分析，进行内联分析
  if (!struct && player.role) {
    const info = parseRole(player.role);
    struct = {
      pos: info.pos,
      side: info.side,
      defaultX: player.defaultX || 0,
      defaultY: player.defaultY || 0,
      absWidth: Math.abs(player.defaultY || 0),
      depthRank: (player.defaultX || 0) - 20,
      isVeryWide: Math.abs(player.defaultY || 0) > 25,
      isCentral: Math.abs(player.defaultY || 0) < 10,
      sameTypeCount: 1,
      hasDM: false, hasAM: false, isSoloST: true,
      totalDefenders: 4,
      hasWM_SameSide: false,
      hasFB_SameSide: false,
      tacticalStyle: context.tacticalStyle || 'medium_block'
    };
  }

  return calculateTargetPosition(
    { ...player, structure: struct },
    context
  );
}

// ============================================================
// §7 物理执行层
// ============================================================

function updatePlayerPositions(players, context, deltaTime = 1) {
  const updated = [];

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const target = calculateTargetPositionEx(
      { ...p, idx: i, structure: null },
      { ...context, allPlayers: players }
    );

    const dx = target.x - (p.x || p.defaultX || 0);
    const dy = target.y - (p.y || p.defaultY || 0);
    const dist = Math.sqrt(dx * dx + dy * dy);

    const speed = calculateMovementSpeed(
      p.attrs.速度 || 10, p.attrs.耐力 || 10, p.fatigue || 0
    );
    const maxMove = speed * deltaTime;
    const move = Math.min(dist, maxMove);

    let nx = p.x || p.defaultX || 0;
    let ny = p.y || p.defaultY || 0;
    if (dist > 0.1) { nx += (dx / dist) * move; ny += (dy / dist) * move; }

    const newFatigue = Math.min(1, (p.fatigue || 0) +
      (move / 15000) * (1 - (p.attrs.耐力 || 10) / 20));

    updated.push({
      ...p,
      x: nx, y: ny,
      targetX: target.x, targetY: target.y,
      fatigue: newFatigue,
      distanceCovered: (p.distanceCovered || 0) + move
    });
  }

  return updated;
}

// ============================================================
// §8 团队工具
// ============================================================

function calculateCompactness(players) {
  if (players.length === 0) return 0;
  let ax = 0, ay = 0;
  for (const p of players) { ax += p.x || 0; ay += p.y || 0; }
  ax /= players.length; ay /= players.length;
  let td = 0;
  for (const p of players) {
    const dx = (p.x || 0) - ax, dy = (p.y || 0) - ay;
    td += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.max(0, 1 - (td / players.length) / 30);
}

function calculateOffsideLine(defenders) {
  if (defenders.length === 0) return 0;
  let ld = defenders[0].x || 0;
  for (const d of defenders) {
    if (parseRole(d.role).pos !== 'GK' && (d.x || 0) < ld)
      ld = d.x || 0;
  }
  return ld;
}

module.exports = {
  TACTICAL_STYLES, POSITION_TYPES,
  parseRole, analyzeTeamStructure,
  calculateMovementSpeed, calculateDecisionQuality,
  calculateDefensiveLineHeight,
  calculateTargetPosition: calculateTargetPositionEx,
  updatePlayerPositions,
  calculateCompactness, calculateOffsideLine,
  getPositionType
};
