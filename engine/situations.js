// ============================================================
// 情境判断模块 — 新6核心系统（2026年6月重构）
// ============================================================
// 完全使用新的6个核心模块：
//   pass, dribble, shoot, tackle, contest, save
//
// 每个情境返回：
//   { type: 'pass'|'dribble'|'shoot'|'tackle'|'contest'|'save',
//     context: { ...物理和意图上下文 }
//   }
// ============================================================

const { getZoneV, getZoneH } = require("./zones");
const { findNearestOpponent } = require("./teams");

// 引入6个核心模块
const pass = require("./pass");
const dribble = require("./dribble");
const shoot = require("./shoot");
const tackle = require("./tackle");
const contest = require("./contest");
const save = require("./save");

// ── 构建物理上下文 ──
function buildContext(ballZone, opponentZones, matchContext = {}) {
  const pressure = matchContext.realPressure !== undefined ? matchContext.realPressure : 0;
  const minDist = matchContext.realDefDist || 25;
  const v = getZoneV(ballZone);
  const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };
  const distance = distMap[v] || 25;
  const defInLane = Object.values(opponentZones).filter(([z]) =>
    Math.abs(z[0] - ballZone[0]) <= 1 && Math.abs(z[1] - ballZone[1]) <= 1
  ).length;

  return {
    distance,
    pressure,
    defDist: minDist,
    defInLane,
    fatigue: matchContext.fatigue || 0,
    speedDiff: matchContext.speedDiff || 0,
    // zone格式: "V_BAND_LANE", 如 "MID_D_L", "BOX_A_CR"
    // 从zone string提取lane: L=0, CL=1, C=2, CR=3, R=4 → 乘以18得角度
    angle: (() => {
      const parts = String(ballZone).split('_');
      const laneCode = parts[2] || 'C';
      const laneIdx = { L: 0, CL: 1, C: 2, CR: 3, R: 4 }[laneCode];
      return (laneIdx != null ? laneIdx : 2) * 18;
    })(),
    setPiece: matchContext.setPiece || 'none',
    ballHeight: Math.random() * 0.7 + 0.15,
    isFromClose: v === 'BOX_D' || v === 'BOX_A',
    space: matchContext.space || 10,
    chemistry: matchContext.chemistry || 0.5,
    gkPosition: matchContext.gkPosition || 'center',
    shotDistance: matchContext.shotDistance || 12,
    shotPower: matchContext.shotPower || 0.5,
    shotHeight: matchContext.shotHeight || 0.5,
    shotDirection: matchContext.shotDirection || 'center',
    isPenalty: matchContext.isPenalty || false,
    carrierAction: matchContext.carrierAction || 'dribbleForward',
  };
}

// ── 决策模型：物理条件决定机会，战术位置做微调，属性决定执行 ──
// 基于xT/VAEP等足球分析研究：
//   主导因子：距离球门 > 防守压力 > 射门角度
//   球员属性和角色不在机会评估中出现（xG模型也不包含）
// "角色"不是固定标签——同一球员可踢边锋/翼卫/边前卫，取决于战术部署
// 战术位置（formation中的部署位置，如LR/AM/FC等）提供微量偏好
// 预留"套路"层——未来可让战术模式override正常决策

// ── 决策模型 ──
// 射门/传球/盘带各自独立计算效用值，不互加减，用 softmax 比较
// 物理条件决定机会基线，球员属性 + 战术做个人化加权

// ── 射门效用 = f(xG, personalModifier) ──
// xG 编码了距离+角度+压力 → 机会越好，射门效用越高
// personalModifier 综合以下因素：
//   + shootWillingness   (战术预留，默认0，将来可正可负)
//   + timePressureBonus  (比赛最后10分钟，0 → 0.3)
//   + (自信-10)*0.02     (自信高 → 更敢射)
//   + (10-团队)*0.02     (团队低 → 更爱单干)
function shootUtility(xgValue, personalModifier = 0) {
  return xgValue * Math.exp(personalModifier);
}

