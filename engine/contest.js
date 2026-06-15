// ============================================================
// 争顶模块 Contest — 物理逻辑推导 + 意图预判（第二轮修改）
// ============================================================
// 现实依据：
//   - 预判落点是关键（头球教学课件）
//   - 动态调整移动路线（头球教学）
//   - 提前移动占位置（吕迪格案例：提前移动甩开后卫2米）
//   - 第一落点争夺（中后卫职责）
//
// 核心结构：
//   1. 意图判断层：预判落点 → 选择移动路线
//   2. 决策层：提前移动时机、卡位位置
//   3. 物理执行层：跳跃/力量/头球技术对抗
//
// 使用的属性（组合方式）：
//   - 足球理解：落点预判、轨迹判断、空间管理
//   - 决断速度：提前移动时机选择
//   - 爆发：移动速度、起跳爆发
//   - 速度：长距离移动
//   - 空中能力：争顶执行
//   - 对抗：身体卡位
//   - 对手识别：预判对手移动、卡位时机
// ============================================================

// 争顶类型定义
const CONTEST_TYPES = {
  aerial: {
    name: "空中争顶",
    // 垂直弹跳50% + 上肢力量30% + 头球技术20%
    attrs: { 空中能力: 0.50, 对抗: 0.30, 触球精度: 0.20 },
    idealHeight: 0.8,
    pressureSens: 0.20,
    fatigueScale: 1.1,
  },
  shoulder: {
    name: "身体卡位",
    // 力量55% + 平衡45%
    attrs: { 对抗: 0.55, 体质: 0.45 },
    idealHeight: 0.2,
    pressureSens: 0.15,
    fatigueScale: 1.3,
  },
};

// 解围属性
const CLEARANCE_ATTRS = {
  空中能力: 0.40,
  对抗: 0.35,
  冷静导向: 0.25
};

// ── 加权得分工具 ──
function attrScore(attrs, weights) {
  if (!attrs || !weights) return 100; // 无对手 → 默认得分
  let s = 0;
  for (const [k, w] of Object.entries(weights)) {
    s += (attrs[k] || 10) * w;
  }
  return s;
}

// ── 意图判断层：落点预判 ──
// 现实：基于球轨迹、旋转、传球者姿态预判落点
function predictLandingPoint(playerAttrs, context) {
  const footballUnderstanding = playerAttrs.足球理解 || playerAttrs.footballUnderstanding || 10;
  
  // 落点预判质量（基于足球理解）
  // 现实：顶级球员能提前判断落点，提前移动
  const predictionQuality = 0.4 + (footballUnderstanding / 20) * 0.5;  // 0.4 - 0.9
  
  // 预判误差（随机因素）
  const predictionError = (1 - predictionQuality) * 2;  // 误差范围
  
  return {
    predictionQuality,
    predictionError,
    // 实际落点与预判的偏差（模拟）
    actualDeviation: (Math.random() - 0.5) * predictionError
  };
}

// ── 意图判断层：提前移动时机 ──
// 现实：提前移动占位置，比对手早到落点
function chooseMovementTiming(playerAttrs, context, prediction) {
  const decisionSpeed = playerAttrs.决断速度 || playerAttrs.decisionSpeed || 10;
  const opponentRecognition = playerAttrs.对手识别 || playerAttrs.opponentRecognition || 10;
  
  // 决断速度影响移动启动时机
  // 决断快 → 早启动 → 早到位
  const timingAdvantage = (decisionSpeed - 10) * 0.03;  // -0.3 到 +0.3秒优势
  
  // 对手识别影响卡位策略
  // 能预判对手移动 → 选择更好卡位位置
  const positioningQuality = 0.5 + (opponentRecognition / 20) * 0.4;  // 0.5 - 0.9
  
  // 预判质量影响移动信心
  const confidence = prediction.predictionQuality;
  
  return {
    timingAdvantage,  // 秒
    positioningQuality,
    confidence,
    // 综合移动优势
    movementAdvantage: timingAdvantage * 0.5 + positioningQuality * 0.3 + confidence * 0.2
  };
}

// ── 意图判断层：卡位位置选择 ──
// 现实：空间管理，选择最有利位置
function choosePositioning(playerAttrs, opponentAttrs, context, movement) {
  const footballUnderstanding = playerAttrs.足球理解 || playerAttrs.footballUnderstanding || 10;
  const opponentRecognition = playerAttrs.对手识别 || playerAttrs.opponentRecognition || 10;
  
  // 空间感知能力
  const spatialAwareness = footballUnderstanding / 20;  // 0.5 - 1.0
  
  // 预判对手位置
  const opponentPrediction = opponentRecognition / 20;  // 0.5 - 1.0
  
  // 位置优势 = 空间感知 + 预判对手 - 对手干扰
  const opponentAwareness = opponentAttrs ? (opponentAttrs.对手识别 || 10) / 20 : 0.5;
  const positionAdvantage = spatialAwareness * 0.5 + opponentPrediction * 0.3 - opponentAwareness * 0.2;
  
  return {
    positionAdvantage: Math.max(0, Math.min(1, positionAdvantage)),
    spatialAwareness,
    opponentPrediction
  };
}

