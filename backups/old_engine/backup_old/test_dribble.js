// ============================================================
// 盘带测试 — 连续逻辑，无情境分类
// 数据校准版：2026年6月
// ============================================================
const { DRIBBLE_STYLES, dribbleSuccessRate } = require('./dribble.js');

console.log('═══════════════════════════════════════════');
console.log('  盘带模块测试（space+pressure 连续模型）');
console.log('═══════════════════════════════════════════\n');

// ── 球员属性（1-20连续值） ──
const players = {
  top:    { control: 19, burst: 18, speed: 17, strength: 15, vision: 16, luck: 14 },
  high:   { control: 18, burst: 17, speed: 16, strength: 14, vision: 15, luck: 12 },
  medium: { control: 12, burst: 11, speed: 10, strength: 10, vision: 10, luck: 10 },
  low:    { control: 7,  burst: 7,  speed: 7,  strength: 7,  vision: 7,  luck: 7 },
};

// ── 防守者属性 ──
const defenders = {
  top:    { defense: 19, burst: 18, strength: 17 },
  high:   { defense: 17, burst: 16, strength: 15 },
  medium: { defense: 10, burst: 10, strength: 10 },
  low:    { defense: 7,  burst: 7,  strength: 7 },
};

// ── 测试各带球方式在不同 (space, pressure) 组合下的表现 ──
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 全面测试矩阵');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const scenarios = [
  { label: "开阔无压", space: 20, pressure: 0, fatigue: 0 },
  { label: "中等空间轻压", space: 5, pressure: 0.3, fatigue: 0 },
  { label: "狭小中压", space: 1.5, pressure: 0.6, fatigue: 0 },
  { label: "极限围抢", space: 0.5, pressure: 1.0, fatigue: 0 },
  { label: "开阔但疲劳", space: 20, pressure: 0, fatigue: 70 },
];

for (const [styleKey, style] of Object.entries(DRIBBLE_STYLES)) {
  console.log(`\n── ${styleKey}: ${style.name}（risk=${style.risk}, spSens=${style.spaceSensitivity}, prSens=${style.pressureSensitivity}）──`);
  for (const sc of scenarios) {
    const p = dribbleSuccessRate(style, players.high, defenders.medium, sc);
    console.log(`  ${sc.label.padEnd(12)} => ${(p*100).toFixed(1)}%`);
  }
}

// ── 不同球员等级对比 ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('2. 球员等级对比（中等空间+轻压）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const ctx2 = { space: 5, pressure: 0.3, fatigue: 0 };
for (const [styleKey, style] of Object.entries(DRIBBLE_STYLES)) {
  const results = Object.entries(players).map(([lvl, p]) =>
    `${lvl}:${(dribbleSuccessRate(style, p, defenders.medium, ctx2)*100).toFixed(0)}%`
  );
  console.log(`  ${styleKey.padEnd(8)} → ${results.join(' | ')}`);
}

// ── 不同防守者等级对比 ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('3. 防守者等级对比（高属性球员 vs 各级防守者）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
for (const [styleKey, style] of Object.entries(DRIBBLE_STYLES)) {
  const results = Object.entries(defenders).map(([lvl, d]) =>
    `${lvl}:${(dribbleSuccessRate(style, players.high, d, ctx2)*100).toFixed(0)}%`
  );
  console.log(`  ${styleKey.padEnd(8)} → ${results.join(' | ')}`);
}

// ── 压力梯度测试（固定空间） ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('4. 压力梯度（高属性球员，空间=2m²）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const pressures = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
const header = 'pressure'.padEnd(10) + Object.keys(DRIBBLE_STYLES).map(k => k.padEnd(10)).join('');
console.log(`  ${header}`);
for (const pr of pressures) {
  const row = pr.toFixed(1).padEnd(10) + Object.values(DRIBBLE_STYLES).map(s =>
    (dribbleSuccessRate(s, players.high, defenders.medium, { space: 2, pressure: pr, fatigue: 0 })*100).toFixed(1) + '%'.padEnd(10)
  ).join('');
  console.log(`  ${row}`);
}