// ── 传球效用 = f(zone, pressure, passTendency) ──
// passTendency: 战术预留（默认0，将来可正可负。正=更倾向传球，负=更倾向不传）
function passUtility(v, pressure, passTendency = 0) {
  const tacticalMod = Math.exp(passTendency);
  if (v === 'BOX_A')      return 0.18 * tacticalMod;
  if (v === 'DEEP_A')     return (0.20 + pressure * 0.05) * tacticalMod;
  if (v === 'MID_A')      return (0.25 + pressure * 0.05) * tacticalMod;
  if (v === 'MID_D')      return 0.25 * tacticalMod;
  if (v === 'DEEP_D')     return 0.20 * tacticalMod;
  if (v === 'BOX_D')      return 0.18 * tacticalMod;
  return 0.20 * tacticalMod;
}

// ── 盘带效用 = f(distance→risk, pressure, xg, dribbleTendency) ──
// 不是按zone分档，而是用离球门距离驱动的连续丢球风险模型：
//   越靠近对方球门(d小) → 丢球后果轻 → 敢带
//   越靠近本方球门(d大) → 丢球后果重 → 不敢带
// dribbleTendency: 战术预留（默认0，将来可正可负）
function dribbleUtility(v, pressure, xgValue, dribbleTendency = 0) {
  const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };
  const d = distMap[v] || 25;

  // riskFactor: 连续物理量 — 离球门越远，丢球风险成本越高
  // d=8m(BOX_A)→0.85, d=35m(MID_D)→0.36, d=55m(BOX_D)→0.00(自然归零)
  const riskFactor = Math.max(0, 1 - d / 55);

  const xgBlock = Math.max(0, 1 - xgValue / 0.20);
  const pressBlock = 1 - pressure;

  // baseWillingness: 行为校准常数（单一标量，非zone分档魔数）
  const baseWillingness = 0.12;

  return baseWillingness * riskFactor * xgBlock * pressBlock * Math.exp(dribbleTendency);
}

// ── xG 快速估算 ──
// logistic 模型, 校准到英超 xG 分布
// d=6m→0.32, d=11m→0.17, d=16m→0.09, d=22m→0.03
function estimateXG(v, ctx) {
  if (v === 'BOX_D' || v === 'DEEP_D') return 0;
  const d = ctx.distance || 25;
  // 注意：angle=0 是合法值（边线窄角度），不能用 || 短路
  const angle = (ctx.angle != null) ? ctx.angle : 45;
  const pressure = ctx.pressure || 0;
  const aRad = angle * Math.PI / 180;
  const z = 0.2 - d * 0.16 + aRad * 0.7 - pressure * 1.0;
  return 1 / (1 + Math.exp(-z));
}

// ── 综合决策 ──
// shootWillingness: 战术预留（默认0，将来可正可负）
// passTendency:      战术预留（默认0，将来可正可负）
// dribbleTendency:   战术预留（默认0，将来可正可负）
// matchMinute: 比赛分钟数（用于时间压力计算）
// attrs: 球员属性 { 自信, 团队, ... }
function decisionProbs(ballZone, role, attrs, pressure, tacticPos, xgValue, shootWillingness = 0, matchMinute = 0, passTendency = 0, dribbleTendency = 0) {
  const v = getZoneV(ballZone);
  const xg = xgValue !== undefined ? xgValue : 0.1;

  // ── 个人因素加权 ──
  // shootWillingness: 战术预留（将来由战术系统/个性系统填入）
  // timePressure: 最后10分钟+ 迫近射门倾向
  const timePressureBonus = (matchMinute >= 80) ? Math.min(0.3, (matchMinute - 80) / 10 * 0.3) : 0;
  // 球员个性：自信↑ → 更敢射；团队↓ → 更爱单干
  const confidence = (attrs['自信'] != null) ? attrs['自信'] : 10;
  const teamwork = (attrs['团队'] != null) ? attrs['团队'] : 10;
  const personalityBonus = (confidence - 10) * 0.02 + (10 - teamwork) * 0.02;

  const personalModifier = shootWillingness + timePressureBonus + personalityBonus;

  const shootU  = shootUtility(xg, personalModifier);
  const passU   = passUtility(v, pressure, passTendency);
  const dribbleU = dribbleUtility(v, pressure, xg, dribbleTendency);

  const total = shootU + passU + dribbleU;
  return {
    pShoot: shootU / total,
    pPass: passU / total,
    pDribble: dribbleU / total,
    _shoot: shootU, _pass: passU, _dribble: dribbleU,
  };
}

