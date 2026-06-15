// ============================================================
// Tackle模块测试 — 第二轮修改验证
// ============================================================
// 验证点：
//   1. 意图判断层：对手识别影响线索读取
//   2. 预判机制：预判正确性影响抢断成功率
//   3. 时机选择：足球理解+决断速度影响时机
//   4. 物理层：脚速 vs 移球速度
//   5. 犯规概率：时机差增加犯规率
// ============================================================

const {
  tackle,
  tackleWinProb,
  tackleFoulProb,
  readCarrierClues,
  anticipateCarrierAction,
  chooseTackleTiming
} = require('../tackle');

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
// 测试1：意图判断层 - 对手识别影响线索读取
// ============================================================
test('线索读取 - 高对手识别提高线索质量', () => {
  const highRecog = { 对手识别: 18, 足球理解: 12 };
  const lowRecog = { 对手识别: 8, 足球理解: 12 };
  const context = {};

  const highClues = readCarrierClues(highRecog, context);
  const lowClues = readCarrierClues(lowRecog, context);

  return assert(highClues.clueQuality > lowClues.clueQuality,
    `高对手识别应提高线索质量: 高${highClues.clueQuality.toFixed(2)} vs 低${lowClues.clueQuality.toFixed(2)}`);
});

test('线索读取 - 足球理解影响线索解读', () => {
  const highUnderstanding = { 对手识别: 12, 足球理解: 18 };
  const lowUnderstanding = { 对手识别: 12, 足球理解: 8 };
  const context = {};

  const highClues = readCarrierClues(highUnderstanding, context);
  const lowClues = readCarrierClues(lowUnderstanding, context);

  return assert(highClues.clueInterpretation > lowClues.clueInterpretation,
    `高足球理解应提高线索解读能力`);
});

// ============================================================
// 测试2：预判机制
// ============================================================
test('预判 - 高线索质量提高预判成功率', () => {
  const highRecog = { 对手识别: 18, 足球理解: 18, 决断速度: 15 };
  const lowRecog = { 对手识别: 8, 足球理解: 8, 决断速度: 15 };
  const context = {};

  let highCorrect = 0, lowCorrect = 0;
  const trials = 100;

  for (let i = 0; i < trials; i++) {
    const highResult = anticipateCarrierAction(highRecog, context);
    const lowResult = anticipateCarrierAction(lowRecog, context);
    if (highResult.isCorrect) highCorrect++;
    if (lowResult.isCorrect) lowCorrect++;
  }

  const highRate = highCorrect / trials;
  const lowRate = lowCorrect / trials;

  return assert(highRate > lowRate,
    `高属性应提高预判成功率: 高${(highRate * 100).toFixed(1)}% vs 低${(lowRate * 100).toFixed(1)}%`);
});

// ============================================================
// 测试3：时机选择
// ============================================================
test('时机选择 - 足球理解+决断速度影响时机', () => {
  const goodTiming = { 足球理解: 16, 决断速度: 16, 对手识别: 15 };
  const poorTiming = { 足球理解: 8, 决断速度: 8, 对手识别: 15 };
  const context = {};

  const anticipation = { isCorrect: true };

  const goodResult = chooseTackleTiming(goodTiming, context, anticipation);
  const poorResult = chooseTackleTiming(poorTiming, context, anticipation);

  return assert(goodResult.bonus >= poorResult.bonus,
    `好时机的奖励应>=差时机: 好${goodResult.bonus.toFixed(2)} vs 差${poorResult.bonus.toFixed(2)}`);
});

// ============================================================
// 测试4：综合抢断 - 预判正确性影响结果
// ============================================================
test('抢断 - 预判正确时成功率更高', () => {
  const defender = {
    防守技术: 15, 爆发: 15, 侵略性: 12,
    对手识别: 15, 足球理解: 15, 决断速度: 15
  };
  const carrier = {
    控制技巧: 12, 对抗: 12, 冷静导向: 12
  };

  let correctWins = 0, wrongWins = 0;
  let correctCount = 0, wrongCount = 0;

  for (let i = 0; i < 50; i++) {
    const result = tackleWinProb(defender, carrier, {});

    if (result.anticipation.isCorrect) {
      correctWins += result.winProb;
      correctCount++;
    } else {
      wrongWins += result.winProb;
      wrongCount++;
    }
  }

  const avgCorrect = correctCount > 0 ? correctWins / correctCount : 0;
  const avgWrong = wrongCount > 0 ? wrongWins / wrongCount : 0;

  return assert(avgCorrect > avgWrong,
    `预判正确时抢断率应更高: 正确${(avgCorrect * 100).toFixed(1)}% vs 错误${(avgWrong * 100).toFixed(1)}%`);
});

// ============================================================
// 测试5：犯规概率
// ============================================================
test('犯规 - 预判错误增加犯规率', () => {
  const defender = {
    防守技术: 12, 侵略性: 15, 足球理解: 12
  };
  const context = {};

  const correctAnticipation = { isCorrect: true };
  const wrongAnticipation = { isCorrect: false };

  const correctFoul = tackleFoulProb(defender, context, correctAnticipation);
  const wrongFoul = tackleFoulProb(defender, context, wrongAnticipation);

  return assert(wrongFoul >= correctFoul,
    `预判错误应增加犯规率: 错误${(wrongFoul * 100).toFixed(1)}% vs 正确${(correctFoul * 100).toFixed(1)}%`);
});

test('犯规 - 足球理解降低犯规率', () => {
  const highUnderstanding = { 防守技术: 12, 侵略性: 15, 足球理解: 18 };
  const lowUnderstanding = { 防守技术: 12, 侵略性: 15, 足球理解: 8 };
  const context = {};
  const anticipation = { isCorrect: true };

  const highFoul = tackleFoulProb(highUnderstanding, context, anticipation);
  const lowFoul = tackleFoulProb(lowUnderstanding, context, anticipation);

  return assert(highFoul <= lowFoul,
    `高足球理解应降低犯规率: 高${(highFoul * 100).toFixed(1)}% vs 低${(lowFoul * 100).toFixed(1)}%`);
});

// ============================================================
// 测试6：接口完整性
// ============================================================
test('接口 - 返回完整结果', () => {
  const defender = {
    防守技术: 15, 爆发: 15, 侵略性: 12,
    对手识别: 15, 足球理解: 15, 决断速度: 15
  };
  const carrier = {
    控制技巧: 12, 对抗: 12, 冷静导向: 12
  };
  const context = {};

  const result = tackle(defender, carrier, context);

  return assert(typeof result.winProb === 'number', '应有winProb') &&
    typeof result.foulProb === 'number' &&
    result.anticipation && typeof result.anticipation.isCorrect === 'boolean' &&
    result.timing && typeof result.timing.bonus === 'number' &&
    result.breakdown && typeof result.breakdown.clueQuality === 'number';
});

// ============================================================
// 测试报告
// ============================================================
console.log(`\n========================================`);
console.log(`Tackle模块第二轮测试完成: ${passed}/${passed + failed} 通过`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
