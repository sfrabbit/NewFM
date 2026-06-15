// ============================================================
// 射门测试 — distance+angle+defDist+setPiece 连续模型
// 数据校准版：2026年6月
// ============================================================
const { SHOT_TYPES, shoot } = require('./shoot.js');

console.log('═══════════════════════════════════════════');
console.log('  射门模块测试（PK/FK分离，含人墙）');
console.log('═══════════════════════════════════════════\n');

const shooters = {
  top:    { finishing: 20, power: 18, longShots: 17, composure: 19, technique: 18, heading: 15, jumping: 14 },
  high:   { finishing: 17, power: 16, longShots: 14, composure: 15, technique: 15, heading: 14, jumping: 13 },
  medium: { finishing: 12, power: 11, longShots: 10, composure: 10, technique: 10, heading: 10, jumping: 10 },
  low:    { finishing: 7,  power: 7,  longShots: 5,  composure: 7,  technique: 6,  heading: 6,  jumping: 6 },
};

const keepers = {
  top:    { reflexes: 20, positioning: 19, handling: 18 },
  high:   { reflexes: 17, positioning: 16, handling: 15 },
  medium: { reflexes: 10, positioning: 10, handling: 10 },
  low:    { reflexes: 6,  positioning: 6,  handling: 6 },
};

const defenders = {
  high:   { positioning: 17, strength: 16, jump: 15 },
  medium: { positioning: 10, strength: 10, jump: 10 },
  low:    { positioning: 6,  strength: 6,  jump: 6 },
};

const defMed = defenders.medium;
const gkMed = keepers.medium;

// ── 1. 典型场景矩阵 ──
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 典型场景（高属性射手 vs 中等门将+防守者）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const typical = [
  { label:"PK",          d:11, a:0,  def:99, lane:0, sp:'penalty'  },
  { label:"单刀正面",     d:10, a:0,  def:0.8,lane:0, sp:'none'     },
  { label:"禁区内1防",    d:10, a:15, def:1.5,lane:1, sp:'none'     },
  { label:"禁区线正面",   d:18, a:0,  def:2,  lane:1, sp:'none'     },
  { label:"远射正面",     d:25, a:0,  def:3,  lane:1, sp:'none'     },
  { label:"禁区挤压",     d:8,  a:20, def:0.5,lane:2, sp:'none'     },
  { label:"零角度",       d:12, a:75, def:1.5,lane:1, sp:'none'     },
  { label:"FK_18m",      d:18, a:0,  def:99, lane:0, sp:'freeKick' },
  { label:"FK_22m",      d:22, a:0,  def:99, lane:0, sp:'freeKick' },
  { label:"FK_30m",      d:30, a:0,  def:99, lane:0, sp:'freeKick' },
];

for (const [typeKey, type] of Object.entries(SHOT_TYPES)) {
  console.log(`\n── ${typeKey}: ${type.name} ──`);
  const hdr = '场景'.padEnd(14) + '墙%'.padEnd(7) + '防%'.padEnd(7) + '射正%'.padEnd(8) + '射正→进%'.padEnd(10) + '总%';
  console.log(`  ${hdr}`);
  for (const sc of typical) {
    const ctx = {
      distance: sc.d, angle: sc.a, defDist: sc.def, defInLane: sc.lane,
      setPiece: sc.sp, fatigue: 0,
    };
    const r = shoot(shooters.high, type, ctx, gkMed, defMed);
    console.log(`  ${sc.label.padEnd(14)} ${(r.wallBlockRate*100).toFixed(0)}%`.padEnd(7) + `${(r.defBlockRate*100).toFixed(0)}%`.padEnd(7) + `${(r.onTargetRate*100).toFixed(0)}%`.padEnd(8) + `${(r.goalGivenTarget*100).toFixed(0)}%`.padEnd(10) + `${(r.totalProb*100).toFixed(1)}%`);
  }
}

// ── 2. 点球：不同射手 vs 不同门将 ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('2. 点球：射手等级 × 门将等级');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const pkCtx = { distance: 11, angle: 0, defDist: 99, defInLane: 0, setPiece: 'penalty', fatigue: 0 };
const pkHeader = '射手/GK'.padEnd(12) + 'lowGK'.padEnd(10) + 'medGK'.padEnd(10) + 'topGK'.padEnd(10);
console.log(`  ${pkHeader}`);
for (const [shLvl, sh] of Object.entries(shooters)) {
  const row = shLvl.padEnd(12) +
    (shoot(sh, SHOT_TYPES.placed, pkCtx, keepers.low, defMed).totalProb*100).toFixed(1)+'%'.padEnd(10) +
    (shoot(sh, SHOT_TYPES.placed, pkCtx, keepers.medium, defMed).totalProb*100).toFixed(1)+'%'.padEnd(10) +
    (shoot(sh, SHOT_TYPES.placed, pkCtx, keepers.top, defMed).totalProb*100).toFixed(1)+'%'.padEnd(10);
  console.log(`  ${row}`);
}

