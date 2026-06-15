// 对抗测试 — 物理推导版
// 测试预期基于物理公式正面推导，不拟合统计数据
const { DUEL_TYPES, duelWinProb, foulProbability } = require('./duel.js');

console.log('═══════════════════════════════════════════');
console.log('  对抗模块测试（物理推导）');
console.log('═══════════════════════════════════════════\n');

const defenders = {
  top:    { tackling: 20, aggression: 17, burst: 17, strength: 18, balance: 17, positioning: 19, heading: 18, jumping: 17, anticipation: 18 },
  high:   { tackling: 17, aggression: 15, burst: 16, strength: 16, balance: 15, positioning: 16, heading: 16, jumping: 15, anticipation: 15 },
  medium: { tackling: 10, aggression: 10, burst: 10, strength: 10, balance: 10, positioning: 10, heading: 10, jumping: 10, anticipation: 10 },
  low:    { tackling: 7,  aggression: 7,  burst: 7,  strength: 7,  balance: 7,  positioning: 6,  heading: 6,  jumping: 6,  anticipation: 6 },
  physical: { tackling: 12, aggression: 16, burst: 12, strength: 18, balance: 16, positioning: 10, heading: 17, jumping: 16, anticipation: 8 },
  technical: { tackling: 18, aggression: 8,  burst: 14, strength: 10, balance: 12, positioning: 17, heading: 10, jumping: 9,  anticipation: 17 },
};

const attackers = {
  top:    { control: 19, balance: 18, strength: 16, heading: 15, jumping: 14 },
  high:   { control: 17, balance: 16, strength: 14, heading: 14, jumping: 13 },
  medium: { control: 10, balance: 10, strength: 10, heading: 10, jumping: 10 },
  low:    { control: 7,  balance: 7,  strength: 7,  heading: 6,  jumping: 6 },
};

// ═══════════════════════════════════════════
// 1. 物理推导验证：逐项展示物理过程
// ═══════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 物理推导：属性→得分→胜率');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const ctx0 = { speedDiff: 0, fatigue: 0 };

for (const [key, type] of Object.entries(DUEL_TYPES)) {
  console.log(`\n── ${key}: ${type.name} ──`);
  console.log(`  物理模型: ${key === 'tackle' ? '脚速竞赛(防守先手)' : key === 'interception' ? '截获移动目标' : key === 'shoulder' ? '双质点碰撞(50/50)' : '垂直竞赛+空中稳定'}`);
  console.log(`  先手系数: ${type.initiative}`);

  const td = defenders.top;
  const ah = attackers.high;
  const am = attackers.medium;

  // 展示 top vs high 的计算过程
  let atkS = 0, tgtS = 0;
  const parts = [];
  for (const [k, w] of Object.entries(type.attackerAttrs)) { atkS += (td[k]||10)*w; parts.push(`${k}×${w}`); }
  const atkParts = parts.join('+');
  const tgtParts = [];
  if (Object.keys(type.targetAttrs).length > 0) {
    for (const [k, w] of Object.entries(type.targetAttrs)) { tgtS += (ah[k]||10)*w; tgtParts.push(`${k}×${w}`); }
  } else { tgtS = 10; }

  console.log(`  顶级防得分: ${atkS.toFixed(1)} (${atkParts})`);
  console.log(`  高属性攻得分: ${tgtS.toFixed(1)} (${tgtParts.length ? tgtParts.join('+') : '固定阻力'})`);
  const baseWin = atkS / (atkS + tgtS * type.initiative);
  console.log(`  top vs high 基础胜率: ${(baseWin*100).toFixed(1)}% [物理推导]`);

  // top vs medium
  if (Object.keys(type.targetAttrs).length > 0) {
    let mtgtS = 0;
    for (const [k, w] of Object.entries(type.targetAttrs)) { mtgtS += (am[k]||10)*w; }
    const mBase = atkS / (atkS + mtgtS * type.initiative);
    console.log(`  top vs medium 基础胜率: ${(mBase*100).toFixed(1)}% [物理推导 — 现实统计通常取这个级别的对比]`);
  }
}

