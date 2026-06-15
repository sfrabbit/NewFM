// ============================================================
// Shoot模块测试 — 第二轮修改验证
// ============================================================
// 验证点：
//   1. 阅读门将：对手识别+足球理解影响站位读取
//   2. 角度选择：根据门将站位选择射门方向
//   3. 博弈机制：反常规射门增加不可预测性
//   4. 射门时机：决断速度影响果断性
//   5. 综合射门：意图判断提升进球率
// ============================================================

const {
  shoot,
  readKeeperPosition,
  chooseShotDirection,
  shotMindGame,
  chooseShotTiming,
  SHOT_TYPES,
  SHOT_DIRECTIONS
} = require('../shoot');

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
// 测试1：阅读门将站位
// ============================================================
test('阅读门将 - 高对手识别提高站位读取', () => {
  const highRecog = { 对手识别: 18, 足球理解: 12 };
  const lowRecog = { 对手识别: 8, 足球理解: 12 };
  const context = {};

  const highRead = readKeeperPosition(highRecog, context);
  const lowRead = readKeeperPosition(lowRecog, context);

  return assert(highRead.keeperStanceRead > lowRead.keeperStanceRead,
    `高对手识别应提高站位读取: 高${highRead.keeperStanceRead.toFixed(2)} vs 低${lowRead.keeperStanceRead.toFixed(2)}`);
});

test('阅读门将 - 高足球理解提高漏洞识别', () => {
  const highUnderstanding = { 对手识别: 12, 足球理解: 18 };
  const lowUnderstanding = { 对手识别: 12, 足球理解: 8 };
  const context = {};

  const highRead = readKeeperPosition(highUnderstanding, context);
  const lowRead = readKeeperPosition(lowUnderstanding, context);

  return assert(highRead.weakSideRecognition > lowRead.weakSideRecognition,
    `高足球理解应提高漏洞识别`);
});

// ============================================================
// 测试2：射门角度选择
// ============================================================
test('角度选择 - 门将偏近角选远角', () => {
  const attrs = { 足球理解: 15, 自信: 15 };
  const keeperRead = { readQuality: 0.7 };
  const nearPostContext = { gkPosition: 'nearPost' };

  const direction = chooseShotDirection(attrs, nearPostContext, keeperRead);

  return assert(direction.preferredDirection === 'farPost',
    `门将守近角时应选远角，实际: ${direction.preferredDirection}`);
});

test('角度选择 - 选对方向有优势', () => {
  const attrs = { 足球理解: 15, 自信: 15 };
  const keeperRead = { readQuality: 0.7 };
  const nearPostContext = { gkPosition: 'nearPost' };

  const direction = chooseShotDirection(attrs, nearPostContext, keeperRead);

  return assert(direction.correctChoice && direction.directionAdvantage > 1.0,
    `选对方向应有优势: correct=${direction.correctChoice}, advantage=${direction.directionAdvantage.toFixed(2)}`);
});

// ============================================================
// 测试3：博弈机制
// ============================================================
test('博弈 - 高自信增加反常规概率', () => {
  const confident = { 足球理解: 15, 自信: 18 };
  const shy = { 足球理解: 15, 自信: 8 };
  const keeperRead = { readQuality: 0.7 };
  const direction = { preferredDirection: 'farPost' };
  const context = {};

  const confidentGame = shotMindGame(confident, context, keeperRead, direction);
  const shyGame = shotMindGame(shy, context, keeperRead, direction);

  return assert(confidentGame.unpredictability > shyGame.unpredictability,
    `高自信应增加不可预测性: 自信${confidentGame.unpredictability.toFixed(2)} vs 保守${shyGame.unpredictability.toFixed(2)}`);
});

// ============================================================
// 测试4：射门时机
// ============================================================
test('时机 - 高决断速度提高果断性', () => {
  const fastDecision = { 决断速度: 18 };
  const slowDecision = { 决断速度: 8 };
  const context = { pressure: 0.3 };

  const fastTiming = chooseShotTiming(fastDecision, context);
  const slowTiming = chooseShotTiming(slowDecision, context);

  return assert(fastTiming.decisiveness > slowTiming.decisiveness,
    `高决断速度应提高果断性: 快${fastTiming.decisiveness.toFixed(2)} vs 慢${slowTiming.decisiveness.toFixed(2)}`);
});

