/**
 * 测试：个性系数从0.02调到0.04后，
 * 极端球员的个人修正能否匹配一个标准战术值
 */
const { decisionProbs } = require("./engine/situations");

console.log("个性系数对比：0.02 (旧) vs 0.04 (新)");
console.log("");
console.log("情景：教练 shootWillingness=+0.6 (要求多射门)");
console.log("球员：conf=20, team=1 (极度自私，完全不听话)");
console.log("");
console.log("目标：极端个性的修正量应能大致抵消战术值(±0.5~±1.0)");

// 手动算两种系数
const tactical = 0.6;
const conf = 20, team = 1;

for (const k of [0.02, 0.04, 0.05]) {
  const pers = (conf - 10) * k + (10 - team) * k;
  const total = tactical + pers;
  const ratio = Math.abs(pers) / Math.abs(tactical);
  console.log(`k=${k}: pers=${pers.toFixed(2)}  total=${total.toFixed(2)}  个性占比=${(ratio*100).toFixed(0)}%  → ${pers >= tactical ? '✅ 能抵消' : '❌ 抵消不了'}`);
}

// 正常球员不应受太大影响
console.log("");
console.log("正常球员 (conf=10, team=10) 不应受影响:");
for (const k of [0.02, 0.04, 0.05]) {
  const pers = (10 - 10) * k + (10 - 10) * k;
  console.log(`k=${k}: pers=${pers.toFixed(2)} (应该=0)`);
}

// 普通范围球员
console.log("");
console.log("普通范围 (conf=12, team=8):");
for (const k of [0.02, 0.04, 0.05]) {
  const pers = (12 - 10) * k + (10 - 8) * k;
  console.log(`k=${k}: pers=${pers.toFixed(2)} (战术主导，个性小量修正)`);
}

// 实际概率影响
console.log("");
console.log("MID_A, xg=0.053, 教练shootWillingness=+0.6:");
for (const sc of [
  { label: "听话(conf=10,team=15)", attrs: { '自信': 10, '团队': 15 } },
  { label: "普通(conf=10,team=10)", attrs: { '自信': 10, '团队': 10 } },
  { label: "独狼(conf=20,team=1)", attrs: { '自信': 20, '团队': 1 } },
]) {
  // 用 k=0.04 算
  const attrs = sc.attrs;
  const pers_old = ((attrs['自信']||10)-10)*0.02 + (10-(attrs['团队']||10))*0.02;
  const pers_new = ((attrs['自信']||10)-10)*0.04 + (10-(attrs['团队']||10))*0.04;
  // 模拟 decisionProbs 的效果
  const xg = 0.053;
  const passU = 0.25;
  const dribU = 0.12 * (1 - 35/55) * (1 - xg/0.2) * 1.0;
  const shootU_old = xg * Math.exp(0.6 + pers_old);
  const shootU_new = xg * Math.exp(0.6 + pers_new);
  const pOld = shootU_old / (shootU_old + passU + dribU) * 100;
  const pNew = shootU_new / (shootU_new + passU + dribU) * 100;
  console.log(`  ${sc.label}: 旧pers=${pers_old.toFixed(2)}→pShoot=${pOld.toFixed(1)}%  新pers=${pers_new.toFixed(2)}→pShoot=${pNew.toFixed(1)}%`);
}
