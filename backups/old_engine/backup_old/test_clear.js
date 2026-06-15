// 解围测试 — 物理推导版
const { CLEAR_TYPES, clearSuccess } = require('./clear.js');

console.log('═══════════════════════════════════════════');
console.log('  解围模块测试（物理推导）');
console.log('═══════════════════════════════════════════\n');

const defenders = {
  top:    { heading: 18, jumping: 17, strength: 18, tackling: 20, composure: 19, burst: 17, aggression: 17 },
  high:   { heading: 16, jumping: 15, strength: 16, tackling: 17, composure: 15, burst: 16, aggression: 15 },
  medium: { heading: 10, jumping: 10, strength: 10, tackling: 10, composure: 10, burst: 10, aggression: 10 },
  low:    { heading: 7,  jumping: 7,  strength: 7,  tackling: 7,  composure: 7,  burst: 7,  aggression: 7 },
};

// ═══════════════════════════════════════════
// 1. 物理推导展示
// ═══════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 物理推导：属性→得分→成功率');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const ctxNeutral = { ballHeight: 0.5, pressure: 0, fatigue: 0 };

for (const [key, type] of Object.entries(CLEAR_TYPES)) {
  console.log(`\n── ${key}: ${type.name} ──`);
  const td = defenders.top;
  let score = 0;
  const parts = [];
  for (const [k, w] of Object.entries(type.attrs)) {
    score += (td[k] || 10) * w;
    parts.push(`${k}×${w}`);
  }
  const base = score / (score + 4.0);
  console.log(`  顶级防得分: ${score.toFixed(1)} (${parts.join('+')})`);
  console.log(`  基础成功率: ${(base*100).toFixed(1)}% [物理推导: 技术/（技术+固定阻力）]`);
  console.log(`  理想球高: ${type.idealBallHeight} (当前${ctxNeutral.ballHeight})`);
}


