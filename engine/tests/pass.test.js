// ============================================================
// Pass模块测试 — 第二轮修改验证
// ============================================================
// 验证点：
//   1. 环境扫描：足球理解+集中力影响扫描质量
//   2. 防守漏洞识别：扫描质量+足球理解+对手识别
//   3. 队友跑位预判：队友识别+默契度
//   4. 传球时机：决断速度影响犹豫惩罚
//   5. 综合传球：意图判断提升传球成功率
// ============================================================

const {
  pass,
  passQuality,
  interceptProbability,
  scanEnvironment,
  identifyDefensiveGap,
  anticipateTeammateRun,
  choosePassTiming,
  PASS_TYPES
} = require('../pass');

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
// 测试1：环境扫描
// ============================================================
test('环境扫描 - 高足球理解提高扫描质量', () => {
  const highUnderstanding = { 足球理解: 18, 集中力: 12 };
  const lowUnderstanding = { 足球理解: 8, 集中力: 12 };
  const context = { fatigue: 0 };

  const highScan = scanEnvironment(highUnderstanding, context);
  const lowScan = scanEnvironment(lowUnderstanding, context);

  return assert(highScan.scanQuality > lowScan.scanQuality,
    `高足球理解应提高扫描质量: 高${highScan.scanQuality.toFixed(2)} vs 低${lowScan.scanQuality.toFixed(2)}`);
});

test('环境扫描 - 疲劳降低扫描效果', () => {
  const attrs = { 足球理解: 15, 集中力: 15 };
  const freshContext = { fatigue: 0 };
  const tiredContext = { fatigue: 80 };

  const freshScan = scanEnvironment(attrs, freshContext);
  const tiredScan = scanEnvironment(attrs, tiredContext);

  return assert(freshScan.effectiveScan > tiredScan.effectiveScan,
    `疲劳应降低扫描效果: 新鲜${freshScan.effectiveScan.toFixed(2)} vs 疲劳${tiredScan.effectiveScan.toFixed(2)}`);
});

// ============================================================
// 测试2：防守漏洞识别
// ============================================================
test('防守漏洞 - 高足球理解提高漏洞识别', () => {
  const attrs = { 足球理解: 18, 对手识别: 12 };
  const scan = { effectiveScan: 0.8 };
  const context = {};

  const gap = identifyDefensiveGap(attrs, context, scan);

  return assert(gap.gapRecognition > 0.5,
    `高足球理解应提高漏洞识别: ${gap.gapRecognition.toFixed(2)}`);
});

test('防守漏洞 - 高对手识别提高防守预判', () => {
  const highRecog = { 足球理解: 12, 对手识别: 18 };
  const lowRecog = { 足球理解: 12, 对手识别: 8 };
  const scan = { effectiveScan: 0.7 };
  const context = {};

  const highGap = identifyDefensiveGap(highRecog, context, scan);
  const lowGap = identifyDefensiveGap(lowRecog, context, scan);

  return assert(highGap.defenderAnticipation > lowGap.defenderAnticipation,
    `高对手识别应提高防守预判`);
});

// ============================================================
// 测试3：队友跑位预判
// ============================================================
test('跑位预判 - 高队友识别提高预判准确性', () => {
  const highRecog = { 队友识别: 18, 足球理解: 12 };
  const lowRecog = { 队友识别: 8, 足球理解: 12 };
  const context = { chemistry: 0.5 };

  const highRun = anticipateTeammateRun(highRecog, context);
  const lowRun = anticipateTeammateRun(lowRecog, context);

  return assert(highRun.effectiveAnticipation > lowRun.effectiveAnticipation,
    `高队友识别应提高跑位预判: 高${highRun.effectiveAnticipation.toFixed(2)} vs 低${lowRun.effectiveAnticipation.toFixed(2)}`);
});

test('跑位预判 - 默契度影响预判', () => {
  const attrs = { 队友识别: 12, 足球理解: 12 };
  const lowChemistry = { chemistry: 0.2 };
  const highChemistry = { chemistry: 0.9 };

  const lowRun = anticipateTeammateRun(attrs, lowChemistry);
  const highRun = anticipateTeammateRun(attrs, highChemistry);

  return assert(highRun.effectiveAnticipation > lowRun.effectiveAnticipation,
    `高默契度应提高预判准确性`);
});

