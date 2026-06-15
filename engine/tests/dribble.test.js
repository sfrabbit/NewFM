// ============================================================
// Dribble模块测试 — 第二轮修改验证
// ============================================================
// 验证点：
//   1. 阅读防守者：对手识别+足球理解影响读取
//   2. 假动作效果：控制技巧+自信影响成功率
//   3. 空间评估：足球理解影响空间感知
//   4. 突破时机：决断速度影响时机选择
//   5. 综合盘带：意图判断提升成功率
// ============================================================

const {
  dribble,
  dribbleSuccessRate,
  readDefender,
  feintEffect,
  assessSpace,
  chooseBreakthroughTiming,
  DRIBBLE_STYLES
} = require('../dribble');

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
// 测试1：阅读防守者
// ============================================================
test('阅读防守者 - 高对手识别提高重心读取', () => {
  const highRecog = { 对手识别: 18, 足球理解: 12 };
  const lowRecog = { 对手识别: 8, 足球理解: 12 };
  const context = {};

  const highRead = readDefender(highRecog, context);
  const lowRead = readDefender(lowRecog, context);

  return assert(highRead.centerOfGravityRead > lowRead.centerOfGravityRead,
    `高对手识别应提高重心读取: 高${highRead.centerOfGravityRead.toFixed(2)} vs 低${lowRead.centerOfGravityRead.toFixed(2)}`);
});

test('阅读防守者 - 高足球理解提高姿态识别', () => {
  const highUnderstanding = { 对手识别: 12, 足球理解: 18 };
  const lowUnderstanding = { 对手识别: 12, 足球理解: 8 };
  const context = {};

  const highRead = readDefender(highUnderstanding, context);
  const lowRead = readDefender(lowUnderstanding, context);

  return assert(highRead.stanceRecognition > lowRead.stanceRecognition,
    `高足球理解应提高姿态识别`);
});

// ============================================================
// 测试2：假动作效果
// ============================================================
test('假动作 - 高控制技巧+自信提高假动作质量', () => {
  const goodFeint = { 控制技巧: 18, 自信: 18 };
  const poorFeint = { 控制技巧: 8, 自信: 8 };
  const defender = { 对手识别: 10 };
  const context = {};

  const goodResult = feintEffect(goodFeint, defender, context);
  const poorResult = feintEffect(poorFeint, defender, context);

  return assert(goodResult.feintQuality > poorResult.feintQuality,
    `高技巧+自信应提高假动作质量: 好${goodResult.feintQuality.toFixed(2)} vs 差${poorResult.feintQuality.toFixed(2)}`);
});

test('假动作 - 防守者对手识别高降低受骗概率', () => {
  const dribbler = { 控制技巧: 15, 自信: 15 };
  const smartDefender = { 对手识别: 18 };
  const poorDefender = { 对手识别: 8 };
  const context = {};

  const smartResult = feintEffect(dribbler, smartDefender, context);
  const poorResult = feintEffect(dribbler, poorDefender, context);

  return assert(smartResult.deceiveProb < poorResult.deceiveProb,
    `聪明防守者应降低受骗概率: 聪明${(smartResult.deceiveProb * 100).toFixed(1)}% vs 普通${(poorResult.deceiveProb * 100).toFixed(1)}%`);
});

// ============================================================
// 测试3：空间评估
// ============================================================
test('空间评估 - 高足球理解提高空间感知', () => {
  const highUnderstanding = { 足球理解: 18 };
  const lowUnderstanding = { 足球理解: 8 };
  const context = { space: 15 };

  const highSpace = assessSpace(highUnderstanding, context);
  const lowSpace = assessSpace(lowUnderstanding, context);

  return assert(highSpace.spatialAwareness > lowSpace.spatialAwareness,
    `高足球理解应提高空间感知: 高${highSpace.spatialAwareness.toFixed(2)} vs 低${lowSpace.spatialAwareness.toFixed(2)}`);
});

test('空间评估 - 大空间提高突破价值', () => {
  const attrs = { 足球理解: 15 };
  const smallSpace = { space: 5 };
  const largeSpace = { space: 20 };

  const smallResult = assessSpace(attrs, smallSpace);
  const largeResult = assessSpace(attrs, largeSpace);

  return assert(largeResult.breakthroughValue > smallResult.breakthroughValue,
    `大空间应提高突破价值: 大${largeResult.breakthroughValue.toFixed(2)} vs 小${smallResult.breakthroughValue.toFixed(2)}`);
});

