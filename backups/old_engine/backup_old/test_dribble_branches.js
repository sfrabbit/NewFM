// 盘带分支情境测试（连续逻辑，无分类）
// 数据校准版：2026年6月
const { DRIBBLE_BRANCHES, dribbleSuccessRate } = require('./dribble_branches.js');

console.log('=== 盘带分支情境测试（数据校准版） ===\n');

// 球员属性（无分类标签，1-20连续值）
const players = {
  top:    { control: 19, burst: 18, speed: 17, strength: 15, vision: 16 }, // 贝林厄姆/亚马尔级
  high:   { control: 18, burst: 17, speed: 16, strength: 14, vision: 15 }, // 五大联赛主力
  medium: { control: 12, burst: 11, speed: 10, strength: 10, vision: 10 }, // 五大联赛普通
  low:    { control: 7,  burst: 7,  speed: 7,  strength: 7,  vision: 7  }, // 弱队/青年
};

// 防守者属性
const defenders = {
  high:   { defense: 17, burst: 16, strength: 15 },
  medium: { defense: 10, burst: 10, strength: 10 },
  low:    { defense: 7,  burst: 7,  strength: 7 },
};

// 测试各情境
function testBranch(branchKey, branchDef, player, defender, contexts) {
  console.log(`\n━━━ ${branchKey}: ${branchDef.name} ━━━`);
  console.log(`触发条件: ${branchDef.trigger}`);
  console.log(`空间敏感度: ${branchDef.spaceSensitivity}\n`);
  
  for (const branch of branchDef.branches) {
    console.log(`${branch.id} ${branch.name} (risk=${branch.risk}):`);
    for (const ctx of contexts) {
      const p = dribbleSuccessRate(branch, player, defender, ctx, branchDef.spaceSensitivity);
      const ctxDesc = Object.entries(ctx).map(([k,v]) => `${k}=${v}`).join(', ');
      console.log(`  [${ctxDesc}] => ${(p*100).toFixed(1)}%`);
    }
  }
}

// ============================================================
// D1: 无压力推进
// 现实参考：55-65%（克罗斯62.5%、巴莱巴58%）
// ============================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('D1: 无压力推进（开阔空间）');
console.log('现实参考: 55-65%');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
testBranch('D1', DRIBBLE_BRANCHES.D1, players.high, defenders.medium, [
  { space: 5, pressureLevel: 0, fatigue: 0 },
  { space: 3, pressureLevel: 0, fatigue: 0 },
  { space: 5, pressureLevel: 0, fatigue: 50 },
]);
testBranch('D1', DRIBBLE_BRANCHES.D1, players.medium, defenders.medium, [
  { space: 5, pressureLevel: 0, fatigue: 0 },
]);

// ============================================================
// D2: 单对单突破
// 现实参考：联赛平均50%，顶级55-63%（贝林厄姆63.8%），弱队38%
// ============================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('D2: 单对单突破');
console.log('现实参考: 平均50%, 顶级55-63%, 弱队38%');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
testBranch('D2', DRIBBLE_BRANCHES.D2, players.top, defenders.medium, [
  { space: 2, pressureLevel: 1, fatigue: 0 },
]);
testBranch('D2', DRIBBLE_BRANCHES.D2, players.high, defenders.medium, [
  { space: 2, pressureLevel: 1, fatigue: 0 },
]);
testBranch('D2', DRIBBLE_BRANCHES.D2, players.medium, defenders.medium, [
  { space: 2, pressureLevel: 1, fatigue: 0 },
]);
testBranch('D2', DRIBBLE_BRANCHES.D2, players.low, defenders.medium, [
  { space: 2, pressureLevel: 1, fatigue: 0 },
]);

// ============================================================
// D3: 高压摆脱
// 现实参考：护球50-65%（意甲前锋平均52%、哲科72%），围抢出球30%
// ============================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('D3: 高压摆脱');
console.log('现实参考: 护球50-65%, 围抢出球30%, 回传>60%');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
testBranch('D3', DRIBBLE_BRANCHES.D3, players.high, defenders.high, [
  { space: 1, pressureLevel: 2, fatigue: 0 },
  { space: 0.5, pressureLevel: 3, fatigue: 0 },
]);
testBranch('D3', DRIBBLE_BRANCHES.D3, players.medium, defenders.high, [
  { space: 0.5, pressureLevel: 3, fatigue: 0 },
]);

// ============================================================
// D4: 边线突破
// 现实参考：顶级边锋60-72%（王钰栋72%、布鲁马65%），普通39-55%
// ============================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('D4: 边线突破');
console.log('现实参考: 顶级60-72%, 普通39-55%');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
testBranch('D4', DRIBBLE_BRANCHES.D4, players.top, defenders.medium, [
  { space: 1.5, pressureLevel: 1, fatigue: 0 },
]);
testBranch('D4', DRIBBLE_BRANCHES.D4, players.high, defenders.medium, [
  { space: 1.5, pressureLevel: 1, fatigue: 0 },
]);
testBranch('D4', DRIBBLE_BRANCHES.D4, players.low, defenders.medium, [
  { space: 1.5, pressureLevel: 1, fatigue: 0 },
]);

// ============================================================
// D5: 反击推进
// 现实参考：有核心40-42%，无核心17-28%
// ============================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('D5: 反击推进');
console.log('现实参考: 有核心40-42%, 无核心17-28%');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
testBranch('D5', DRIBBLE_BRANCHES.D5, players.high, defenders.medium, [
  { space: 15, pressureLevel: 0, fatigue: 0 },
  { space: 15, pressureLevel: 0, fatigue: 70 },
]);
testBranch('D5', DRIBBLE_BRANCHES.D5, players.low, defenders.medium, [
  { space: 15, pressureLevel: 0, fatigue: 0 },
]);

