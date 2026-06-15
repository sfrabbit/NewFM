// ============================================================
// 盘带模块 — 物理逻辑推导 + 意图预判（第二轮修改）
// ============================================================
// 现实依据：
//   - 阅读防守者重心、姿态、意图后决策（专业训练文档）
//   - 假动作影响防守者心理（心理博弈）
//   - 评估突破后空间（空间感知）
//   - 时机选择（过早/过晚都有惩罚）
//
// 核心结构：
//   1. 意图判断层：阅读防守者 → 预判上抢时机 → 选择突破方向
//   2. 决策层：选择盘带方式和时机
//   3. 物理执行层：控球+爆发+速度执行突破
//
// 使用的属性（组合方式）：
//   - 对手识别：阅读防守者重心、姿态、意图
//   - 足球理解：空间评估、突破路线选择
//   - 决断速度：突破时机选择
//   - 控制技巧：控球技术执行
//   - 爆发：突破加速
//   - 速度：持续冲刺
//   - 自信：假动作成功率（组合属性）
// ============================================================

// 盘带方式定义
const DRIBBLE_STYLES = {
  burst: {
    name: "爆发带球",
    desc: "用速度向前冲刺推进",
    attrs: { 爆发: 0.5, 速度: 0.5 },
    risk: 0.40,
    spaceSensitivity: 0.08,
    pressureSensitivity: 0.12,
    requiresRead: true,  // 需要阅读防守者
  },
  control: {
    name: "控制带球",
    desc: "保持控球稳步推进",
    attrs: { 控制技巧: 0.6, 爆发: 0.4 },
    risk: 0.30,
    spaceSensitivity: 0.05,
    pressureSensitivity: 0.08,
    requiresRead: false,
  },
  force: {
    name: "强行突破",
    desc: "尝试强行盘带过掉防守者",
    attrs: { 控制技巧: 0.4, 爆发: 0.4, 自信: 0.2 },
    risk: 0.55,
    spaceSensitivity: 0.04,
    pressureSensitivity: 0.25,
    requiresRead: true,
  },
  shield: {
    name: "护球",
    desc: "用身体护住球，等待队友支援",
    attrs: { 控制技巧: 0.4, 对抗: 0.6 },
    risk: 0.22,
    spaceSensitivity: 0.01,
    pressureSensitivity: 0.04,
    requiresRead: false,
  },
  feint: {
    name: "假动作突破",
    desc: "用假动作骗过防守者后突破",
    attrs: { 控制技巧: 0.4, 爆发: 0.3, 自信: 0.3 },
    risk: 0.35,
    spaceSensitivity: 0.03,
    pressureSensitivity: 0.15,
    requiresRead: true,
    isFeint: true,  // 假动作特殊处理
  },
};

// ── 意图判断层：阅读防守者 ──
// 现实：观察防守者重心、姿态、意图
function readDefender(dribblerAttrs, context) {
  const opponentRecognition = dribblerAttrs.对手识别 || dribblerAttrs.opponentRecognition || 10;
  const footballUnderstanding = dribblerAttrs.足球理解 || dribblerAttrs.footballUnderstanding || 10;
  
  // 重心读取（基于对手识别）
  // 重心前倾 = 要上抢，重心后移 = 要后退
  const centerOfGravityRead = opponentRecognition / 20;  // 0.5 - 1.0
  
  // 姿态识别（基于足球理解）
  // 侧身 = 防一边，正面 = 等时机
  const stanceRecognition = 0.4 + (footballUnderstanding / 20) * 0.4;  // 0.4 - 0.8
  
  // 意图预判（综合）
  const intentPrediction = centerOfGravityRead * 0.6 + stanceRecognition * 0.4;
  
  return {
    centerOfGravityRead,
    stanceRecognition,
    intentPrediction  // 0.46 - 0.92
  };
}

