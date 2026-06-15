// ============================================================
// 射门模块 S03 — 物理逻辑推导 + 意图预判（第二轮修改）
// ============================================================
// 现实依据：
//   - 射门者识别门将站位漏洞（对手识别研究）
//   - 射门角度选择（近角/远角/挑射）
//   - 与门将形成博弈（射门方向 vs 门将预判）
//   - 专家门将67%看非踢球腿（射门者有迹可循）
//
// 核心结构：
//   1. 意图判断层：阅读门将站位 → 选择射门角度 → 博弈
//   2. 决策层：选择射门方式和时机
//   3. 物理执行层：射正率 × 封堵率 × 进球率
//
// 使用的属性（组合方式）：
//   - 对手识别：阅读门将站位、重心偏向
//   - 足球理解：选择最佳射门角度
//   - 决断速度：射门时机的果断性
//   - 触球精度：射门技术执行
//   - 力量输出：射门力量
//   - 空中能力：头球射门
//   - 冷静导向：压力下完成质量
//   - 自信：敢于尝试难度射门
// ============================================================

const SHOT_TYPES = {
  power: {
    name: "发力抽射",
    attrs: { 力量输出: 0.5, 触球精度: 0.3, 决断速度: 0.2 },
    distRef: 7, distDecay: 10,
    angleSens: 0.008,
    finishFactor: 0.55,
  },
  placed: {
    name: "推射/兜射",
    attrs: { 触球精度: 0.5, 冷静导向: 0.3, 足球理解: 0.2 },
    distRef: 7, distDecay: 6,
    angleSens: 0.005,
    finishFactor: 0.30,
  },
  volley: {
    name: "凌空抽射",
    attrs: { 触球精度: 0.5, 力量输出: 0.3, 冷静导向: 0.2 },
    distRef: 5, distDecay: 5,
    angleSens: 0.015,
    finishFactor: 0.75,
  },
  header: {
    name: "头球",
    attrs: { 空中能力: 0.7, 对抗: 0.3 },
    distRef: 4, distDecay: 4,
    angleSens: 0.012,
    finishFactor: 0.50,
  },
};

// 射门方向
const SHOT_DIRECTIONS = {
  nearPost: '近角',
  farPost: '远角',
  center: '中路',
  chip: '挑射',
};

// ── 意图判断层：阅读门将站位 ──
// 现实：观察门将站位、重心、哪边更空
function readKeeperPosition(shooterAttrs, context) {
  const opponentRecognition = shooterAttrs.对手识别 || shooterAttrs.opponentRecognition || 10;
  const footballUnderstanding = shooterAttrs.足球理解 || shooterAttrs.footballUnderstanding || 10;
  
  // 门将站位读取（基于对手识别）
  // 能看出门将偏哪边
  const keeperStanceRead = opponentRecognition / 20;  // 0.5 - 1.0
  
  // 漏洞识别（基于足球理解）
  // 知道门将站位的弱侧在哪
  const weakSideRecognition = 0.4 + (footballUnderstanding / 20) * 0.5;  // 0.4 - 0.9
  
  // 综合站位阅读质量
  const readQuality = keeperStanceRead * 0.5 + weakSideRecognition * 0.5;
  
  return {
    keeperStanceRead,
    weakSideRecognition,
    readQuality  // 0.45 - 0.95
  };
}

// ── 意图判断层：选择射门角度 ──
// 现实：近角/远角/中路/挑射的决策
function chooseShotDirection(shooterAttrs, context, keeperRead) {
  const footballUnderstanding = shooterAttrs.足球理解 || shooterAttrs.footballUnderstanding || 10;
  const confidence = shooterAttrs.自信 || shooterAttrs.confidence || 10;
  
  // 角度选择质量（基于足球理解+阅读门将）
  const directionQuality = keeperRead.readQuality * 0.7 + (footballUnderstanding / 20) * 0.3;
  
  // 门将偏近角 → 选远角；门将偏远角 → 选近角
  // 简化：门将站位靠近角侧时，射远角的概率更高
  const gkPosition = context.gkPosition || 'center';  // nearPost / center / farPost
  
  let preferredDirection;
  if (gkPosition === 'nearPost') preferredDirection = 'farPost';
  else if (gkPosition === 'farPost') preferredDirection = 'nearPost';
  else preferredDirection = confidence > 14 ? 'farPost' : 'nearPost';
  
  // 角度优势（选对了方向 vs 选错了方向）
  const correctChoice = gkPosition !== 'center' && gkPosition !== preferredDirection;
  const directionAdvantage = correctChoice ? 1.3 : 1.0;  // 选对方向有30%优势
  
  return {
    preferredDirection,
    directionQuality,
    directionAdvantage,
    correctChoice
  };
}

