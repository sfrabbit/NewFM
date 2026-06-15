// ============================================================
// Contest模块测试 — 第二轮修改验证
// ============================================================
// 验证点：
//   1. 意图判断层：足球理解影响落点预判
//   2. 提前移动：决断速度影响移动时机
//   3. 卡位位置：对手识别影响位置选择
//   4. 综合争顶：预判+移动+位置影响胜率
//   5. 解围：预判质量影响解围成功率
// ============================================================

const {
  contest,
  contestWinProb,
  clearanceResult,
  predictLandingPoint,
  chooseMovementTiming,
  choosePositioning,
  CONTEST_TYPES
} = require('../contest');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    return false;
  }
  return true;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      failed++;
    }
  } catch (e) {
    console.error(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

// ============================================================
// 测试1：落点预判
// ============================================================
test('落点预判 - 高足球理解提高预判质量', () => {
  const highUnderstanding = { 足球理解: 18 };
  const lowUnderstanding = { 足球理解: 8 };
  const context = {};

  const highPred = predictLandingPoint(highUnderstanding, context);
  const lowPred = predictLandingPoint(lowUnderstanding, context);

  return assert(highPred.predictionQuality > lowPred.predictionQuality,
    `高足球理解应提高预判质量: 高${highPred.predictionQuality.toFixed(2)} vs 低${lowPred.predictionQuality.toFixed(2)}`);
});

test('落点预判 - 高预判质量减少误差', () => {
  const highUnderstanding = { 足球理解: 18 };
  const lowUnderstanding = { 足球理解: 8 };
  const context = {};

  const highPred = predictLandingPoint(highUnderstanding, context);
  const lowPred = predictLandingPoint(lowUnderstanding, context);

  return assert(highPred.predictionError < lowPred.predictionError,
    `高预判质量应减少误差: 高${highPred.predictionError.toFixed(2)} vs 低${lowPred.predictionError.toFixed(2)}`);
});

// ============================================================
// 测试2：提前移动时机
// ============================================================
test('提前移动 - 高决断速度提供时机优势', () => {
  const fastDecision = { 决断速度: 18, 对手识别: 12 };
  const slowDecision = { 决断速度: 8, 对手识别: 12 };
  const prediction = { predictionQuality: 0.7 };
  const context = {};

  const fastMove = chooseMovementTiming(fastDecision, context, prediction);
  const slowMove = chooseMovementTiming(slowDecision, context, prediction);

  return assert(fastMove.timingAdvantage > slowMove.timingAdvantage,
    `高决断速度应提供时机优势: 快${fastMove.timingAdvantage.toFixed(3)}s vs 慢${slowMove.timingAdvantage.toFixed(3)}s`);
});

test('提前移动 - 高对手识别提高卡位质量', () => {
  const highRecog = { 决断速度: 12, 对手识别: 18 };
  const lowRecog = { 决断速度: 12, 对手识别: 8 };
  const prediction = { predictionQuality: 0.7 };
  const context = {};

  const highMove = chooseMovementTiming(highRecog, context, prediction);
  const lowMove = chooseMovementTiming(lowRecog, context, prediction);

  return assert(highMove.positioningQuality > lowMove.positioningQuality,
    `高对手识别应提高卡位质量`);
});

// ============================================================
// 测试3：卡位位置选择
// ============================================================
test('卡位位置 - 足球理解提高空间感知', () => {
  const highUnderstanding = { 足球理解: 18, 对手识别: 12 };
  const opponent = { 对手识别: 10 };
  const context = {};
  const movement = { movementAdvantage: 0 };

  const highPos = choosePositioning(highUnderstanding, opponent, context, movement);
  
  return assert(highPos.spatialAwareness > 0.8,
    `高足球理解应提高空间感知: ${highPos.spatialAwareness.toFixed(2)}`);
});

// ============================================================
// 测试4：综合争顶
// ============================================================
test('争顶 - 意图判断优势提高胜率', () => {
  const goodIntent = {
    空中能力: 12, 对抗: 12, 触球精度: 12,
    足球理解: 18, 决断速度: 18, 对手识别: 18
  };
  const poorIntent = {
    空中能力: 12, 对抗: 12, 触球精度: 12,
    足球理解: 8, 决断速度: 8, 对手识别: 8
  };
  const opponent = {
    空中能力: 12, 对抗: 12, 触球精度: 12,
    足球理解: 12, 决断速度: 12, 对手识别: 12
  };
  const context = { ballHeight: 0.8, fatigue: 0 };

  const goodResult = contestWinProb(CONTEST_TYPES.aerial, goodIntent, opponent, context);
  const poorResult = contestWinProb(CONTEST_TYPES.aerial, poorIntent, opponent, context);

  return assert(goodResult.winProb > poorResult.winProb,
    `意图判断优势应提高胜率: 好${(goodResult.winProb * 100).toFixed(1)}% vs 差${(poorResult.winProb * 100).toFixed(1)}%`);
});

// ============================================================
// 测试5：解围
// ============================================================
test('解围 - 预判质量影响解围成功率', () => {
  const goodPrediction = {
    空中能力: 14, 对抗: 14, 冷静导向: 14,
    足球理解: 18  // 高预判质量
  };
  const poorPrediction = {
    空中能力: 14, 对抗: 14, 冷静导向: 14,
    足球理解: 8   // 低预判质量
  };
  const context = { ballHeight: 0.8, pressure: 0.3, fatigue: 0 };

  const goodClear = clearanceResult(CONTEST_TYPES.aerial, goodPrediction, context);
  const poorClear = clearanceResult(CONTEST_TYPES.aerial, poorPrediction, context);

  return assert(goodClear.success > poorClear.success,
    `高预判质量应提高解围成功率: 好${(goodClear.success * 100).toFixed(1)}% vs 差${(poorClear.success * 100).toFixed(1)}%`);
});

// ============================================================
// 测试6：接口完整性
// ============================================================
test('接口 - 争球权返回完整意图信息', () => {
  const attacker = {
    空中能力: 14, 对抗: 14, 触球精度: 14,
    足球理解: 15, 决断速度: 15, 对手识别: 15
  };
  const defender = {
    空中能力: 12, 对抗: 12, 触球精度: 12,
    足球理解: 12, 决断速度: 12, 对手识别: 12
  };
  const context = { ballHeight: 0.8, intent: 'possession', fatigue: 0 };

  const result = contest(CONTEST_TYPES.aerial, attacker, defender, context);

  return assert(result.type === 'possession', '类型应为possession') &&
    typeof result.winProb === 'number' &&
    result.attackerIntent && typeof result.attackerIntent.prediction === 'object' &&
    result.defenderIntent && typeof result.defenderIntent.movement === 'object';
});

test('接口 - 解围返回完整意图信息', () => {
  const defender = {
    空中能力: 14, 对抗: 14, 冷静导向: 14,
    足球理解: 15
  };
  const context = { ballHeight: 0.8, intent: 'clearance', pressure: 0.3, fatigue: 0 };

  const result = contest(CONTEST_TYPES.aerial, defender, null, context);

  return assert(result.type === 'clearance', '类型应为clearance') &&
    typeof result.success === 'number' &&
    result.prediction && typeof result.prediction.predictionQuality === 'number';
});

// ============================================================
// 测试报告
// ============================================================
console.log(`\n========================================`);
console.log(`Contest模块第二轮测试完成: ${passed}/${passed + failed} 通过`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