// ── 意图判断层：假动作效果 ──
// 现实：假动作影响防守者心理，争取时间和空间
function feintEffect(dribblerAttrs, defenderAttrs, context) {
  const control = dribblerAttrs.控制技巧 || dribblerAttrs.control || 10;
  const confidence = dribblerAttrs.自信 || dribblerAttrs.confidence || 10;
  
  // 假动作质量（基于控制技巧+自信）
  const feintQuality = (control * 0.6 + confidence * 0.4) / 20;  // 0.5 - 1.0
  
  // 防守者受骗概率（基于防守者对手识别）
  const defenderRead = defenderAttrs ? (defenderAttrs.对手识别 || 10) : 10;
  const deceiveProb = Math.max(0.2, feintQuality - defenderRead / 40);  // 0.2 - 0.75
  
  // 受骗效果：防守者重心偏移，产生时间和空间优势
  const timeAdvantage = deceiveProb * 0.5;  // 0-0.5秒时间优势
  const spaceAdvantage = deceiveProb * 3;   // 0-3米空间优势
  
  return {
    feintQuality,
    deceiveProb,
    timeAdvantage,
    spaceAdvantage,
    isDeceived: Math.random() < deceiveProb
  };
}

// ── 意图判断层：空间评估 ──
// 现实：评估突破后是否有足够空间
function assessSpace(dribblerAttrs, context) {
  const footballUnderstanding = dribblerAttrs.足球理解 || dribblerAttrs.footballUnderstanding || 10;
  const vision = dribblerAttrs.足球理解 || dribblerAttrs.vision || 10;  // 用足球理解替代视野
  
  // 空间感知能力
  const spatialAwareness = footballUnderstanding / 20;  // 0.5 - 1.0
  
  // 实际空间
  const actualSpace = context.space || 10;
  
  // 感知到的空间（基于空间感知能力）
  const perceivedSpace = actualSpace * (0.7 + spatialAwareness * 0.3);  // 有误差但不大
  
  // 突破价值评估
  // 空间足够大才值得突破
  const breakthroughValue = perceivedSpace > 15 ? 1.0 : perceivedSpace / 15;
  
  return {
    spatialAwareness,
    actualSpace,
    perceivedSpace,
    breakthroughValue  // 0 - 1
  };
}

// ── 决策层：选择突破时机 ──
function chooseBreakthroughTiming(dribblerAttrs, context, defenderRead) {
  const decisionSpeed = dribblerAttrs.决断速度 || dribblerAttrs.decisionSpeed || 10;
  const pressure = context.pressure || 0;
  
  // 决断速度影响时机选择
  // 决断快 = 抓住瞬间机会
  const timingPrecision = decisionSpeed / 20;  // 0.5 - 1.0
  
  // 防守者意图影响时机
  // 防守者重心前倾（要上抢）= 好时机
  const defenderIntent = defenderRead.intentPrediction;
  const opportunityWindow = defenderIntent > 0.7 ? 0.2 : 0;  // 0-0.2秒机会窗口
  
  // 时机质量
  const timingQuality = timingPrecision * 0.6 + opportunityWindow * 2;  // 综合评分
  
  // 过早/过晚惩罚
  const isTooEarly = timingPrecision < 0.6 && pressure > 0.5;
  const isTooLate = timingPrecision < 0.5 && pressure < 0.3;
  const timingPenalty = (isTooEarly || isTooLate) ? 0.15 : 0;
  
  return {
    timingPrecision,
    opportunityWindow,
    timingQuality: Math.max(0.3, timingQuality - timingPenalty),
    isTooEarly,
    isTooLate
  };
}