// ── 博弈：射门者意图 vs 门将预判 ──
// 射门者的角度选择被门将预判的程度
function shotMindGame(shooterAttrs, context, keeperRead, direction) {
  const footballUnderstanding = shooterAttrs.足球理解 || shooterAttrs.footballUnderstanding || 10;
  const confidence = shooterAttrs.自信 || shooterAttrs.confidence || 10;
  
  // 博弈意识（基于足球理解）
  // 射门者是否能想到"门将可能在猜我"
  const mindGameAwareness = footballUnderstanding / 20;  // 0.5 - 1.0
  
  // 打破习惯（反常规射门）
  const unpredictability = confidence / 20;  // 0.5 - 1.0
  
  // 博弈结果
  // 如果射门者做反常规选择，门将更难猜对
  const isUnpredictable = Math.random() < unpredictability * 0.4;  // 最多40%概率反常规
  
  return {
    mindGameAwareness,
    unpredictability,
    isUnpredictable,
    // 反常规射门有额外优势
    unpredictabilityBonus: isUnpredictable ? 0.25 : 0
  };
}

// ── 决策层：选择射门时机 ──
function chooseShotTiming(shooterAttrs, context) {
  const decisionSpeed = shooterAttrs.决断速度 || shooterAttrs.decisionSpeed || 10;
  const pressure = context.pressure || 0;
  
  // 决断速度影响射门果断性
  // 决断快 = 不犹豫 = 射门更果敢
  const decisiveness = decisionSpeed / 20;  // 0.5 - 1.0
  
  // 压力下犹豫惩罚
  const hesitation = pressure > 0.6 && decisionSpeed < 12 ? 0.12 : 0;
  
  // 时机质量
  const timingQuality = decisiveness * 0.7 + (1 - hesitation) * 0.3;
  
  return {
    decisiveness,
    hesitation,
    timingQuality  // 0.5 - 1.0
  };
}

// ── 物理执行层 ──

function computePressure(defDist) {
  if (defDist === undefined) return 0;
  return Math.max(0, Math.min(1, 1 - (defDist - 0.3) / 4.7));
}

function wallBlockRate(context) {
  if (context.setPiece !== 'freeKick') return 0;
  const d = context.distance || 22;
  const wallCoverage = 0.55 + (d - 16) * 0.012;
  return Math.min(0.85, Math.max(0.45, wallCoverage));
}

function defBlockRate(context, defenderAttrs) {
  if (context.setPiece === 'penalty') return 0;
  const defDist = context.defDist;
  if (defDist === undefined || defDist >= 6) return 0;

  const defScore = (defenderAttrs ? defenderAttrs.防守技术 || defenderAttrs.positioning || 10 : 10) * 0.4 +
                   (defenderAttrs ? defenderAttrs.对抗 || defenderAttrs.strength || 10 : 10) * 0.3 +
                   (defenderAttrs ? defenderAttrs.空中能力 || defenderAttrs.jump || 10 : 10) * 0.3;

  const distFactor = 0.8 / (1 + Math.pow(defDist / 2.5, 2));
  const laneFactor = 1 + Math.max(0, (context.defInLane || 0) - 1) * 0.4;
  const shotDistBonus = Math.min(1, (context.distance || 0) / 20);
  const rate = defScore / (defScore + 12) * distFactor * laneFactor * (0.5 + 0.5 * shotDistBonus);
  return Math.min(0.55, rate);
}

function shotOnTargetRate(shotType, shooterAttrs, context, intent) {
  const isPen = context.setPiece === 'penalty';
  const isFK = context.setPiece === 'freeKick';

  let score = 0;
  for (const [attr, weight] of Object.entries(shotType.attrs)) {
    score += (shooterAttrs[attr] || 10) * weight;
  }

  // 现实：英超平均射正率约33%，顶级前锋40-45%，普通球员25-30%
  // 基础射正率0.40，属性16的射手可达0.55
  const idealOT = isPen ? (0.95 * score / (score + 0.5)) : (0.40 * score / (score + 8));

  const d = Math.max(0, (context.distance || 0) - shotType.distRef);
  let distFactor = 1 / (1 + Math.pow(d / shotType.distDecay, 2));
  if (isPen) distFactor = 1.0;
  if (isFK) distFactor = 1 - (1 - distFactor) * 0.5;

  const angleFactor = isPen ? 1.0 : Math.max(0.15, 1 - (context.angle || 0) * shotType.angleSens);

  const pressure = computePressure(context.defDist);
  const pressMult = (isPen || isFK) ? 0 : 0.40;
  const pressureFactor = Math.max(0.55, 1 - pressure * pressMult);

  const fatigueFactor = Math.max(0.75, 1 - (context.fatigue || 0) * 0.003);

  // 意图判断修正
  const keeperBonus = intent.keeperRead.readQuality * 0.06;
  const directionBonus = intent.direction.correctChoice ? 0.05 : 0;
  const timingBonus = intent.timing.timingQuality * 0.04;
  const mindBonus = intent.mindGame.unpredictabilityBonus * 0.05;
  const intentMod = 1 + keeperBonus + directionBonus + timingBonus + mindBonus;

  return Math.min(0.92, Math.max(0.02,
    idealOT * distFactor * angleFactor * pressureFactor * fatigueFactor * intentMod
  ));
}