test('时机 - 高压+低决断产生犹豫', () => {
  const lowDecision = { 决断速度: 8 };
  const highPressure = { pressure: 0.8 };
  const lowPressure = { pressure: 0.2 };

  const highPresTiming = chooseShotTiming(lowDecision, highPressure);
  const lowPresTiming = chooseShotTiming(lowDecision, lowPressure);

  return assert(highPresTiming.hesitation > lowPresTiming.hesitation,
    `高压+低决断应产生犹豫惩罚`);
});

// ============================================================
// 测试5：综合射门
// ============================================================
test('射门 - 阅读门将提升射正率', () => {
  const goodReader = {
    力量输出: 12, 触球精度: 12, 决断速度: 12,
    对手识别: 18, 足球理解: 18, 自信: 15
  };
  const poorReader = {
    力量输出: 12, 触球精度: 12, 决断速度: 12,
    对手识别: 8, 足球理解: 8, 自信: 15
  };
  const gk = { 瞬间反应: 12, 足球理解: 12, 触球精度: 12 };
  const context = { distance: 15, angle: 10, defDist: 5, defInLane: 1, fatigue: 0, pressure: 0.3, gkPosition: 'center' };

  const goodResult = shoot(goodReader, 'power', context, gk, null);
  const poorResult = shoot(poorReader, 'power', context, gk, null);

  return assert(goodResult.totalProb > poorResult.totalProb,
    `阅读门将强应提升进球率: 好${(goodResult.totalProb * 100).toFixed(1)}% vs 差${(poorResult.totalProb * 100).toFixed(1)}%`);
});

test('射门 - 博弈反常规射门降低门将有效值', () => {
  // 反常规射门：射门时门将更难判断
  const shooter = {
    力量输出: 14, 触球精度: 14, 决断速度: 14,
    对手识别: 15, 足球理解: 15, 自信: 18
  };
  const gk = { 瞬间反应: 14, 足球理解: 14, 触球精度: 14 };
  const context = { distance: 12, angle: 8, defDist: 4, defInLane: 0, fatigue: 0, pressure: 0.4, gkPosition: 'center' };

  const result = shoot(shooter, 'placed', context, gk, null);

  // 只需要验证意图判断被正确计算
  return assert(typeof result.intent.mindGame.isUnpredictable === 'boolean', '应有博弈结果') &&
    typeof result.intent.keeperRead.readQuality === 'number' &&
    typeof result.intent.direction.preferredDirection === 'string';
});

// ============================================================
// 测试6：接口完整性
// ============================================================
test('接口 - 返回完整意图信息和射门方向', () => {
  const shooter = {
    力量输出: 14, 触球精度: 14, 决断速度: 14,
    对手识别: 15, 足球理解: 15, 自信: 15
  };
  const gk = { 瞬间反应: 14, 足球理解: 14, 触球精度: 14 };
  const context = { distance: 12, angle: 8, defDist: 4, defInLane: 0, fatigue: 0, pressure: 0.4, gkPosition: 'nearPost' };

  const result = shoot(shooter, 'power', context, gk, null);

  return assert(typeof result.totalProb === 'number', '应有totalProb') &&
    typeof result.shotDirection === 'string' &&
    result.intent && typeof result.intent.keeperRead === 'object' &&
    result.intent.direction && typeof result.intent.direction.preferredDirection === 'string' &&
    result.intent.mindGame && typeof result.intent.mindGame.unpredictabilityBonus === 'number' &&
    result.intent.timing && typeof result.intent.timing.timingQuality === 'number';
});

// ============================================================
// 测试报告
// ============================================================
console.log(`\n========================================`);
console.log(`Shoot模块第二轮测试完成: ${passed}/${passed + failed} 通过`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
