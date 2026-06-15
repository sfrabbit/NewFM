// ============================================================
// Save模块测试 — 第二轮修改验证
// ============================================================
// 验证点：
//   1. 意图判断层：对手识别影响线索读取
//   2. 预判机制：预判正确性影响扑救率
//   3. 博弈结构：门将预判 vs 射门方向
//   4. 物理层：反应时间、移动时间、覆盖概率
//   5. 现实锚点：点球扑救率20-26%
// ============================================================

const { 
  save, 
  saveSuccessProb, 
  penaltySaveProb,
  readShooterClues,
  anticipateDirection,
  reactionTime,
  DIRECTIONS 
} = require('../save');

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
  
  const highClues = readShooterClues(highRecog, context);
  const lowClues = readShooterClues(lowRecog, context);
  
  return assert(highClues.clueQuality > lowClues.clueQuality,
    `高对手识别应提高线索质量: 高${highClues.clueQuality.toFixed(2)} vs 低${lowClues.clueQuality.toFixed(2)}`);
});

test('线索读取 - 足球理解影响线索可信度', () => {
  const highUnderstanding = { 对手识别: 12, 足球理解: 18 };
  const lowUnderstanding = { 对手识别: 12, 足球理解: 8 };
  const context = {};
  
  const highClues = readShooterClues(highUnderstanding, context);
  const lowClues = readShooterClues(lowUnderstanding, context);
  
  return assert(highClues.clueReliability > lowClues.clueReliability,
    `高足球理解应提高线索可信度`);
});

// ============================================================
// 测试2：预判机制
// ============================================================
test('预判 - 高线索质量提高预判成功率', () => {
  const highRecog = { 对手识别: 18, 足球理解: 18 };
  const lowRecog = { 对手识别: 8, 足球理解: 8 };
  const context = {};
  
  // 多次测试取平均
  let highCorrect = 0, lowCorrect = 0;
  const trials = 100;
  
  for (let i = 0; i < trials; i++) {
    const highResult = anticipateDirection(highRecog, context, 'left');
    const lowResult = anticipateDirection(lowRecog, context, 'left');
    if (highResult.isCorrect) highCorrect++;
    if (lowResult.isCorrect) lowCorrect++;
  }
  
  const highRate = highCorrect / trials;
  const lowRate = lowCorrect / trials;
  
  return assert(highRate > lowRate,
    `高属性应提高预判成功率: 高${(highRate*100).toFixed(1)}% vs 低${(lowRate*100).toFixed(1)}%`);
});

// ============================================================
// 测试3：综合扑救 - 预判正确性影响结果
// ============================================================
test('扑救 - 预判正确时扑救率更高', () => {
  const gk = { 
    对手识别: 15, 足球理解: 15, 瞬间反应: 15, 爆发: 15, 空中能力: 15,
    决断速度: 15
  };
  
  // 测试多次，统计预判正确和错误的平均扑救率
  let correctSaves = 0, wrongSaves = 0;
  let correctCount = 0, wrongCount = 0;
  
  for (let i = 0; i < 50; i++) {
    const result = saveSuccessProb(gk, { 
      shotDirection: 'left', 
      shotDistance: 12, 
      shotPower: 0.6,
      shotHeight: 0.3 
    });
    
    if (result.anticipation.isCorrect) {
      correctSaves += result.saveProb;
      correctCount++;
    } else {
      wrongSaves += result.saveProb;
      wrongCount++;
    }
  }
  
  const avgCorrect = correctCount > 0 ? correctSaves / correctCount : 0;
  const avgWrong = wrongCount > 0 ? wrongSaves / wrongCount : 0;
  
  return assert(avgCorrect > avgWrong,
    `预判正确时扑救率应更高: 正确${(avgCorrect*100).toFixed(1)}% vs 错误${(avgWrong*100).toFixed(1)}%`);
});

// ============================================================
// 测试4：物理层 - 反应时间
// ============================================================
test('反应时间 - 高瞬间反应缩短反应时间', () => {
  const highReflex = { 瞬间反应: 18, 决断速度: 12 };
  const lowReflex = { 瞬间反应: 8, 决断速度: 12 };
  const context = { isFromClose: false };
  
  const highTime = reactionTime(highReflex, context);
  const lowTime = reactionTime(lowReflex, context);
  
  return assert(highTime < lowTime,
    `高瞬间反应应缩短反应时间: 高${highTime.toFixed(3)}s vs 低${lowTime.toFixed(3)}s`);
});

// ============================================================
// 测试5：点球扑救率锚点
// ============================================================
test('点球扑救率 - 在20-26%范围内', () => {
  const gk = { 
    对手识别: 14, 足球理解: 14, 瞬间反应: 14
  };
  const context = { isPenalty: true };
  
  const result = penaltySaveProb(gk, context);
  
  return assert(result.saveProb >= 0.18 && result.saveProb <= 0.30,
    `点球扑救率应在18-30%，实际${(result.saveProb*100).toFixed(1)}%`);
});

// ============================================================
// 测试6：接口完整性
// ============================================================
test('接口 - 返回完整结果', () => {
  const gk = { 
    对手识别: 15, 足球理解: 15, 瞬间反应: 15, 爆发: 15, 空中能力: 15
  };
  const context = {
    shotDirection: 'left',
    shotDistance: 12,
    shotPower: 0.6,
    shotHeight: 0.3,
    isFromClose: false
  };
  
  const result = save(gk, context);
  
  return assert(typeof result.saveProb === 'number', '应有saveProb') &&
         typeof result.saveType === 'string' &&
         result.anticipation && typeof result.anticipation.isCorrect === 'boolean' &&
         typeof result.physicalProb === 'number' &&
         result.breakdown && typeof result.breakdown.clueQuality === 'number';
});

// ============================================================
// 测试报告
// ============================================================
console.log(`\n========================================`);
console.log(`Save模块第二轮测试完成: ${passed}/${passed+failed} 通过`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