// ═══════════════════════════════════════════
// 2. 全面矩阵（所有类型 × 所有等级）
// ═══════════════════════════════════════════
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('2. 防守×进攻 完整矩阵（中性条件）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const defLevels = ['top','high','medium','low'];
const attLevels = ['top','high','medium','low'];

for (const [key, type] of Object.entries(DUEL_TYPES)) {
  if (key === 'interception') continue;
  console.log(`\n── ${key}: ${type.name} ──`);
  const hdr = 'def\\att'.padEnd(10) + attLevels.map(a => a.padEnd(8)).join('');
  console.log(`  ${hdr}`);
  for (const dl of defLevels) {
    const row = dl.padEnd(10) + attLevels.map(al =>
      (duelWinProb(type, defenders[dl], attackers[al], ctx0)*100).toFixed(0)+'%'.padEnd(8)
    ).join('');
    console.log(`  ${row}`);
  }
}

// ═══════════════════════════════════════════
// 3. 拦截成功率
// ═══════════════════════════════════════════
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('3. 拦截成功率');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const interception = DUEL_TYPES.interception;
for (const dl of defLevels) {
  // 拦截不对比对手，只取决于防守者自身属性 vs 固定阻力
  const atkS = (defenders[dl].positioning||10)*0.45 + (defenders[dl].anticipation||10)*0.35 + (defenders[dl].burst||10)*0.20;
  const base = atkS / (atkS + 10 * 1.0);
  console.log(`  ${dl.padEnd(8)} 得分=${atkS.toFixed(1)} 基础=${(base*100).toFixed(0)}% → 最终=${(duelWinProb(interception, defenders[dl], {}, ctx0)*100).toFixed(0)}%`);
}

// ═══════════════════════════════════════════
// 4. 速度差影响（物理验证：正向单调）
// ═══════════════════════════════════════════
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('4. 速度差单调性（high vs high, tackle）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const speeds = [-5, -2, 0, 2, 5];
console.log('  speedDiff'.padEnd(12) + '铲球%'.padEnd(8) + '犯规%'.padEnd(8));
for (const sd of speeds) {
  const c = { speedDiff: sd, fatigue: 0 };
  const win = duelWinProb(DUEL_TYPES.tackle, defenders.high, attackers.high, c);
  const foul = foulProbability(DUEL_TYPES.tackle, defenders.high, c);
  console.log(`  ${sd}`.padEnd(12) + `${(win*100).toFixed(0)}%`.padEnd(8) + `${(foul*100).toFixed(0)}%`);
}

// ═══════════════════════════════════════════
// 5. 身体型 vs 技巧型（物理差异验证）
// ═══════════════════════════════════════════
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('5. 身体型 vs 技巧型防守者 (vs high attacker)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

for (const [key, type] of Object.entries(DUEL_TYPES)) {
  if (key === 'interception') continue;
  const phys = duelWinProb(type, defenders.physical, attackers.high, ctx0);
  const tech = duelWinProb(type, defenders.technical, attackers.high, ctx0);
  console.log(`  ${key.padEnd(10)} 身体型=${(phys*100).toFixed(0)}% 技巧型=${(tech*100).toFixed(0)}% → ${key==='shoulder'||key==='aerial' ? '身体型优' : '技巧型优'}`);
}

// ═══════════════════════════════════════════
// 验证：物理一致性（非数值锚点）
// ═══════════════════════════════════════════
console.log('\n\n═══════════════════════════════════════════');
console.log('  物理一致性验证');
console.log('═══════════════════════════════════════════\n');

let pass = 0, fail = 0;

function assert(label, condition) {
  console.log(`${condition?'✓':'✗'} ${label}`);
  if (condition) pass++; else fail++;
}

// 1. 铲球有先手优势（同等属性防守方>50%）
const v1 = duelWinProb(DUEL_TYPES.tackle, defenders.medium, attackers.medium, ctx0);
assert('铲球先手: 同等属性def>50%', v1 > 0.50);

// 2. 卡位是50/50（同等属性≈50%）
const v2 = duelWinProb(DUEL_TYPES.shoulder, defenders.medium, attackers.medium, ctx0);
assert('卡位50/50: 同等属性≈50%', Math.abs(v2 - 0.50) < 0.02);

// 3. 空中是50/50
const v3 = duelWinProb(DUEL_TYPES.aerial, defenders.medium, attackers.medium, ctx0);
assert('空中50/50: 同等属性≈50%', Math.abs(v3 - 0.50) < 0.02);

// 4. 单调性：防守越强胜率越高
const t_t_m = duelWinProb(DUEL_TYPES.tackle, defenders.top, attackers.medium, ctx0);
const t_h_m = duelWinProb(DUEL_TYPES.tackle, defenders.high, attackers.medium, ctx0);
const t_m_m = duelWinProb(DUEL_TYPES.tackle, defenders.medium, attackers.medium, ctx0);
assert('单调性: top>high>medium vs medium attacker', t_t_m > t_h_m && t_h_m > t_m_m);

// 5. 速度差单调递增
const sp_pos = duelWinProb(DUEL_TYPES.tackle, defenders.high, attackers.high, { speedDiff: 3, fatigue: 0 });
const sp_zero = duelWinProb(DUEL_TYPES.tackle, defenders.high, attackers.high, { speedDiff: 0, fatigue: 0 });
const sp_neg = duelWinProb(DUEL_TYPES.tackle, defenders.high, attackers.high, { speedDiff: -3, fatigue: 0 });
assert('速度单调: +3 > 0 > -3', sp_pos > sp_zero && sp_zero > sp_neg);

// 6. 疲劳衰减
const f_fresh = duelWinProb(DUEL_TYPES.tackle, defenders.high, attackers.high, { speedDiff: 0, fatigue: 0 });
const f_tired = duelWinProb(DUEL_TYPES.tackle, defenders.high, attackers.high, { speedDiff: 0, fatigue: 80 });
assert('疲劳衰减: 新鲜 > 疲劳', f_fresh > f_tired);

// 7. 铲球犯规：侵略高=犯规多
const foulAgg = foulProbability(DUEL_TYPES.tackle, { aggression: 16, tackling: 10 }, { speedDiff: 0 });
const foulTac = foulProbability(DUEL_TYPES.tackle, { aggression: 8, tackling: 18 }, { speedDiff: 0 });
assert('犯规: 高侵略>低侵略', foulAgg > foulTac);

// 8. 身体型卡位 > 技巧型卡位
const physSh = duelWinProb(DUEL_TYPES.shoulder, defenders.physical, attackers.high, ctx0);
const techSh = duelWinProb(DUEL_TYPES.shoulder, defenders.technical, attackers.high, ctx0);
assert('卡位: 身体型>技巧型', physSh > techSh);

// 9. 技巧型铲球 > 身体型铲球
const physTa = duelWinProb(DUEL_TYPES.tackle, defenders.physical, attackers.high, ctx0);
const techTa = duelWinProb(DUEL_TYPES.tackle, defenders.technical, attackers.high, ctx0);
assert('铲球: 技巧型>身体型', techTa > physTa);

console.log(`\n═══════════════════════════════════════`);
console.log(`通过: ${pass}/${pass+fail}`);
console.log(`═══════════════════════════════════════`);
console.log('\n=== 测试完成 ===');