// ── 情境判断主函数 ──
function determineSituation(rng, ballZone, carrierRole, carrierAttrs, possessionTeam,
                            opponentZones, tactics, setPiece, matchContext, defenderTactics) {
  // 定位球处理
  if (setPiece === "penalty") {
    return {
      type: 'shoot',
      subType: 'penalty',
      context: { ...buildContext(ballZone, opponentZones, matchContext), isPenalty: true, setPiece: 'penalty' }
    };
  }
  if (setPiece === "corner") {
    return {
      type: 'contest',
      subType: 'aerialContest',
      context: { ...buildContext(ballZone, opponentZones, matchContext), ballHeight: 0.8 }
    };
  }
  if (setPiece === "throw_in") {
    return {
      type: 'pass',
      subType: 'throwIn',
      context: buildContext(ballZone, opponentZones, matchContext)
    };
  }
  if (setPiece === "goal_kick") {
    return {
      type: 'pass',
      subType: 'gkDistribution',
      context: buildContext(ballZone, opponentZones, matchContext)
    };
  }
  if (setPiece === "free_kick") {
    const v = getZoneV(ballZone);
    if (v === 'BOX_A' || v === 'DEEP_A') {
      return {
        type: 'shoot',
        subType: 'freeKick',
        context: { ...buildContext(ballZone, opponentZones, matchContext), setPiece: 'freeKick' }
      };
    }
    return {
      type: 'pass',
      subType: 'freeKickPass',
      context: buildContext(ballZone, opponentZones, matchContext)
    };
  }

  // 门将持球
  if (carrierRole === "GK") {
    return {
      type: 'pass',
      subType: 'gkDistribution',
      context: buildContext(ballZone, opponentZones, matchContext)
    };
  }

  const ctx = buildContext(ballZone, opponentZones, matchContext);
  const v = getZoneV(ballZone);

  // ── 抢断判断 ──
  // 抢断是防守方决策：最近防守者越近 + 防守能力越强 → 抢断概率越高
  // TODO: 将来由防守球员的角色/职能 + 战术指令（压迫强度）驱动
  const tackleCheck = () => {
    const defDist = ctx.defDist;
    if (defDist > 6) return false;
    const chance = defDist < 1.5 ? 0.30 : defDist < 3 ? 0.15 : defDist < 6 ? 0.08 : 0;
    return rng.random() < chance;
  };

  // ── 争顶判断 ──
  // TODO: 将来用22人真实坐标，球附近≥2人在0.5-1m内自动触发
  const contestCheck = () => {
    return rng.random() < 0.03; // 临时保底3%
  };

  // ── 禁区防守 ──
  if (v === "BOX_D") {
    if (/^(CB_|FB_|WB_|DM_)/.test(carrierRole)) {
      if (ctx.pressure > 0.6) {
        return { type: 'contest', subType: 'boxClearance', context: { ...ctx, intent: 'clearance' } };
      }
      return { type: 'pass', subType: 'buildUp', context: ctx };
    }
    // 进攻球员在禁区也有被抢断的可能
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'boxPress', context: ctx };
    }
    // 禁区持球：决策
    if (/^(ST_|W_|IF_|AM_)/.test(carrierRole)) {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      const r = rng.random();
      if (r < pShoot) {
        return { type: 'shoot', subType: 'boxShot', context: ctx };
      }
      if (r < pShoot + pPass) return { type: 'pass', subType: 'boxPass', context: ctx };
      return { type: 'dribble', subType: 'boxDribble', context: ctx };
    }
    return ctx.pressure > 0.5
      ? { type: 'contest', subType: 'defClearance', context: { ...ctx, intent: 'clearance' } }
      : { type: 'pass', subType: 'defPass', context: ctx };
  }

  // ── 后场 ──
  if (v === "DEEP_D") {
    if (/^(CB_|FB_|WB_|DM_)/.test(carrierRole)) {
      if (tackleCheck()) {
        return { type: 'tackle', subType: 'deepPress', context: ctx };
      }
      return ctx.pressure > 0.6
        ? { type: 'contest', subType: 'deepClearance', context: { ...ctx, intent: 'clearance' } }
        : { type: 'pass', subType: 'buildUp', context: ctx };
    }
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'deepPress', context: ctx };
    }
  }

  // ── 前场 ──
  if (v === "BOX_A" || v === "DEEP_A") {
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'defPress', context: ctx };
    }
    if (/^(ST_|W_|IF_|AM_)/.test(carrierRole)) {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      const r = rng.random();
      if (r < pShoot) {
        return { type: 'shoot', subType: 'attackShot', context: ctx };
      }
      if (r < pShoot + pPass) return { type: 'pass', subType: 'finalThirdPass', context: ctx };
      return { type: 'dribble', subType: 'finalThirdDribble', context: ctx };
    }
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'defPress', context: ctx };
    }
    return { type: 'pass', subType: 'finalThirdPass', context: ctx };
  }

  // ── 中场 ──
  if (v === "MID_D" || v === "MID_A") {
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'midfieldTackle', context: ctx };
    }

    // 反击场景
    if (matchContext.is_transition) {
      if (tackleCheck()) {
        return { type: 'tackle', subType: 'counterPress', context: ctx };
      }
      const xg = estimateXG(v, ctx);
      const { pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      if (rng.random() < pDribble / (pDribble + pPass)) {
        return { type: 'dribble', subType: 'counter', context: ctx };
      }
      return { type: 'pass', subType: 'transitionPass', context: ctx };
    }

    // 进攻球员在中场前区：决策
    if (/^(ST_|W_|IF_|AM_)/.test(carrierRole)) {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      const r = rng.random();
      if (r < pShoot) {
        return { type: 'shoot', subType: 'longShot', context: ctx };
      }
      if (r < pShoot + pPass) return { type: 'pass', subType: 'attackPass', context: ctx };
      return { type: 'dribble', subType: 'attackDribble', context: ctx };
    }

    // 中场控制：决策 + 争顶
    {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      if (contestCheck()) {
        return { type: 'contest', subType: 'midfieldContest', context: { ...ctx, intent: 'possession' } };
      }
      const r = rng.random();
      if (r < pShoot) {
        return { type: 'shoot', subType: 'longShot', context: ctx };
      }
      if (r < pShoot + pPass) return { type: 'pass', subType: 'midfieldPass', context: ctx };
      return { type: 'dribble', subType: 'midfieldCarry', context: ctx };
    }
  }

  // 默认：传球
  return { type: 'pass', subType: 'normal', context: ctx };
}