// ============================================================
// 测试4：传球时机
// ============================================================
test('传球时机 - 高决断速度减少决策时间', () => {
  const fastDecision = { 决断速度: 18, 集中力: 12 };
  const slowDecision = { 决断速度: 8, 集中力: 12 };
  const scan = { effectiveScan: 0.7 };
  const context = { pressure: 0.3 };

  const fastTiming = choosePassTiming(fastDecision, context, scan);
  const slowTiming = choosePassTiming(slowDecision, context, scan);

  return assert(fastTiming.decisionTime < slowTiming.decisionTime,
    `高决断速度应减少决策时间: 快${fastTiming.decisionTime.toFixed(3)}s vs 慢${slowTiming.decisionTime.toFixed(3)}s`);
});

test('传球时机 - 高压+低决断产生犹豫', () => {
  const lowDecision = { 决断速度: 8, 集中力: 12 };
  const scan = { effectiveScan: 0.7 };
  const highPressure = { pressure: 0.8 };
  const lowPressure = { pressure: 0.2 };

  const highPresTiming = choosePassTiming(lowDecision, highPressure, scan);
  const lowPresTiming = choosePassTiming(lowDecision, lowPressure, scan);

  return assert(highPresTiming.hesitation > lowPresTiming.hesitation,
    `高压+低决断应产生犹豫惩罚`);
});

// ============================================================
// 测试5：综合传球
// ============================================================
test('传球 - 意图判断优势提高传球质量', () => {
  const goodIntent = {
    触球精度: 12, 力量输出: 12,
    足球理解: 18, 队友识别: 18, 对手识别: 18, 决断速度: 18, 集中力: 18
  };
  const poorIntent = {
    触球精度: 12, 力量输出: 12,
    足球理解: 8, 队友识别: 8, 对手识别: 8, 决断速度: 8, 集中力: 8
  };
  const context = { distance: 15, pressure: 0.5, fatigue: 0, chemistry: 0.5 };

  const goodResult = pass(goodIntent, 'normal', context, null);
  const poorResult = pass(poorIntent, 'normal', context, null);

  return assert(goodResult.quality > poorResult.quality,
    `意图判断优势应提高传球质量: 好${(goodResult.quality * 100).toFixed(1)}% vs 差${(poorResult.quality * 100).toFixed(1)}%`);
});

test('传球 - 视野好降低被拦截概率', () => {
  const goodVision = {
    触球精度: 12, 力量输出: 12,
    足球理解: 18, 队友识别: 12, 对手识别: 18, 决断速度: 12, 集中力: 18
  };
  const poorVision = {
    触球精度: 12, 力量输出: 12,
    足球理解: 8, 队友识别: 12, 对手识别: 8, 决断速度: 12, 集中力: 8
  };
  const defender = { 防守技术: 12, 爆发: 12, 足球理解: 12 };
  const context = { distance: 15, pressure: 0.5, fatigue: 0 };

  const goodResult = pass(goodVision, 'normal', context, defender);
  const poorResult = pass(poorVision, 'normal', context, defender);

  return assert(goodResult.interceptProb < poorResult.interceptProb,
    `好视野应降低被拦截概率: 好${(goodResult.interceptProb * 100).toFixed(1)}% vs 差${(poorResult.interceptProb * 100).toFixed(1)}%`);
});

// ============================================================
// 测试6：接口完整性
// ============================================================
test('接口 - 返回完整意图信息', () => {
  const attrs = {
    触球精度: 14, 力量输出: 14,
    足球理解: 15, 队友识别: 15, 对手识别: 15, 决断速度: 15, 集中力: 15
  };
  const context = { distance: 10, pressure: 0.3, fatigue: 0, chemistry: 0.6 };

  const result = pass(attrs, 'normal', context, null);

  return assert(typeof result.quality === 'number', '应有quality') &&
    typeof result.successProb === 'number' &&
    result.intent && typeof result.intent.scan === 'object' &&
    result.intent.gap && typeof result.intent.gap.windowQuality === 'number' &&
    result.intent.run && typeof result.intent.run.effectiveAnticipation === 'number' &&
    result.intent.timing && typeof result.intent.timing.timingQuality === 'number';
});

// ============================================================
// 测试报告
// ============================================================
console.log(`\n========================================`);
console.log(`Pass模块第二轮测试完成: ${passed}/${passed + failed} 通过`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