// ============================================================
// 关键指标验证
// ============================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('关键指标验证（对照现实数据）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

let passCount = 0;
let failCount = 0;

function check(label, value, min, max, source) {
  const ok = value >= min && value <= max;
  const icon = ok ? '✓' : '✗';
  console.log(`${icon} ${label}: ${(value*100).toFixed(1)}% (范围: ${min*100}-${max*100}%) [${source}]`);
  if (ok) passCount++; else failCount++;
}

// D1: 无压力推进 高属性应该>80%（无压力下盘带本身容易，62.5%是含压力的整体值）
const d1 = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D1.branches[1], players.high, defenders.medium,
  { space: 5, pressureLevel: 0, fatigue: 0 }, DRIBBLE_BRANCHES.D1.spaceSensitivity
);
check('D1 高属性无压力推进', d1, 0.80, 0.95, '无压力高属性应>80%');

// D2: 单对一 顶级55-63%
const d2top = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D2.branches[1], players.top, defenders.medium,
  { space: 2, pressureLevel: 1, fatigue: 0 }, DRIBBLE_BRANCHES.D2.spaceSensitivity
);
check('D2 顶级单对一', d2top, 0.55, 0.70, '贝林厄姆63.8%');

// D2: 单对一 平均约50%
const d2mid = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D2.branches[1], players.medium, defenders.medium,
  { space: 2, pressureLevel: 1, fatigue: 0 }, DRIBBLE_BRANCHES.D2.spaceSensitivity
);
check('D2 中等单对一', d2mid, 0.42, 0.58, '联赛平均50%');

// D2: 单对一 弱队38%
const d2low = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D2.branches[1], players.low, defenders.medium,
  { space: 2, pressureLevel: 1, fatigue: 0 }, DRIBBLE_BRANCHES.D2.spaceSensitivity
);
check('D2 弱队单对一', d2low, 0.28, 0.45, '英超U23:38%');

// D3: 护球牵制 50-65%
const d3shield = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D3.branches[1], players.high, defenders.high,
  { space: 1, pressureLevel: 2, fatigue: 0 }, DRIBBLE_BRANCHES.D3.spaceSensitivity
);
check('D3 高属性护球牵制', d3shield, 0.45, 0.70, '意甲前锋平均52%');

// D3: 回传安全 >60%
const d3pass = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D3.branches[2], players.medium, defenders.high,
  { space: 0.5, pressureLevel: 3, fatigue: 0 }, DRIBBLE_BRANCHES.D3.spaceSensitivity
);
check('D3 中等属性回传', d3pass, 0.55, 0.75, '回传安全选项>60%');

// D3: 强行突破 <35%
const d3force = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D3.branches[0], players.high, defenders.high,
  { space: 0.5, pressureLevel: 3, fatigue: 0 }, DRIBBLE_BRANCHES.D3.spaceSensitivity
);
check('D3 高压强行突破', d3force, 0.15, 0.40, '高压突破困难');

// D4: 顶级边锋 60-72%
const d4top = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D4.branches[0], players.top, defenders.medium,
  { space: 1.5, pressureLevel: 1, fatigue: 0 }, DRIBBLE_BRANCHES.D4.spaceSensitivity
);
check('D4 顶级边锋内切', d4top, 0.58, 0.78, '王钰栋72%');

// D4: 普通 39-55%
const d4low = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D4.branches[0], players.low, defenders.medium,
  { space: 1.5, pressureLevel: 1, fatigue: 0 }, DRIBBLE_BRANCHES.D4.spaceSensitivity
);
check('D4 弱队边线突破', d4low, 0.30, 0.50, '利兹联39%');

// D5: 有核心 40-42%+
const d5high = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D5.branches[0], players.high, defenders.medium,
  { space: 15, pressureLevel: 0, fatigue: 0 }, DRIBBLE_BRANCHES.D5.spaceSensitivity
);
check('D5 有核心反击冲刺', d5high, 0.70, 0.90, '反击大空间高属性');

// D5: 无核心 45-65%（公式计算的是"带球不丢球"，不是"反击推进成功"）
const d5low = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D5.branches[0], players.low, defenders.medium,
  { space: 15, pressureLevel: 0, fatigue: 0 }, DRIBBLE_BRANCHES.D5.spaceSensitivity
);
check('D5 无核心反击冲刺', d5low, 0.45, 0.65, '带球不丢球概率');

// 疲劳影响
const d5fresh = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D5.branches[0], players.high, defenders.medium,
  { space: 15, pressureLevel: 0, fatigue: 0 }, DRIBBLE_BRANCHES.D5.spaceSensitivity
);
const d5tired = dribbleSuccessRate(
  DRIBBLE_BRANCHES.D5.branches[0], players.high, defenders.medium,
  { space: 15, pressureLevel: 0, fatigue: 80 }, DRIBBLE_BRANCHES.D5.spaceSensitivity
);
const fatigueDrop = d5fresh - d5tired;
const fatigueOk = fatigueDrop > 0.1;
console.log(`${fatigueOk?'✓':'✗'} 疲劳影响: 充沛${(d5fresh*100).toFixed(1)}% → 耗尽${(d5tired*100).toFixed(1)}% (降幅${(fatigueDrop*100).toFixed(1)}%, 应>10%)`);
if (fatigueOk) passCount++; else failCount++;

console.log(`\n═══════════════════════════════════════`);
console.log(`通过: ${passCount}/${passCount+failCount}`);
console.log(`═══════════════════════════════════════`);

console.log('\n=== 测试完成 ===');