// ── 选择动作（基于球员属性+情境+战术）──
function selectAction(rng, situation, tactics, playerAttrs) {
  const { type, subType, context } = situation;

  switch (type) {
    case 'pass': {
      // 传球是连续梯度 — 球员根据自身能力和情境决定传多远、多冒险
      // riskLevel: 0=完全安全(5m) ~ 1=长传冒险(45m)
      const power      = playerAttrs['力量输出'] || 10;
      const understand = playerAttrs['足球理解'] || 10;
      const confidence = playerAttrs['自信'] || 10;
      const teammate   = playerAttrs['队友识别'] || 10;
      const tempo      = tactics.getTempoMod();
      const d = context.distance || 25;
      const p = context.pressure || 0;

      let riskLevel = 0.10 + (d - 10) * 0.006 + (understand - 10) * 0.015 + (confidence - 10) * 0.008;
      if (p > 0.5) riskLevel -= 0.08;
      if (tempo > 0.3) riskLevel += 0.06;
      if (teammate > 12) riskLevel -= 0.04;
      riskLevel = Math.max(0, Math.min(1, riskLevel));
      return riskLevel;
    }

    case 'dribble': {
      // 盘带风格是连续：0=护球 → 0.5=控球/假动作 → 1=冲刺突破
      // 物理条件+属性决定风格，不再有离散类型
      const burst  = playerAttrs['爆发'] || 10;
      const speed  = playerAttrs['速度'] || 10;
      const control = playerAttrs['控制技巧'] || 10;
      const conf   = playerAttrs['自信'] || 10;
      const space  = context.space || 10;
      const pressure = context.pressure || 0;

      // 基础倾向：爆发高→偏冲刺，控球好→偏控制，自信高→偏冒险
      let dribbleStyle = 0.4 + (burst - 10) * 0.03 + (speed - 10) * 0.02 - (control - 10) * 0.03 + (conf - 10) * 0.02;
      // 空间大→冲刺，紧逼→护球/假动作
      if (space > 20) dribbleStyle += 0.15;
      if (pressure > 0.4) dribbleStyle -= 0.10;
      dribbleStyle = Math.max(0, Math.min(1, dribbleStyle));

      // 连续值映射到物理行为
      if (dribbleStyle < 0.15) return 'shield';
      if (dribbleStyle < 0.35) return 'control';
      if (dribbleStyle < 0.55) return 'feint';
      if (dribbleStyle < 0.75) return 'force';
      return 'burst';
    }

    case 'shoot': {
      const power   = playerAttrs['力量输出'] || 10;
      const touch   = playerAttrs['触球精度'] || 10;
      const aerial  = playerAttrs['空中能力'] || 10;
      const conf    = playerAttrs['自信'] || 10;
      const ballH   = context.ballHeight || 0.3;

      // 物理强制：高空球→凌空或头球
      if (ballH > 0.6) return (aerial > touch) ? 'header' : 'volley';
      if (ballH > 0.4 && rng.random() < 0.3) return (aerial > touch) ? 'header' : 'volley';

      // 地面球：力量型 vs 技术型，连续谱
      // 0=完全推射(placed) → 1=完全抽射(power)
      let shootStyle = 0.4 + (power - 10) * 0.03 - (touch - 10) * 0.03 + (conf - 10) * 0.02;
      shootStyle = Math.max(0, Math.min(1, shootStyle));
      return shootStyle < 0.5 ? 'placed' : 'power';
    }

    case 'tackle':
      return 'tackle'; // 抢断方式由模块内部决定

    case 'contest': {
      if (context.ballHeight > 0.5) return 'aerial';
      return 'shoulder';
    }

    case 'save':
      return 'save';

    default:
      return 'normal';
  }
}

// ── 执行动作（调用新模块）──
function executeAction(type, actionType, playerAttrs, context, opponentAttrs, gkAttrs) {
  switch (type) {
    case 'pass':
      // actionType 现在是连续的 riskLevel (0-1)
      return pass.pass(playerAttrs, typeof actionType === 'number' ? actionType : 0.4, context, opponentAttrs);

    case 'dribble':
      return dribble.dribble(playerAttrs, actionType, context, opponentAttrs);

    case 'shoot':
      return shoot.shoot(playerAttrs, actionType, context, gkAttrs, opponentAttrs);

    case 'tackle':
      return tackle.tackle(playerAttrs, opponentAttrs, context);

    case 'contest':
      const contestType = actionType || 'aerial';
      return contest.contest(contestType, playerAttrs, opponentAttrs, context);

    case 'save':
      return save.save(playerAttrs, context);

    default:
      return { successProb: 0.5 };
  }
}

module.exports = {
  determineSituation,
  selectAction,
  executeAction,
  buildContext,
  // 决策函数导出（用于诊断）
  decisionProbs,
  estimateXG,
  // 导出6个模块供外部使用
  modules: { pass, dribble, shoot, tackle, contest, save }
};