// ── 3. 任意球：不同距离 ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('3. 任意球：距离梯度（高属性射手，placed，无外场防守）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const fkDists = [18, 20, 22, 25, 28, 30, 35];
console.log('  距离'.padEnd(8) + '墙%'.padEnd(8) + '射正%'.padEnd(8) + '总%');
for (const d of fkDists) {
  const ctx = { distance: d, angle: 0, defDist: 99, defInLane: 0, setPiece: 'freeKick', fatigue: 0 };
  const r = shoot(shooters.high, SHOT_TYPES.placed, ctx, gkMed, defMed);
  console.log(`  ${d}m`.padEnd(8) + `${(r.wallBlockRate*100).toFixed(0)}%`.padEnd(8) +`${(r.onTargetRate*100).toFixed(0)}%`.padEnd(8) +`${(r.totalProb*100).toFixed(1)}%`);
}

// ── 4. 距离梯度对比（普通比赛，placed） ──
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('4. 普通比赛距离梯度（1防2m，placed）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const distances = [5, 8, 11, 14, 18, 22, 25, 30, 35];
console.log('  距离'.padEnd(8) + '封堵%'.padEnd(8) + '射正%'.padEnd(8) + '总%');
for (const d of distances) {
  const ctx = { distance: d, angle: 0, defDist: 2, defInLane: 1, setPiece: 'none', fatigue: 0 };
  const r = shoot(shooters.high, SHOT_TYPES.placed, ctx, gkMed, defMed);
  console.log(`  ${d}m`.padEnd(8) + `${(r.blockRate*100).toFixed(0)}%`.padEnd(8) +`${(r.onTargetRate*100).toFixed(0)}%`.padEnd(8) +`${(r.totalProb*100).toFixed(1)}%`);
}

// ═══════════════════════════════════════════
// 关键指标验证
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

// 1. PK ≈75%
const v1 = shoot(shooters.high, SHOT_TYPES.placed, { distance:11, angle:0, defDist:99, defInLane:0, setPiece:'penalty', fatigue:0 }, gkMed, defMed).totalProb;
check('点球', v1, 0.72, 0.82, 'PK≈75%');

// 2. FK 22m ≈5-8%
const v2 = shoot(shooters.high, SHOT_TYPES.placed, { distance:22, angle:0, defDist:99, defInLane:0, setPiece:'freeKick', fatigue:0 }, gkMed, defMed).totalProb;
check('任意球 22m', v2, 0.04, 0.10, 'FK≈5-8%');

// 3. FK 30m 更低
const v3 = shoot(shooters.high, SHOT_TYPES.placed, { distance:30, angle:0, defDist:99, defInLane:0, setPiece:'freeKick', fatigue:0 }, gkMed, defMed).totalProb;
check('任意球 30m', v3, 0.01, 0.05, '远FK更低');

// 4. 禁区内有防 10-20%
const v4 = shoot(shooters.high, SHOT_TYPES.placed, { distance:10, angle:0, defDist:2, defInLane:1, setPiece:'none', fatigue:0 }, gkMed, defMed).totalProb;
check('禁区内一防', v4, 0.10, 0.22, '禁区内有防守');

// 5. 远射
const v5 = shoot(shooters.high, SHOT_TYPES.power, { distance:25, angle:0, defDist:3, defInLane:1, setPiece:'none', fatigue:0 }, gkMed, defMed).totalProb;
check('远射25m', v5, 0.02, 0.06, '远射3-5%');

// 6. 进球率 = 射正×未被封×射正→进 合理
const v6 = shoot(shooters.high, SHOT_TYPES.placed, { distance:12, angle:0, defDist:1.5, defInLane:1, setPiece:'none', fatigue:0 }, gkMed, defMed);
check('总进球分解合理', v6.totalProb, 0.08, 0.25, `封${(v6.blockRate*100).toFixed(0)}%×射正${(v6.onTargetRate*100).toFixed(0)}%×射正→进${(v6.goalGivenTarget*100).toFixed(0)}%`);

// 7. PK vs top GK
const v7 = shoot(shooters.high, SHOT_TYPES.placed, { distance:11, angle:0, defDist:99, defInLane:0, setPiece:'penalty', fatigue:0 }, keepers.top, defMed).totalProb;
check('PK vs 顶级GK', v7, 0.60, 0.75, 'PK vs top GK');

console.log(`\n═══════════════════════════════════════`);
console.log(`通过: ${passCount}/${passCount+failCount}`);
console.log(`═══════════════════════════════════════`);
console.log('\n=== 测试完成 ===');
