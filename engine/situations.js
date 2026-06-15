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
    angle: ballZone[1] * 18,
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
// 每种行动的效用由物理条件决定，球员属性不影响决策（只影响执行质量）

// ── 射门效用 = f(xG) ──
// xG 编码了距离+角度+压力 → 机会越好，射门效用越高
function shootUtility(xgValue) {
  return xgValue;
}

// ── 传球效用 = f(zone, pressure) ──
function passUtility(v, pressure) {
  if (v === 'BOX_A')      return 0.18;
  if (v === 'DEEP_A')     return 0.20 + pressure * 0.05;
  if (v === 'MID_A')      return 0.25 + pressure * 0.05;
  if (v === 'MID_D')      return 0.25;
  if (v === 'DEEP_D')     return 0.20;
  if (v === 'BOX_D')      return 0.18;
  return 0.20;
}

// ── 盘带效用 = f(zone, pressure, xg) ──
function dribbleUtility(v, pressure, xgValue) {
  if (v === 'BOX_D' || v === 'DEEP_D') return 0.01;
  const xgBlock = Math.max(0, 1 - xgValue / 0.20);
  const pressBlock = 1 - pressure;
  const zoneBase = (v === 'MID_D') ? 0.06 : (v === 'MID_A') ? 0.05 : (v === 'DEEP_A') ? 0.04 : 0.03;
  return zoneBase * xgBlock * pressBlock;
}

// ── xG 快速估算 ──
// logistic 模型, 校准到英超 xG 分布
// d=6m→0.32, d=11m→0.17, d=16m→0.09, d=22m→0.03
function estimateXG(v, ctx) {
  if (v === 'BOX_D' || v === 'DEEP_D') return 0;
  const d = ctx.distance || 25;
  const angle = ctx.angle || 45;
  const pressure = ctx.pressure || 0;
  const aRad = angle * Math.PI / 180;
  const z = 0.2 - d * 0.16 + aRad * 0.7 - pressure * 1.0;
  return 1 / (1 + Math.exp(-z));
}

// ── 综合决策 ──
function decisionProbs(ballZone, role, attrs, pressure, tacticPos, xgValue) {
  const v = getZoneV(ballZone);
  const xg = xgValue !== undefined ? xgValue : 0.1;
  const shootU  = shootUtility(xg);
  const passU   = passUtility(v, pressure);
  const dribbleU = dribbleUtility(v, pressure, xg);

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
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg);
      const r = rng.random();
      if (r < pShoot) return { type: 'shoot', subType: 'boxShot', context: ctx };
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
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg);
      const r = rng.random();
      if (r < pShoot) return { type: 'shoot', subType: 'attackShot', context: ctx };
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
      const { pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg);
      if (rng.random() < pDribble / (pDribble + pPass)) {
        return { type: 'dribble', subType: 'counter', context: ctx };
      }
      return { type: 'pass', subType: 'transitionPass', context: ctx };
    }

    // 进攻球员在中场前区：决策
    if (/^(ST_|W_|IF_|AM_)/.test(carrierRole)) {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg);
      const r = rng.random();
      if (r < pShoot) return { type: 'shoot', subType: 'longShot', context: ctx };
      if (r < pShoot + pPass) return { type: 'pass', subType: 'attackPass', context: ctx };
      return { type: 'dribble', subType: 'attackDribble', context: ctx };
    }

    // 中场控制：决策 + 争顶
    {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg);
      if (contestCheck()) {
        return { type: 'contest', subType: 'midfieldContest', context: { ...ctx, intent: 'possession' } };
      }
      const r = rng.random();
      if (r < pShoot) return { type: 'shoot', subType: 'longShot', context: ctx };
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
      const burst  = playerAttrs['爆发'] || 10;
      const speed  = playerAttrs['速度'] || 10;
      const control = playerAttrs['控制技巧'] || 10;
      const conf   = playerAttrs['自信'] || 10;
      const space  = context.space || 10;
      const pressure = context.pressure || 0;

      // burst: 爆发性冲刺
      let burstWeight = 8 + (burst - 10) * 1.5;
      if (space > 15) burstWeight += 12;
      if (speed > 14) burstWeight += 5;

      // control: 控球推进
      let controlWeight = 10 + (control - 10) * 1.5;
      if (pressure < 0.4) controlWeight += 5;

      // force: 强行突破
      let forceWeight = 5 + (conf - 10) * 1.0 + (speed - 10) * 0.8;
      if (pressure > 0.5) forceWeight += 3;

      // shield: 护球
      let shieldWeight = 8;
      if (pressure > 0.6) shieldWeight += 10;
      if (burst < 12) shieldWeight += 3;

      // feint: 假动作
      let feintWeight = 5 + (control - 10) * 1.2 + (conf - 10) * 0.6;
      if (pressure > 0.5 && space < 10) feintWeight += 5;

      burstWeight = Math.max(1, burstWeight);
      controlWeight = Math.max(1, controlWeight);
      forceWeight = Math.max(1, forceWeight);
      shieldWeight = Math.max(1, shieldWeight);
      feintWeight = Math.max(1, feintWeight);

      const options = ['burst', 'control', 'force', 'shield', 'feint'];
      const weights = [burstWeight, controlWeight, forceWeight, shieldWeight, feintWeight];

      return weightedRandom(rng, options, weights);
    }

    case 'shoot': {
      const power   = playerAttrs['力量输出'] || 10;
      const touch   = playerAttrs['触球精度'] || 10;
      const aerial  = playerAttrs['空中能力'] || 10;
      const conf    = playerAttrs['自信'] || 10;
      const calm    = playerAttrs['情绪稳定性'] || 10;
      const ballH   = context.ballHeight || 0.3;
      const dist    = context.distance || 12;
      const pressure = context.pressure || 0;

      // power: 发力抽射 — 力量+自信
      let powerWeight = 8 + (power - 10) * 1.5 + (conf - 10) * 0.8;
      if (dist > 18) powerWeight += 8;
      if (dist < 8 && pressure < 0.5) powerWeight += 3;

      // placed: 推射/兜射 — 触球精度+冷静
      let placedWeight = 8 + (touch - 10) * 1.5 + (calm - 10) * 0.8;
      if (pressure > 0.5) placedWeight += 4;
      if (dist < 12) placedWeight += 3;

      // volley: 凌空 — 触球精度+力量，高空球
      let volleyWeight = 4 + (touch - 10) * 0.8 + (power - 10) * 0.6;
      if (ballH > 0.5) volleyWeight += 12;
      if (ballH > 0.7) volleyWeight += 8;

      // header: 头球 — 空中能力
      let headerWeight = 3 + (aerial - 10) * 2.0;
      if (ballH > 0.6) headerWeight += 10;

      powerWeight = Math.max(1, powerWeight);
      placedWeight = Math.max(1, placedWeight);
      volleyWeight = Math.max(1, volleyWeight);
      headerWeight = Math.max(1, headerWeight);

      const options = ['power', 'placed', 'volley', 'header'];
      const weights = [powerWeight, placedWeight, volleyWeight, headerWeight];

      return weightedRandom(rng, options, weights);
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

// ── 加权随机选择 ──
function weightedRandom(rng, options, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
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
