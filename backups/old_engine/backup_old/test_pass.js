// ============================================================
// 传球测试 — 连续逻辑，distance+pressure+passType
// 数据校准版：2026年6月
// ============================================================
const { PASS_TYPES, pass } = require('./pass.js');

console.log('═══════════════════════════════════════════');
console.log('  传球模块测试（distance+pressure+passType）');
console.log('═══════════════════════════════════════════\n');

const passers = {
  top:    { touch: 20, power: 19, vision: 18 },
  elite:  { touch: 18, power: 17, vision: 16 },
  high:   { touch: 16, power: 15, vision: 14 },
  medium: { touch: 10, power: 10, vision: 10 },
  low:    { touch: 7,  power: 7,  vision: 7 },
  powerType:   { touch: 8, power: 16, vision: 10 },
  precType:    { touch: 16, power: 8, vision: 12 },
};

const defMed = { marking: 10, burst: 10, positioning: 10 };

// ── 1. 距离梯度（无压力，普通传球） ──
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 距离梯度（无压力，normal）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const distances = [5, 10, 15, 20, 30, 40, 60, 90];
console.log('  距离'.padEnd(8) + 'elite'.padEnd(12) + 'medium'.padEnd(12) + 'low'.padEnd(12));
for (const d of distances) {
  const ctx = { distance: d, pressure: 0, fatigue: 0 };
  const row = `${d}m`.padEnd(8) +
    (pass(passers.elite, PASS_TYPES.normal, ctx, defMed).successProb*100).toFixed(1)+'%'.padEnd(12) +
    (pass(passers.medium, PASS_TYPES.normal, ctx, defMed).successProb*100).toFixed(1)+'%'.padEnd(12) +
    (pass(passers.low, PASS_TYPES.normal, ctx, defMed).successProb*100).toFixed(1)+'%'.padEnd(12);
  console.log(`  ${row}`);
}

// ── 2. 压力梯度 ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('2. 压力梯度（15m，高属性球员，normal）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const pressures = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
console.log('  pressure'.padEnd(12) + '质量'.padEnd(10) + '拦截'.padEnd(10) + '成功');
for (const p of pressures) {
  const ctx = { distance: 15, pressure: p, fatigue: 0 };
  const r = pass(passers.high, PASS_TYPES.normal, ctx, defMed);
  const row = `${(p*100).toFixed(0)}%`.padEnd(12) +
    `${(r.quality*100).toFixed(1)}%`.padEnd(10) +
    `${(r.interceptProb*100).toFixed(1)}%`.padEnd(10) +
    `${(r.successProb*100).toFixed(1)}%`;
  console.log(`  ${row}`);
}

// ── 3. 传球类型对比 ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('3. 传球方式对比（高属性，15m，压力0.3）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const ctx3 = { distance: 15, pressure: 0.3, fatigue: 0 };
for (const [key, type] of Object.entries(PASS_TYPES)) {
  const r = pass(passers.high, type, ctx3, defMed);
  console.log(`  ${key.padEnd(8)} 质量${(r.quality*100).toFixed(1)}% 拦截${(r.interceptProb*100).toFixed(1)}% → 成功${(r.successProb*100).toFixed(1)}%`);
}

// ── 4. 力量型 vs 精度型（不同距离） ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('4. 力量型 vs 精度型 vs 全距离');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('  距离'.padEnd(8) + '力量型'.padEnd(12) + '精度型'.padEnd(12));
for (const d of [5, 10, 20, 40, 60, 90]) {
  const ctx = { distance: d, pressure: 0, fatigue: 0 };
  const row = `${d}m`.padEnd(8) +
    (pass(passers.powerType, PASS_TYPES.normal, ctx, defMed).successProb*100).toFixed(1)+'%'.padEnd(12) +
    (pass(passers.precType, PASS_TYPES.normal, ctx, defMed).successProb*100).toFixed(1)+'%'.padEnd(12);
  console.log(`  ${row}`);
}

// ── 5. 长传场景 ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('5. 长传（无压力，pass type=long）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

for (const [lvl, p] of Object.entries(passers)) {
  const ctx = { distance: 40, pressure: 0, fatigue: 0 };
  const r = pass(p, PASS_TYPES.long, ctx, defMed);
  console.log(`  ${lvl.padEnd(10)} 质量${(r.quality*100).toFixed(1)}% 成功${(r.successProb*100).toFixed(1)}%`);
}