// ── 空间梯度测试（固定压力） ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('5. 空间梯度（高属性球员，压力=0.3）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const spaces = [0.5, 1, 2, 5, 10, 20];
const header2 = 'space(m²)'.padEnd(12) + Object.keys(DRIBBLE_STYLES).map(k => k.padEnd(10)).join('');
console.log(`  ${header2}`);
for (const sp of spaces) {
  const row = sp.toString().padEnd(12) + Object.values(DRIBBLE_STYLES).map(s =>
    (dribbleSuccessRate(s, players.high, defenders.medium, { space: sp, pressure: 0.3, fatigue: 0 })*100).toFixed(1) + '%'.padEnd(10)
  ).join('');
  console.log(`  ${row}`);
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

// 1. 爆发带球：大空间无压力 → 应该很高
const v1 = dribbleSuccessRate(DRIBBLE_STYLES.burst, players.high, defenders.medium, { space: 20, pressure: 0, fatigue: 0 });
check('爆发+空旷无压', v1, 0.78, 0.95, '开阔场地高速推进容易');

// 2. 爆发带球：小空间高压 → 应该很低
const v2 = dribbleSuccessRate(DRIBBLE_STYLES.burst, players.high, defenders.high, { space: 0.5, pressure: 1, fatigue: 0 });
check('爆发+极限围抢', v2, 0.10, 0.35, '围抢下冲刺极难');

// 3. 控制带球：中等空间轻压 → 55-65%
const v3 = dribbleSuccessRate(DRIBBLE_STYLES.control, players.high, defenders.medium, { space: 5, pressure: 0.3, fatigue: 0 });
check('控制+中空间轻压', v3, 0.55, 0.75, '主力球员正常盘带');

// 4. 强行突破：1v1中等空间 → 顶级55-63%
const v4 = dribbleSuccessRate(DRIBBLE_STYLES.force, players.top, defenders.medium, { space: 3, pressure: 0.3, fatigue: 0 });
check('强突+顶级vs中防守', v4, 0.50, 0.68, '贝林厄姆63.8%');

// 5. 强行突破：弱队球员 → 低
const v5 = dribbleSuccessRate(DRIBBLE_STYLES.force, players.low, defenders.medium, { space: 3, pressure: 0.3, fatigue: 0 });
check('强突+弱队vs中防守', v5, 0.25, 0.45, '英超U23:38%');

// 6. 强行突破：高压 → 应该很低
const v6 = dribbleSuccessRate(DRIBBLE_STYLES.force, players.high, defenders.high, { space: 1, pressure: 0.8, fatigue: 0 });
check('强突+高压+强防守', v6, 0.15, 0.35, '高压下强行突破困难');

// 7. 护球：中等属性+高压 → 50-65%
const v7 = dribbleSuccessRate(DRIBBLE_STYLES.shield, players.medium, defenders.high, { space: 1, pressure: 0.8, fatigue: 0 });
check('护球+中属性+高压', v7, 0.45, 0.68, '意甲前锋平均52%');

// 8. 护球：顶级球员+大空间 → 很高
const v8 = dribbleSuccessRate(DRIBBLE_STYLES.shield, players.top, defenders.medium, { space: 5, pressure: 0.1, fatigue: 0 });
check('护球+顶级+轻松', v8, 0.70, 0.90, '哲科72%');

// 9. 回传：任何情境都应该很安全
const v9 = dribbleSuccessRate(DRIBBLE_STYLES.passBack, players.medium, defenders.high, { space: 0.5, pressure: 1, fatigue: 0 });
check('回传+中属性+极限围抢', v9, 0.60, 0.85, '回传是最安全选项');

// 10. 回传：高属性+轻压 → 极高
const v10 = dribbleSuccessRate(DRIBBLE_STYLES.passBack, players.high, defenders.medium, { space: 5, pressure: 0.1, fatigue: 0 });
check('回传+高属性+轻松', v10, 0.80, 0.95, '回传几乎不失败');

// 11. 疲劳影响
const v11a = dribbleSuccessRate(DRIBBLE_STYLES.control, players.high, defenders.medium, { space: 5, pressure: 0.3, fatigue: 0 });
const v11b = dribbleSuccessRate(DRIBBLE_STYLES.control, players.high, defenders.medium, { space: 5, pressure: 0.3, fatigue: 80 });
const drop = v11a - v11b;
check('疲劳影响（控制带球）', drop, 0.08, 0.30, `充沛${(v11a*100).toFixed(1)}%→耗尽${(v11b*100).toFixed(1)}%`);

// 12. 空间对护球影响极小
const v12a = dribbleSuccessRate(DRIBBLE_STYLES.shield, players.high, defenders.medium, { space: 10, pressure: 0.3, fatigue: 0 });
const v12b = dribbleSuccessRate(DRIBBLE_STYLES.shield, players.high, defenders.medium, { space: 0.5, pressure: 0.3, fatigue: 0 });
const shieldDrop = v12a - v12b;
check('护球空间不敏感', shieldDrop, 0, 0.10, `空间10→0.5仅降${(shieldDrop*100).toFixed(1)}%`);

// 13. 压力对护球影响小
const v13a = dribbleSuccessRate(DRIBBLE_STYLES.shield, players.high, defenders.medium, { space: 2, pressure: 0.1, fatigue: 0 });
const v13b = dribbleSuccessRate(DRIBBLE_STYLES.shield, players.high, defenders.medium, { space: 2, pressure: 1.0, fatigue: 0 });
const shieldPDrop = v13a - v13b;
check('护球压力不敏感', shieldPDrop, 0, 0.12, `压力0.1→1.0仅降${(shieldPDrop*100).toFixed(1)}%`);

// 14. 压力对强行突破影响大
const v14a = dribbleSuccessRate(DRIBBLE_STYLES.force, players.high, defenders.medium, { space: 3, pressure: 0, fatigue: 0 });
const v14b = dribbleSuccessRate(DRIBBLE_STYLES.force, players.high, defenders.medium, { space: 3, pressure: 0.8, fatigue: 0 });
const forcePDrop = v14a - v14b;
check('强突压力敏感', forcePDrop, 0.10, 0.35, `压力0→0.8降${(forcePDrop*100).toFixed(1)}%`);

console.log(`\n═══════════════════════════════════════`);
console.log(`通过: ${passCount}/${passCount+failCount}`);
console.log(`═══════════════════════════════════════`);
console.log('\n=== 测试完成 ===');
