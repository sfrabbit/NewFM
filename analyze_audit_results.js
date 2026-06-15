/**
 * 深入分析100场审计结果的问题
 */
const { estimateXG, decisionProbs } = require("./engine/situations");

console.log("=".repeat(70));
console.log("审计结果深度分析");
console.log("=".repeat(70));

// ── 1. MID_D 远射分析 ──
console.log("\n### 1. MID_D 远射 (311次, 2%占比)");
console.log("   预期: 14437 × 2% = ~289次, 实际311次, 基本吻合");
console.log("");

// 不同球员属性的 MID_D pShoot
console.log("   不同自信/团队的 MID_D pShoot:");
const testCases = [
  { label: "基准(conf=10, team=10)", conf: 10, team: 10 },
  { label: "自信高(conf=15, team=10)", conf: 15, team: 10 },
  { label: "自信低(conf=7, team=10)", conf: 7, team: 10 },
  { label: "独狼(conf=15, team=5)", conf: 15, team: 5 },
  { label: "团队型(conf=10, team=15)", conf: 10, team: 15 },
];
for (const tc of testCases) {
  const probs = decisionProbs('MID_D_C', 'CM_C', {'自信': tc.conf, '团队': tc.team}, 0, null, 0.007, 0, 45);
  console.log(`     ${tc.label}: pShoot=${(probs.pShoot*100).toFixed(2)}%  shootU=${probs._shoot.toFixed(6)}  passU=${probs._pass.toFixed(4)}`);
}

// 最后10分钟
console.log("");
console.log("   最后10分钟 MID_D pShoot (conf=10, team=10):");
for (let min = 80; min <= 90; min += 5) {
  const probs = decisionProbs('MID_D_C', 'CM_C', {'自信': 10, '团队': 10}, 0, null, 0.007, 0, min);
  console.log(`     ${min}': pShoot=${(probs.pShoot*100).toFixed(2)}%`);
}

// ── 2. BOX_A 异常分析 ──
console.log("\n### 2. BOX_A 决策分析");
console.log("   sanity check: BOX_A shoot=55% pass=45% drib=0%");
console.log("   实际分布:   BOX_A shoot=33% pass=0% drib=56% tackle=3% contest=0%");
console.log("   差异巨大！");

// 模拟 BOX_A 实际场景
console.log("");
console.log("   BOX_A 各位置决策(conf=10, team=10, 零压力):");
for (const zone of ['BOX_A_L', 'BOX_A_C', 'BOX_A_R']) {
  // zone通过split提取lane
  const parts = zone.split('_');
  const laneCode = parts[2] || 'C';
  const laneIdx = { L: 0, CL: 1, C: 2, CR: 3, R: 4 }[laneCode];
  const angle = (laneIdx != null ? laneIdx : 2) * 18;
  const xg = estimateXG('BOX_A', { distance: 8, angle, pressure: 0 });
  const probs = decisionProbs(zone, 'ST_C', {'自信': 10, '团队': 10}, 0, null, xg, 0, 45);
  console.log(`     ${zone} xG=${xg.toFixed(3)}: pShoot=${(probs.pShoot*100).toFixed(1)}% pPass=${(probs.pPass*100).toFixed(1)}% pDrib=${(probs.pDribble*100).toFixed(1)}%`);
}

console.log("");
console.log("   BOX_A 实际 → shoot=33%! 为什么比 sanity check 的 55% 低这么多?");
console.log("   原因: BOX_A 仅64次行动(太少)，且 dribble/contest/tackle 分支在");
console.log("   determineSituation 的 BOX_D 分支中处理 — 不是在 BOX_A 分支!");

// ── 3. BOX_D 盘带异常 ──
console.log("\n### 3. BOX_D 盘带 (28次)——本方禁区盘带");
console.log("   问题: 本方禁区盘带极其危险");
console.log("   subType 分布:");
console.log("     midfieldCarry — 中场控制分支(非进攻球员)触发");
console.log("     attackDribble — 进攻球员被放在了本方禁区?");
console.log("   BOX_D decisionProbs 理论上 dribbleUtility=0.01 → pDribble 应接近0");
console.log("   实际28次说明有独立路径不经过decisionProbs, 或contest/tackle未触发");

const probsBD = decisionProbs('BOX_D_C', 'CB_C', {'自信': 10, '团队': 10}, 0.3, null, 0, 0, 45);
console.log(`   BOX_D pShoot=${(probsBD.pShoot*100).toFixed(1)}% pPass=${(probsBD.pPass*100).toFixed(1)}% pDrib=${(probsBD.pDribble*100).toFixed(1)}%`);

// ── 4. 总结 ──
console.log("\n" + "=".repeat(70));
console.log("总结");
console.log("=".repeat(70));
console.log(`
1. MID_D 远射(311次/2%): 
   - 2%在物理现实可接受范围(偶有远射)
   - 个人化生效: conf=7→1.4%, conf=15→3.2%, conf=15+team=5→3.5%
   - 80-90分钟: pShoot升至4.3%, 符合desperation time
   
2. BOX_A kiGA数据可疑:
   - sanity check说55%射门,实际只有33%
   - 实际BOX_A仅64次行动, 样本太小
   - 但drib=56%异常高, 需确认是否来自BOX_D分支误路由
   
3. BOX_D 盘带(28次):
   - 本方禁区盘带是真实问题
   - 需检查: 为什么dribble能通过decisionProbs?
   - 需检查: BOX_D代码分支逻辑
`);
