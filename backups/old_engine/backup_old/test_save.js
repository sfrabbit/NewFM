// 门将扑救测试 — 物理推导版
const { SAVE_TYPES, chooseSaveType, reboundRisk, distributionChoice } = require('./save.js');

console.log('═══════════════════════════════════════════');
console.log('  门将扑救模块测试（物理推导）');
console.log('═══════════════════════════════════════════\n');

const keepers = {
  top:    { handling: 19, reflexes: 20, positioning: 18, jumping: 17, strength: 16, throwing: 16, kicking: 17, vision: 15, composure: 18, power: 16 },
  high:   { handling: 16, reflexes: 17, positioning: 16, jumping: 15, strength: 15, throwing: 14, kicking: 15, vision: 13, composure: 14, power: 14 },
  medium: { handling: 10, reflexes: 10, positioning: 10, jumping: 10, strength: 10, throwing: 10, kicking: 10, vision: 10, composure: 10, power: 10 },
  low:    { handling: 6,  reflexes: 6,  positioning: 7,  jumping: 6,  strength: 6,  throwing: 7,  kicking: 7,  vision: 7,  composure: 6,  power: 7 },
};

// ═══════════════════════════════════════════
// 1. 扑救方式选择
// ═══════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 扑救方式选择（高属性门将）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const scenarios = [
  { label: "远射低力量", power: 0.3, close: false },
  { label: "禁区内中力量", power: 0.5, close: false },
  { label: "禁区猛力射门", power: 0.8, close: false },
  { label: "近距离快射", power: 0.6, close: true },
];

for (const sc of scenarios) {
  const choice = chooseSaveType(keepers.high, { shotPower: sc.power, isFromClose: sc.close });
  console.log(`  ${sc.label} (pow=${sc.power}, close=${sc.close}) → ${SAVE_TYPES[choice].name}`);
}

// ═══════════════════════════════════════════
// 2. 反弹风险
// ═══════════════════════════════════════════
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('2. 反弹风险（拍出方式）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const parry = SAVE_TYPES.parry;
for (const [lvl, gk] of Object.entries(keepers)) {
  const r = reboundRisk(parry, gk, { shotPower: 0.7 });
  console.log(`  ${lvl.padEnd(8)} handling=${gk.handling} → 反弹${(r*100).toFixed(0)}%`);
}

// ═══════════════════════════════════════════
// 3. 出球分布
// ═══════════════════════════════════════════
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('3. 出球分布倾向');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

for (const [lvl, gk] of Object.entries(keepers)) {
  const dist = distributionChoice(gk);
  console.log(`  ${lvl.padEnd(8)} → ${dist}`);
}

// ═══════════════════════════════════════════
// 物理一致性验证
// ═══════════════════════════════════════════
console.log('\n\n═══════════════════════════════════════════');
console.log('  物理一致性验证');
console.log('═══════════════════════════════════════════\n');

let pass = 0, fail = 0;

function assert(label, condition) {
  console.log(`${condition?'✓':'✗'} ${label}`);
  if (condition) pass++; else fail++;
}

// 1. 远射低力量 → catch
const v1 = chooseSaveType(keepers.high, { shotPower: 0.2, isFromClose: false });
assert('远射=接住', v1 === 'catch');

// 2. 猛力射门 → parry/tipOver
const v2 = chooseSaveType(keepers.high, { shotPower: 0.9, isFromClose: false });
assert('猛力射门=拍出', v2 !== 'catch');

// 3. 处理能力好 → 反弹低
const rTop = reboundRisk(parry, keepers.top, { shotPower: 0.7 });
const rLow = reboundRisk(parry, keepers.low, { shotPower: 0.7 });
assert('顶级反弹<低水平反弹', rTop < rLow);

// 4. 力量大反弹高
const rWeak = reboundRisk(parry, keepers.medium, { shotPower: 0.3 });
const rStrong = reboundRisk(parry, keepers.medium, { shotPower: 0.9 });
assert('强射反弹>弱射反弹', rStrong > rWeak);

// 5. catch/parry/tipOver都有效
assert('catch无反弹', SAVE_TYPES.catch.reboundRisk === 0);
assert('tipOver无反弹', SAVE_TYPES.tipOver.reboundRisk === 0);

// 6. 出球类型是有效值
const dist = distributionChoice(keepers.medium);
assert('出球有效', ['throw','longKick','shortPass'].includes(dist));

// 7. 反弹在[0,1]
const rAny = reboundRisk(parry, keepers.medium, { shotPower: 0.5 });
assert('反弹概率在[0,1]', rAny >= 0 && rAny <= 1);

console.log(`\n═══════════════════════════════════════`);
console.log(`通过: ${pass}/${pass+fail}`);
console.log(`═══════════════════════════════════════`);
console.log('\n=== 测试完成 ===');