// ============================================================
// 测试4：突破时机
// ============================================================
test('突破时机 - 高决断速度提高时机精度', () => {
  const fastDecision = { 决断速度: 18 };
  const slowDecision = { 决断速度: 8 };
  const defenderRead = { intentPrediction: 0.8 };
  const context = { pressure: 0.5 };

  const fastTiming = chooseBreakthroughTiming(fastDecision, context, defenderRead);
  const slowTiming = chooseBreakthroughTiming(slowDecision, context, defenderRead);

  return assert(fastTiming.timingPrecision > slowTiming.timingPrecision,
    `高决断速度应提高时机精度: 快${fastTiming.timingPrecision.toFixed(2)} vs 慢${slowTiming.timingPrecision.toFixed(2)}`);
});

test('突破时机 - 防守者意图前倾产生机会窗口', () => {
  const attrs = { 决断速度: 15 };
  const aggressiveDefender = { intentPrediction: 0.8 };  // 重心前倾要上抢
  const passiveDefender = { intentPrediction: 0.4 };     // 重心后移要后退
  const context = { pressure: 0.5 };

  const aggressiveTiming = chooseBreakthroughTiming(attrs, context, aggressiveDefender);
  const passiveTiming = chooseBreakthroughTiming(attrs, context, passiveDefender);

  return assert(aggressiveTiming.opportunityWindow > passiveTiming.opportunityWindow,
    `防守者前倾应产生机会窗口`);
});

// ============================================================
// 测试5：综合盘带
// ============================================================
test('盘带 - 阅读防守者提升需要读取的盘带方式', () => {
  const goodRead = {
    控制技巧: 12, 爆发: 12, 速度: 12,
    对手识别: 18, 足球理解: 18, 决断速度: 18
  };
  const poorRead = {
    控制技巧: 12, 爆发: 12, 速度: 12,
    对手识别: 8, 足球理解: 8, 决断速度: 8
  };
  const defender = { 防守技术: 12, 爆发: 12, 对抗: 12 };
  const context = { space: 15, pressure: 0.5, fatigue: 0 };

  const goodResult = dribble(goodRead, 'burst', context, defender);
  const poorResult = dribble(poorRead, 'burst', context, defender);

  return assert(goodResult.successRate > poorResult.successRate,
    `阅读能力强应提升爆发带球成功率: 好${(goodResult.successRate * 100).toFixed(1)}% vs 差${(poorResult.successRate * 100).toFixed(1)}%`);
});

test('盘带 - 假动作成功大幅提升成功率', () => {
  // 多次测试取平均
  let successWithFeint = 0;
  let trials = 20;

  const dribbler = {
    控制技巧: 16, 爆发: 14, 自信: 16,
    对手识别: 15, 足球理解: 15, 决断速度: 15
  };
  const defender = { 防守技术: 12, 爆发: 12, 对抗: 12, 对手识别: 10 };
  const context = { space: 12, pressure: 0.6, fatigue: 0 };

  for (let i = 0; i < trials; i++) {
    const result = dribble(dribbler, 'feint', context, defender);
    successWithFeint += result.successRate;
  }

  const avgSuccess = successWithFeint / trials;

  return assert(avgSuccess > 0.5,
    `假动作盘带平均成功率应>50%: ${(avgSuccess * 100).toFixed(1)}%`);
});

// ============================================================
// 测试6：接口完整性
// ============================================================
test('接口 - 返回完整意图信息', () => {
  const dribbler = {
    控制技巧: 14, 爆发: 14, 速度: 14,
    对手识别: 15, 足球理解: 15, 决断速度: 15
  };
  const defender = { 防守技术: 12, 爆发: 12, 对抗: 12 };
  const context = { space: 15, pressure: 0.5, fatigue: 0 };

  const result = dribble(dribbler, 'burst', context, defender);

  return assert(typeof result.successRate === 'number', '应有successRate') &&
    result.intent && typeof result.intent.defenderRead === 'object' &&
    result.intent.space && typeof result.intent.space.breakthroughValue === 'number' &&
    result.intent.timing && typeof result.intent.timing.timingQuality === 'number';
});

// ============================================================
// 测试报告
// ============================================================
console.log(`\n========================================`);
console.log(`Dribble模块第二轮测试完成: ${passed}/${passed + failed} 通过`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
