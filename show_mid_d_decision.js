/**
 * 展示MID_D区域射门决策的完整计算过程
 */
const { estimateXG, decisionProbs } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };

console.log("=".repeat(70));
console.log("MID_D 射门决策计算展示");
console.log("=".repeat(70));

// 模拟不同压力条件下的MID_D决策
const pressures = [0.0, 0.2, 0.5, 0.8];

for (const pressure of pressures) {
  const v = 'MID_D';
  const d = distMap[v];
  const angle = 45; // 默认角度

  // 计算xG
  const xg = estimateXG(v, { distance: d, angle, pressure });

  // 计算决策概率
  const probs = decisionProbs('MID_D_C', 'ST_C', {}, pressure, null, xg);

  console.log(`\n--- 压力=${pressure.toFixed(1)} (defDist≈${(0.3 + (1-pressure)*4.7).toFixed(1)}m) ---`);
  console.log(`  距离球门: ${d}m`);
  console.log(`  角度: ${angle}度`);
  console.log(`  xG: ${xg.toFixed(4)}`);
  console.log(`  shootUtility(xG) = ${xg.toFixed(4)}`);
  console.log(`  passUtility(MID_D, ${pressure}) = ${(0.25).toFixed(2)}`);
  console.log(`  dribbleUtility(MID_D, ${pressure}, ${xg.toFixed(4)}) = ${(0.06 * Math.max(0, 1 - xg/0.20) * (1-pressure)).toFixed(4)}`);
  console.log(`  total = ${(xg + 0.25 + 0.06 * Math.max(0, 1 - xg/0.20) * (1-pressure)).toFixed(4)}`);
  console.log(`  => pShoot = ${(probs.pShoot * 100).toFixed(2)}%`);
  console.log(`  => pPass  = ${(probs.pPass * 100).toFixed(2)}%`);
  console.log(`  => pDribble = ${(probs.pDribble * 100).toFixed(2)}%`);
}

console.log("\n" + "=".repeat(70));
console.log("问题分析");
console.log("=".repeat(70));
console.log(`
当压力=0时:
  - shootUtility = 0.0078
  - passUtility = 0.25
  - dribbleUtility = 0.06 * (1-0.0078/0.20) * 1.0 = 0.0577
  - total = 0.0078 + 0.25 + 0.0577 = 0.3155
  - pShoot = 0.0078 / 0.3155 = 2.47%

这意味着: 每40次MID_D进攻决策，约有1次会选择射门。
在100场比赛(约36000次行动)中，预期约有36000 * (14274/36569) * 0.0247 ≈ 350次MID_D射门。

物理现实检查:
  - 35米远射的xG≈0.008，职业足球中确实会发生（如贝克汉姆、兰帕德等）
  - 但频率应该更低——实际英超35米射门占比约0.3-0.5%
  - 当前模型2.47%偏高约5-8倍
`);

console.log("=".repeat(70));
console.log("所有zone的决策概率对比");
console.log("=".repeat(70));
for (const [z, d] of Object.entries(distMap)) {
  const xg = estimateXG(z, { distance: d, angle: 45, pressure: 0.2 });
  const probs = decisionProbs(z + '_C', 'ST_C', {}, 0.2, null, xg);
  console.log(`${z.padEnd(10)} d=${d.toString().padStart(2)}m xG=${xg.toFixed(3)}  shoot=${(probs.pShoot*100).toFixed(1).padStart(4)}% pass=${(probs.pPass*100).toFixed(1).padStart(4)}% drib=${(probs.pDribble*100).toFixed(1).padStart(4)}%`);
}
