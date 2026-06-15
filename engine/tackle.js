// ============================================================
// 抢断模块 Tackle — 物理逻辑推导 + 意图预判（第二轮修改）
// ============================================================
// 现实依据：
//   - 现代防守是"智能过程"，不是盲目抢断（教练资料）
//   - 观察对手眼神、重心预判下一步动作（抢断技巧）
//   - 时机判断比上抢更重要（防守原则）
//   - 预判准确避免犯规（技术分类）
//
// 核心结构：
//   1. 意图判断层：读取持球者线索 → 预判下一步动作
//   2. 决策层：选择抢断时机和方式
//   3. 物理执行层：脚速 vs 移球速度
//
// 使用的属性（组合方式）：
//   - 对手识别：读取持球者眼神、重心、姿态
//   - 足球理解：选择抢断时机、位置选择
//   - 决断速度：时机判断准确性
//   - 防守技术：执行抢断的技术水平
//   - 爆发：逼近速度
//   - 侵略性：上抢积极性（也影响犯规率）
// ============================================================

// 物理常数
const INITIATIVE = 0.93;      // 防守方先手优势系数
const SPEED_WEIGHT = 0.12;    // 每1m/s速度差带来的优势
const FATIGUE_SCALE = 1.0;    // 疲劳对铲球的影响倍数

// 持球者动作类型
const CARRIER_ACTIONS = {
  dribbleForward: '继续盘带',
  pass: '传球',
  shoot: '射门',
  shield: '护球',
  changeDirection: '变向'
};

// ── 意图判断层：读取持球者线索 ──
// 现实：观察眼神、重心、姿态预判下一步动作
function readCarrierClues(defenderAttrs, context) {
  const opponentRecognition = defenderAttrs.对手识别 || defenderAttrs.opponentRecognition || 10;
  const footballUnderstanding = defenderAttrs.足球理解 || defenderAttrs.footballUnderstanding || 10;
  
  // 线索读取质量（基于对手识别）
  // 现实：专家防守者能从眼神、重心读出意图
  const clueReading = opponentRecognition / 20;  // 0.5 - 1.0
  
  // 线索解读能力（基于足球理解）
  // 知道哪些线索在什么情况下可靠
  const clueInterpretation = 0.4 + (footballUnderstanding / 20) * 0.4;  // 0.6 - 0.8
  
  // 综合线索质量
  const clueQuality = clueReading * clueInterpretation;
  
  return {
    clueQuality,  // 0.25 - 0.8
    clueReading,
    clueInterpretation
  };
}

// ── 意图判断层：预判持球者动作 ──
function anticipateCarrierAction(defenderAttrs, context) {
  const { clueQuality } = readCarrierClues(defenderAttrs, context);
  const decisionSpeed = defenderAttrs.决断速度 || defenderAttrs.decisionSpeed || 10;
  
  // 预判成功率
  // 基础30%（猜测），最高70%（专家级）
  const baseAnticipation = 0.3;
  const maxAnticipation = 0.7;
  const anticipationRate = baseAnticipation + clueQuality * (maxAnticipation - baseAnticipation);
  
  // 决断速度影响预判速度（影响时机选择）
  const timingBonus = (decisionSpeed - 10) * 0.02;  // -0.2 到 +0.2
  
  // 实际预判成功率（考虑时机）
  const effectiveRate = Math.min(0.75, Math.max(0.2, anticipationRate + timingBonus));
  
  // 持球者实际动作（由盘带模块提供）
  const actualAction = context.carrierAction || 'dribbleForward';
  
  // 是否预判正确
  const isCorrect = Math.random() < effectiveRate;
  
  return {
    guessedAction: isCorrect ? actualAction : getRandomAction(actualAction),
    isCorrect,
    anticipationRate: effectiveRate,
    timingBonus
  };
}

function getRandomAction(excludeAction) {
  const actions = Object.keys(CARRIER_ACTIONS).filter(a => a !== excludeAction);
  return actions[Math.floor(Math.random() * actions.length)];
}

// ── 决策层：选择抢断时机 ──
function chooseTackleTiming(defenderAttrs, context, anticipation) {
  const footballUnderstanding = defenderAttrs.足球理解 || defenderAttrs.footballUnderstanding || 10;
  const decisionSpeed = defenderAttrs.决断速度 || defenderAttrs.decisionSpeed || 10;
  
  // 时机选择质量
  // 基于足球理解（知道什么时候该抢）和决断速度（快速判断）
  const timingQuality = (footballUnderstanding + decisionSpeed) / 40;  // 0.4 - 0.9
  
  // 预判正确时的时机奖励
  const anticipationBonus = anticipation.isCorrect ? 0.15 : -0.1;
  
  // 综合时机评分
  const timingScore = timingQuality + anticipationBonus;
  
  // 时机分类
  if (timingScore > 0.8) return { timing: 'perfect', bonus: 0.2 };
  if (timingScore > 0.6) return { timing: 'good', bonus: 0.1 };
  if (timingScore > 0.4) return { timing: 'normal', bonus: 0 };
  if (timingScore > 0.2) return { timing: 'early', bonus: -0.1 };
  return { timing: 'late', bonus: -0.2 };
}