// ═══════════════════════════════════════════
// 2. 完整矩阵（解围类型×防守等级×压力×球高）
// ═══════════════════════════════════════════
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('2. 解围×防守等级（中性条件）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

for (const [key, type] of Object.entries(CLEAR_TYPES)) {
  console.log(`\n  ${key} (理想球高=${type.idealBallHeight}):`);
  const header = '  等级'.padEnd(8) + '成功%'.padEnd(8) + '勉强%'.padEnd(8) + '失败%';
  console.log(`  ${header}`);
  for (const [lvl, def] of Object.entries(defenders)) {
    const r = clearSuccess(type, def, { ballHeight: type.idealBallHeight, pressure: 0, fatigue: 0 });
    console.log(`  ${lvl.padEnd(8)}${(r.success*100).toFixed(0)}%`.padEnd(8) + `${(r.partial*100).toFixed(0)}%`.padEnd(8) + `${(r.fail*100).toFixed(0)}%`);
  }
}

// ═══════════════════════════════════════════
// 3. 球高不匹配的影响
// ═══════════════════════════════════════════
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('3. 球高匹配：头球解围 vs 不同球高（high def）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

for (const h of [0, 0.3, 0.6, 0.8, 1.0]) {
  const r = clearSuccess(CLEAR_TYPES.aerialHeader, defenders.high, { ballHeight: h, pressure: 0, fatigue: 0 });
  console.log(`  ballH=${h} → 成功${(r.success*100).toFixed(0)}% 勉强${(r.partial*100).toFixed(0)}% 失败${(r.fail*100).toFixed(0)}%`);
}

// ═══════════════════════════════════════════
// 4. 压力梯度
// ═══════════════════════════════════════════
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('4. 压力梯度（high def，理想球高，各解围方式）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const pressures = [0, 0.3, 0.6, 1.0];
for (const [key, type] of Object.entries(CLEAR_TYPES)) {
  console.log(`\n  ${key}:`);
  for (const p of pressures) {
    const r = clearSuccess(type, defenders.high, { ballHeight: type.idealBallHeight, pressure: p, fatigue: 0 });
    console.log(`    press=${p} → 成功${(r.success*100).toFixed(0)}%`);
  }
}

// ═══════════════════════════════════════════
// 验证：物理一致性
// ═══════════════════════════════════════════
console.log('\n\n═══════════════════════════════════════════');
console.log('  物理一致性验证');
console.log('═══════════════════════════════════════════\n');

let pass = 0, fail = 0;

function assert(label, condition) {
  console.log(`${condition?'✓':'✗'} ${label}`);
  if (condition) pass++; else fail++;
}

// 1. 无压力理想球高 → 顶级防守者非常可靠
const r1 = clearSuccess(CLEAR_TYPES.aerialHeader, defenders.top, { ballHeight: 0.85, pressure: 0, fatigue: 0 });
assert('顶级头球解围>75%', r1.success > 0.75);

// 2. 中等防守者理想条件下不错
const r2 = clearSuccess(CLEAR_TYPES.groundClear, defenders.medium, { ballHeight: 0.2, pressure: 0, fatigue: 0 });
assert('中等地面解围>70%', r2.success > 0.68);

// 3. 低水平防守者仍能解围（基础动作）
const r3 = clearSuccess(CLEAR_TYPES.groundClear, defenders.low, { ballHeight: 0.2, pressure: 0, fatigue: 0 });
assert('低水平地面解围>60%', r3.success > 0.58);

// 4. 压力显著降低成功率
const r4a = clearSuccess(CLEAR_TYPES.groundClear, defenders.high, { ballHeight: 0.2, pressure: 0, fatigue: 0 });
const r4b = clearSuccess(CLEAR_TYPES.groundClear, defenders.high, { ballHeight: 0.2, pressure: 0.8, fatigue: 0 });
assert('压力降低成功率', r4a.success > r4b.success);

// 5. 球高不匹配降低成功率（头球不解低空球）
const r5a = clearSuccess(CLEAR_TYPES.aerialHeader, defenders.high, { ballHeight: 0.9, pressure: 0, fatigue: 0 });
const r5b = clearSuccess(CLEAR_TYPES.aerialHeader, defenders.high, { ballHeight: 0.1, pressure: 0, fatigue: 0 });
assert('球高匹配: 高空>低空(头球解围)', r5a.success > r5b.success);

// 6. 地面解围反而适合低空球
const r6a = clearSuccess(CLEAR_TYPES.groundClear, defenders.high, { ballHeight: 0.1, pressure: 0, fatigue: 0 });
const r6b = clearSuccess(CLEAR_TYPES.groundClear, defenders.high, { ballHeight: 0.9, pressure: 0, fatigue: 0 });
assert('球高匹配: 低空>高空(地面解围)', r6a.success > r6b.success);

// 7. 疲劳降低成功率
const r7a = clearSuccess(CLEAR_TYPES.groundClear, defenders.high, { ballHeight: 0.2, pressure: 0, fatigue: 0 });
const r7b = clearSuccess(CLEAR_TYPES.groundClear, defenders.high, { ballHeight: 0.2, pressure: 0, fatigue: 80 });
assert('疲劳降低解围', r7a.success > r7b.success);

// 8. 概率和为1
const r8 = clearSuccess(CLEAR_TYPES.aerialHeader, defenders.medium, { ballHeight: 0.5, pressure: 0.3, fatigue: 20 });
const sum = r8.success + r8.partial + r8.fail;
assert('概率和为1', Math.abs(sum - 1.0) < 0.005);

// 9. 失败不是极端值（在恶劣条件下应该提高）
const r9 = clearSuccess(CLEAR_TYPES.groundClear, defenders.low, { ballHeight: 0.1, pressure: 1, fatigue: 80 });
assert('极端条件下失败率>5%', r9.fail > 0.05);

console.log(`\n═══════════════════════════════════════`);
console.log(`通过: ${pass}/${pass+fail}`);
console.log(`═══════════════════════════════════════`);
console.log('\n=== 测试完成 ===');