// ═══════════════════════════════════════════
// 关键指标验证（对照现实数据）
// ═══════════════════════════════════════════
console.log('\n\n═══════════════════════════════════════════');
console.log('  关键指标验证（对照现实数据）');
console.log('═══════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

function check(label, value, min, max, source) {
  const ok = value >= min && value <= max;
  console.log(`${ok?'✓':'✗'} ${label}: ${(value*100).toFixed(1)}% (${(min*100).toFixed(0)}-${(max*100).toFixed(0)}%) [${source}]`);
  if (ok) passCount++; else failCount++;
}

// 1. 平均传球成功率 ≈83.5%（StatsBomb）
const v1 = pass(passers.medium, PASS_TYPES.normal, { distance: 15, pressure: 0.2, fatigue: 0 }, defMed).successProb;
check('中等传球15m', v1, 0.74, 0.88, 'StatsBomb avg 83.5%（含大量短传拉升）');

// 2. 短传5m >90%
const v2 = pass(passers.high, PASS_TYPES.normal, { distance: 5, pressure: 0, fatigue: 0 }, defMed).successProb;
check('高属性短传5m', v2, 0.90, 0.99, '顶级短传>90%');

// 3. 长传40m 精英70%+
const v3 = pass(passers.elite, PASS_TYPES.long, { distance: 40, pressure: 0, fatigue: 0 }, defMed).successProb;
check('精英长传40m', v3, 0.65, 0.85, '精英长传>65%');

// 4. 长传40m 平均 <50%
const v4 = pass(passers.medium, PASS_TYPES.long, { distance: 40, pressure: 0, fatigue: 0 }, defMed).successProb;
check('平均长传40m', v4, 0.30, 0.55, '平均长传<55%');

// 5. 力量型 vs 精度型 40m
const v5power = pass(passers.powerType, PASS_TYPES.long, { distance: 40, pressure: 0, fatigue: 0 }, defMed).successProb;
const v5prec = pass(passers.precType, PASS_TYPES.long, { distance: 40, pressure: 0, fatigue: 0 }, defMed).successProb;
console.log(`${v5power > v5prec ? '✓' : '✗'} 力量型>精度型(40m): ${(v5power*100).toFixed(1)}% vs ${(v5prec*100).toFixed(1)}% [长传需要力量]`);
if (v5power > v5prec) passCount++; else failCount++;

// 6. 精度型>力量型 5m
const v6power = pass(passers.powerType, PASS_TYPES.normal, { distance: 5, pressure: 0, fatigue: 0 }, defMed).successProb;
const v6prec = pass(passers.precType, PASS_TYPES.normal, { distance: 5, pressure: 0, fatigue: 0 }, defMed).successProb;
console.log(`${v6prec > v6power ? '✓' : '✗'} 精度型>力量型(5m): ${(v6prec*100).toFixed(1)}% vs ${(v6power*100).toFixed(1)}% [短传靠精度]`);
if (v6prec > v6power) passCount++; else failCount++;

// 7. 压力降低成功率
const v7a = pass(passers.high, PASS_TYPES.normal, { distance: 15, pressure: 0, fatigue: 0 }, defMed).successProb;
const v7b = pass(passers.high, PASS_TYPES.normal, { distance: 15, pressure: 0.8, fatigue: 0 }, defMed).successProb;
check('压力差', v7a - v7b, 0.10, 0.35, `无压${(v7a*100).toFixed(1)}% vs 高压${(v7b*100).toFixed(1)}%`);

// 8. 安全传球抗压
const v8a = pass(passers.medium, PASS_TYPES.safe, { distance: 10, pressure: 0.8, fatigue: 0 }, defMed).successProb;
const v8b = pass(passers.medium, PASS_TYPES.risky, { distance: 10, pressure: 0.8, fatigue: 0 }, defMed).successProb;
console.log(`${v8a > v8b ? '✓' : '✗'} 安全>冒险(高压10m): ${(v8a*100).toFixed(1)}% vs ${(v8b*100).toFixed(1)}%`);
if (v8a > v8b) passCount++; else failCount++;

// 9. 超长传 90m >20%
const v9 = pass(passers.elite, PASS_TYPES.long, { distance: 90, pressure: 0, fatigue: 0 }, defMed).successProb;
check('精英超长传90m', v9, 0.15, 0.45, '偏远长传仍有威胁');

console.log(`\n═══════════════════════════════════════`);
console.log(`通过: ${passCount}/${passCount+failCount}`);
console.log(`═══════════════════════════════════════`);
console.log('\n=== 测试完成 ===');