// ── 物理执行层：争顶胜率 ──
function contestWinProb(contestType, attackerAttrs, defenderAttrs, context) {
  // 无防守者 → 攻击方几乎必胜
  if (!defenderAttrs) {
    const atkScore = attrScore(attackerAttrs, contestType.attrs);
    return { winProb: Math.min(0.98, atkScore / 200), reason: 'uncontested' };
  }

  // 意图判断层
  const atkPrediction = predictLandingPoint(attackerAttrs, context);
  const atkMovement = chooseMovementTiming(attackerAttrs, context, atkPrediction);
  const atkPositioning = choosePositioning(attackerAttrs, defenderAttrs, context, atkMovement);
  
  const defPrediction = predictLandingPoint(defenderAttrs, context);
  const defMovement = chooseMovementTiming(defenderAttrs, context, defPrediction);
  const defPositioning = choosePositioning(defenderAttrs, attackerAttrs, context, defMovement);
  
  // 基础身体能力得分
  const atkScore = attrScore(attackerAttrs, contestType.attrs);
  const defScore = attrScore(defenderAttrs, contestType.attrs);
  
  // 球高匹配度
  const ballH = context.ballHeight !== undefined ? context.ballHeight : 0.5;
  const heightMatch = 1 - Math.abs(ballH - contestType.idealHeight) * 1.2;
  const heightFactor = Math.max(0.4, heightMatch);
  
  // 疲劳修正
  const fatigue = context.fatigue || 0;
  const fatigueMod = Math.max(0.7, 1 - fatigue * 0.003 * contestType.fatigueScale);
  
  // 意图判断层修正
  // 预判好 + 移动快 + 位置优 = 争顶优势
  const atkIntentMod = 1 + atkMovement.movementAdvantage * 0.3 + atkPositioning.positionAdvantage * 0.2;
  const defIntentMod = 1 + defMovement.movementAdvantage * 0.3 + defPositioning.positionAdvantage * 0.2;
  
  // 调整后的能力值
  const adjustedAtk = atkScore * heightFactor * fatigueMod * atkIntentMod;
  const adjustedDef = defScore * heightFactor * fatigueMod * defIntentMod;
  
  // 胜率计算（50/50对抗）
  const winProb = adjustedAtk / (adjustedAtk + adjustedDef);
  
  return {
    winProb: Math.min(0.93, Math.max(0.04, winProb)),
    attacker: {
      prediction: atkPrediction,
      movement: atkMovement,
      positioning: atkPositioning,
      intentMod: atkIntentMod
    },
    defender: {
      prediction: defPrediction,
      movement: defMovement,
      positioning: defPositioning,
      intentMod: defIntentMod
    }
  };
}

// ── 解围结果 ──
function clearanceResult(contestType, defenderAttrs, context) {
  // 意图判断层（解围方）
  const prediction = predictLandingPoint(defenderAttrs, context);
  const movement = chooseMovementTiming(defenderAttrs, context, prediction);
  
  // 争顶成功率（假设对手属性相当）
  const dummyOpponent = { 空中能力: 12, 对抗: 12, 触球精度: 12, 体质: 12 };
  const contestResult = contestWinProb(contestType, defenderAttrs, dummyOpponent, context);
  const contestProb = contestResult.winProb;
  
  // 解围技术得分
  const clearScore = attrScore(defenderAttrs, CLEARANCE_ATTRS);
  
  // 压力影响
  const pressure = context.pressure || 0;
  const pressureFactor = Math.max(0.5, 1 - pressure * contestType.pressureSens);
  
  // 解围质量（预判好 → 解围质量高）
  const predictionBonus = prediction.predictionQuality * 0.2;
  const clearQuality = Math.max(0.3, (clearScore / 12) * 0.6 * pressureFactor + predictionBonus);
  
  // 解围成功率
  const successProb = Math.min(0.9, Math.max(0.2, contestProb * clearQuality));
  
  // 失败概率
  const contestFailProb = (1 - contestProb) * 0.6;
  const clearMistakeProb = contestProb * (1 - clearQuality) * 0.4;
  const failProb = Math.min(0.4, Math.max(0.05, contestFailProb + clearMistakeProb));
  
  // 勉强解围
  const partialProb = Math.max(0, Math.min(0.5, 1 - successProb - failProb));
  
  // 归一化
  const total = successProb + partialProb + failProb;
  
  return {
    success: successProb / total,
    partial: partialProb / total,
    fail: failProb / total,
    contestProb,
    prediction,
    movement
  };
}

// ── 统一接口 ──
function contest(contestType, attackerAttrs, defenderAttrs, context) {
  const intent = context.intent || 'possession';
  
  if (intent === 'clearance') {
    return {
      type: 'clearance',
      ...clearanceResult(contestType, attackerAttrs, context)
    };
  } else {
    const result = contestWinProb(contestType, attackerAttrs, defenderAttrs, context);
    return {
      type: 'possession',
      winProb: result.winProb,
      loseProb: 1 - result.winProb,
      attackerIntent: result.attacker,
      defenderIntent: result.defender
    };
  }
}

module.exports = {
  CONTEST_TYPES,
  contest,
  contestWinProb,
  clearanceResult,
  predictLandingPoint,
  chooseMovementTiming,
  choosePositioning,
  CLEARANCE_ATTRS
};