function goalGivenOnTarget(shotType, shooterAttrs, context, gkAttrs, intent) {
  const isPen = context.setPiece === 'penalty';
  const isFK = context.setPiece === 'freeKick';

  let quality = 0;
  for (const [attr, weight] of Object.entries(shotType.attrs)) {
    quality += (shooterAttrs[attr] || 10) * weight;
  }
  const powerBonus = (shooterAttrs.力量输出 || shooterAttrs.power || 10) * shotType.finishFactor * 0.25;

  const df = Math.max(0, (context.distance || 0) - (isFK ? 10 : 6));
  const distDecay = isFK ? 20 : 16;
  let distFinFactor = 1 / (1 + Math.pow(df / distDecay, 2));
  if (isPen) distFinFactor = 1.0;

  const angleFinFactor = isPen ? 1.0 : Math.max(0.15, 1 - (context.angle || 0) * 0.010);

  const gkScore = (gkAttrs.瞬间反应 || gkAttrs.reflexes || 10) * 0.35 +
                  (gkAttrs.足球理解 || gkAttrs.positioning || 10) * 0.35 +
                  (gkAttrs.触球精度 || gkAttrs.handling || 10) * 0.3;

  const pressure = computePressure(context.defDist);
  const visionFactor = (isPen || isFK) ? 1.0 : Math.max(0.75, 1 - pressure * 0.25);

  // 博弈修正：射门者角度选择 vs 门将预判
  const mindGameMod = intent.mindGame.isUnpredictable ? 0.85 : 1.0;
  const directionMod = intent.direction.directionAdvantage > 1.0 ? 0.9 : 1.0;

  const attackerScore = quality + powerBonus;
  const effectiveGk = gkScore * visionFactor * mindGameMod * directionMod;

  let gkMult;
  if (isPen) gkMult = 0.32;
  else if (isFK) gkMult = 1.5;
  else if (context.defDist >= 6) gkMult = 1.0;
  else gkMult = 2.0;

  const baseGoal = attackerScore / (attackerScore + effectiveGk * gkMult);
  return Math.min(0.90, Math.max(0.02, baseGoal * distFinFactor * angleFinFactor));
}

// ── 完整结果 ──
function shoot(shooterAttrs, shotTypeKey, context, gkAttrs, defenderAttrs) {
  const shotType = typeof shotTypeKey === 'string' ? SHOT_TYPES[shotTypeKey] : shotTypeKey;

  // 意图判断层
  const keeperRead = readKeeperPosition(shooterAttrs, context);
  const direction = chooseShotDirection(shooterAttrs, context, keeperRead);
  const mindGame = shotMindGame(shooterAttrs, context, keeperRead, direction);
  const timing = chooseShotTiming(shooterAttrs, context);

  const intent = { keeperRead, direction, mindGame, timing };

  // 物理执行层
  const wallBlock = wallBlockRate(context);
  const defBlock = defBlockRate(context, defenderAttrs);
  const totalBlock = 1 - (1 - wallBlock) * (1 - defBlock);
  const notBlocked = 1 - totalBlock;
  const ot = shotOnTargetRate(shotType, shooterAttrs, context, intent);
  const ggt = goalGivenOnTarget(shotType, shooterAttrs, context, gkAttrs, intent);
  const totalProb = notBlocked * ot * ggt;

  return {
    totalProb,
    onTargetRate: ot,
    goalGivenTarget: ggt,
    wallBlockRate: wallBlock,
    defBlockRate: defBlock,
    blockRate: totalBlock,
    // 射门方向（传给门将模块用）
    shotDirection: direction.preferredDirection,
    intent,
    breakdown: {
      keeperReadQuality: keeperRead.readQuality,
      directionChoice: direction.preferredDirection,
      isUnpredictable: mindGame.isUnpredictable,
      timingQuality: timing.timingQuality
    }
  };
}

module.exports = {
  SHOT_TYPES,
  SHOT_DIRECTIONS,
  shoot,
  shotOnTargetRate,
  goalGivenOnTarget,
  wallBlockRate,
  defBlockRate,
  readKeeperPosition,
  chooseShotDirection,
  shotMindGame,
  chooseShotTiming
};