// ── 物理执行层：盘带成功率 ──
function dribbleSuccessRate(style, dribblerAttrs, defenderAttrs, context, intent) {
  // 基础属性得分
  let playerScore = 0;
  for (const [attr, weight] of Object.entries(style.attrs)) {
    playerScore += (dribblerAttrs[attr] || 10) * weight;
  }
  
  // 防守者能力
  const defenderScore = (defenderAttrs ? (defenderAttrs.防守技术 || 10) : 10) * 0.4 +
                        (defenderAttrs ? (defenderAttrs.爆发 || 10) : 10) * 0.3 +
                        (defenderAttrs ? (defenderAttrs.对抗 || 10) : 10) * 0.3;
  
  // 情境因子
  const spaceRef = 10;
  const spaceDeficit = Math.max(0, spaceRef - (context.space || 0));
  const spaceFactor = Math.max(0.3, 1 - style.spaceSensitivity * spaceDeficit);
  
  const pressureFactor = Math.max(0.4, 1 - (context.pressure || 0) * style.pressureSensitivity);
  
  const fatigueFactor = Math.max(0.7, 1 - (context.fatigue || 0) * 0.005);
  
  // 意图判断层修正
  let intentMod = 1.0;
  
  if (style.requiresRead) {
    // 需要阅读防守者的盘带方式
    const readBonus = intent.defenderRead.intentPrediction * 0.15;
    const timingBonus = intent.timing.timingQuality * 0.1;
    intentMod += readBonus + timingBonus;
  }
  
  if (style.isFeint) {
    // 假动作特殊处理
    const feintBonus = intent.feint.isDeceived ? 0.25 : -0.1;
    intentMod += feintBonus;
  }
  
  // 空间评估修正
  const spaceBonus = intent.space.breakthroughValue * 0.1;
  intentMod += spaceBonus;
  
  // 基础成功率
  const baseSuccess = playerScore / (playerScore + style.risk * defenderScore);
  
  return Math.min(0.95, Math.max(0.05, 
    baseSuccess * spaceFactor * pressureFactor * fatigueFactor * intentMod
  ));
}

// ── 辅助：获取适合当前情境的盘带方式 ──
function suggestStyles(dribblerAttrs, context) {
  const defenderRead = readDefender(dribblerAttrs, context);
  const space = assessSpace(dribblerAttrs, context);
  const timing = chooseBreakthroughTiming(dribblerAttrs, context, defenderRead);
  
  const scored = Object.entries(DRIBBLE_STYLES).map(([key, style]) => {
    let score = 0;
    for (const [attr, weight] of Object.entries(style.attrs)) {
      score += (dribblerAttrs[attr] || 10) * weight;
    }
    
    // 空间大时倾向冲刺
    if (key === 'burst') score *= (1 + space.perceivedSpace * 0.02);
    
    // 压力高时倾向护球/假动作
    if (key === 'shield') score *= (1 + context.pressure * 0.3);
    if (key === 'feint' && defenderRead.intentPrediction > 0.6) score *= 1.3;
    
    // 时机好时倾向强行突破
    if (key === 'force' && timing.timingQuality > 0.7) score *= 1.2;
    
    return [key, score];
  });
  
  return scored.sort((a, b) => b[1] - a[1]).map(([key]) => key);
}

// ── 统一接口 ──
function dribble(dribblerAttrs, styleKey, context, defenderAttrs) {
  const style = DRIBBLE_STYLES[styleKey];
  
  // 意图判断层
  const defenderRead = readDefender(dribblerAttrs, context);
  const space = assessSpace(dribblerAttrs, context);
  const timing = chooseBreakthroughTiming(dribblerAttrs, context, defenderRead);
  
  // 假动作效果（如果是假动作）
  let feint = { isDeceived: false, deceiveProb: 0 };
  if (style.isFeint && defenderAttrs) {
    feint = feintEffect(dribblerAttrs, defenderAttrs, context);
  }
  
  const intent = { defenderRead, space, timing, feint };
  
  // 物理执行层
  const successRate = dribbleSuccessRate(style, dribblerAttrs, defenderAttrs, context, intent);
  
  return {
    successRate,
    style: style.name,
    intent,
    breakdown: {
      defenderRead: defenderRead.intentPrediction,
      spaceValue: space.breakthroughValue,
      timingQuality: timing.timingQuality,
      feintSuccess: feint.isDeceived
    }
  };
}

module.exports = {
  DRIBBLE_STYLES,
  dribble,
  dribbleSuccessRate,
  suggestStyles,
  readDefender,
  feintEffect,
  assessSpace,
  chooseBreakthroughTiming
};