// ── 物理执行层：抢断成功率 ──
function tackleWinProb(defenderAttrs, carrierAttrs, context) {
  // 意图判断
  const anticipation = anticipateCarrierAction(defenderAttrs, context);
  const timing = chooseTackleTiming(defenderAttrs, context, anticipation);
  
  // 基础属性得分
  const defScore = calculateDefenderScore(defenderAttrs, context);
  const carScore = calculateCarrierScore(carrierAttrs, context, anticipation);
  
  // 速度差修正
  const speedDiff = context.speedDiff || 0;
  const speedMod = speedDiff >= 0
    ? 1 + speedDiff * SPEED_WEIGHT
    : 1 / (1 - speedDiff * SPEED_WEIGHT);
  
  // 疲劳修正
  const fatigue = context.fatigue || 0;
  const fatigueMod = Math.max(0.6, 1 - fatigue * 0.004 * FATIGUE_SCALE);
  
  // 基础胜率
  const baseWin = defScore / (defScore + carScore * INITIATIVE);
  
  // 时机修正
  const timingMod = 1 + timing.bonus;
  
  // 预判修正（预判正确时持球者更难反应）
  const anticipationMod = anticipation.isCorrect ? 1.15 : 0.9;
  
  return {
    winProb: Math.min(0.93, Math.max(0.04, baseWin * speedMod * fatigueMod * timingMod * anticipationMod)),
    anticipation,
    timing,
    baseWin,
    speedMod,
    fatigueMod
  };
}

function calculateDefenderScore(defenderAttrs, context) {
  const tackling = defenderAttrs.防守技术 || defenderAttrs.tackling || 10;
  const burst = defenderAttrs.爆发 || defenderAttrs.burst || 10;
  const aggression = defenderAttrs.侵略性 || defenderAttrs.aggression || 10;
  
  // 脚速 = 铲球准确度40% + 爆发35% + 侵略性25%（时机判断）
  return tackling * 0.40 + burst * 0.35 + aggression * 0.25;
}

function calculateCarrierScore(carrierAttrs, context, anticipation) {
  const control = carrierAttrs.控制技巧 || carrierAttrs.control || 10;
  const balance = carrierAttrs.对抗 || carrierAttrs.balance || 10;
  const composure = carrierAttrs.冷静导向 || carrierAttrs.composure || 10;
  
  // 移球速度 = 控球55% + 平衡45% + 冷静（抗压）
  let baseScore = control * 0.55 + balance * 0.45;
  
  // 预判正确时，持球者被突袭，冷静度更重要
  if (anticipation.isCorrect) {
    baseScore *= (0.8 + composure / 50);  // 冷静高可以部分抵消
  }
  
  return baseScore;
}

// ── 犯规概率 ──
function tackleFoulProb(defenderAttrs, context, anticipation) {
  const aggression = defenderAttrs.侵略性 || defenderAttrs.aggression || 10;
  const tackling = defenderAttrs.防守技术 || defenderAttrs.tackling || 10;
  const footballUnderstanding = defenderAttrs.足球理解 || defenderAttrs.footballUnderstanding || 10;
  
  // 基础犯规率：技术/侵略比
  const techniqueRatio = tackling / Math.max(1, aggression);
  const baseFoul = 0.25 / (1 + techniqueRatio);
  
  // 速度惩罚
  const speedPenalty = Math.abs(context.speedDiff || 0) * 0.02;
  
  // 时机惩罚：时机差增加犯规率
  const timingPenalty = anticipation.isCorrect ? 0 : 0.05;
  
  // 足球理解修正：理解深知道何时不该犯规
  const understandingMod = Math.max(0.7, 1 - (footballUnderstanding - 10) * 0.02);
  
  return Math.min(0.45, (baseFoul + speedPenalty + timingPenalty) * understandingMod);
}

// ── 统一接口 ──
function tackle(defenderAttrs, carrierAttrs, context) {
  const result = tackleWinProb(defenderAttrs, carrierAttrs, context);
  const foulProb = tackleFoulProb(defenderAttrs, context, result.anticipation);
  
  return {
    winProb: result.winProb,
    foulProb,
    anticipation: result.anticipation,
    timing: result.timing,
    breakdown: {
      clueQuality: readCarrierClues(defenderAttrs, context).clueQuality,
      baseWin: result.baseWin,
      speedMod: result.speedMod,
      fatigueMod: result.fatigueMod,
      timingBonus: result.timing.bonus,
      anticipationMod: result.anticipation.isCorrect ? 1.15 : 0.9
    }
  };
}

module.exports = {
  tackle,
  tackleWinProb,
  tackleFoulProb,
  readCarrierClues,
  anticipateCarrierAction,
  chooseTackleTiming,
  CARRIER_ACTIONS
};
