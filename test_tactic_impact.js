/**
 * 战术参数影响力测试
 * 展示 shootWillingness / passTendency / dribbleTendency
 * 不同取值对决策概率的影响幅度，以及与非战术因素的比例关系
 */
const { estimateXG, decisionProbs, shootUtility, passUtility, dribbleUtility } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };

console.log("=".repeat(80));
console.log("战术参数影响力分析");
console.log("=".repeat(80));

// ═══════════════════════════════════════════════════════════════
// 1. 射门：shootWillingness vs 非战术因素
// ═══════════════════════════════════════════════════════════════
console.log("\n### 1. shootWillingness 对射门概率的影响");
console.log("");
console.log("  非战术因素范围：");
console.log("    timePressureBonus:    0 → 0.3  (80'→90')");
console.log("    personalityBonus:     (conf=1,team=20)→-0.28 至 (conf=20,team=1)→+0.38");
console.log("    合计(非极端):          -0.3 ~ +0.5");
console.log("");

const testZones = [
  { v: "MID_D", xg: 0.007, desc: "35m 中场", attrs: { '自信': 10, '团队': 10 } },
  { v: "MID_D", xg: 0.007, desc: "35m 独狼(conf=17,team=4)", attrs: { '自信': 17, '团队': 4 } },
  { v: "MID_A", xg: 0.059, desc: "22m 前区", attrs: { '自信': 10, '团队': 10 } },
  { v: "DEEP_A", xg: 0.184, desc: "14m 进攻三区", attrs: { '自信': 10, '团队': 10 } },
];

const tacticValues = [0, 0.3, 0.6, 1.0, -0.3, -0.6];

for (const tz of testZones) {
  console.log(`--- ${tz.desc} (xg=${tz.xg}, 基准pShoot@tactics=0) ---`);
  console.log(`  战术值  pShoot   shootU   变化    非战术部分 =`);
  
  for (const sw of tacticValues) {
    const timeBonus = 0;
    const conf = tz.attrs['自信'] || 10;
    const team = tz.attrs['团队'] || 10;
    const pers = (conf - 10) * 0.02 + (10 - team) * 0.02;
    const nonTact = timeBonus + pers;
    const probs = decisionProbs(tz.v + '_C', 'CM_C', tz.attrs, 0, null, tz.xg, sw, 45, 0, 0);
    const arrow = sw > 0 ? "↑" : sw < 0 ? "↓" : "=";
    console.log(`  sw=${sw.toFixed(1).padStart(4)}  ${(probs.pShoot*100).toFixed(1).padStart(5)}%  ${probs._shoot.toFixed(4).padStart(7)}   ${arrow}     非战术=${nonTact.toFixed(2)} 战术/非战术比例=${(sw / (Math.abs(nonTact) + 0.01)).toFixed(1)}x`);
  }
  console.log("");
}

// ═══════════════════════════════════════════════════════════════
// 2. 传球：passTendency 影响
// ═══════════════════════════════════════════════════════════════
console.log("### 2. passTendency 对传球概率的影响");
console.log("   (MID_D, xg=0.007, 基准球员)\n");

for (const pt of [0, 0.3, 0.6, 1.0, -0.3, -0.6]) {
  const probs = decisionProbs('MID_D_C', 'CM_C', { '自信': 10, '团队': 10 }, 0, null, 0.007, 0, 45, pt, 0);
  console.log(`  pt=${pt.toFixed(1).padStart(4)}  pPass=${(probs.pPass*100).toFixed(1).padStart(5)}%  pShoot=${(probs.pShoot*100).toFixed(1).padStart(5)}%  pDrib=${(probs.pDribble*100).toFixed(1).padStart(5)}%  passU=${probs._pass.toFixed(4)}`);
}
console.log("");

// ═══════════════════════════════════════════════════════════════
// 3. 盘带：dribbleTendency 影响
// ═══════════════════════════════════════════════════════════════
console.log("### 3. dribbleTendency 对盘带概率的影响");
console.log("   (MID_D, xg=0.007, 基准球员)\n");

for (const dt of [0, 0.3, 0.6, 1.0, -0.3, -0.6]) {
  const probs = decisionProbs('MID_D_C', 'CM_C', { '自信': 10, '团队': 10 }, 0, null, 0.007, 0, 45, 0, dt);
  console.log(`  dt=${dt.toFixed(1).padStart(4)}  pDrib=${(probs.pDribble*100).toFixed(1).padStart(5)}%  pShoot=${(probs.pShoot*100).toFixed(1).padStart(5)}%  pPass=${(probs.pPass*100).toFixed(1).padStart(5)}%  dribU=${probs._dribble.toFixed(4)}`);
}
console.log("");

// ═══════════════════════════════════════════════════════════════
// 4. 极端组合：战术 vs 不合作球员
// ═══════════════════════════════════════════════════════════════
console.log("### 4. 战术 vs 球员不合作度（极端情况）\n");
console.log("  情景：教练要求多射门(shootWillingness=+0.6)，但球员团队极低、自信极高");
console.log("  团队低=不听话，自信高=自己的判断优先 → 结果应该：战术部分+个人部分叠加");
console.log("");

const scenarios = [
  { label: "听话球员(team=15,conf=10)", attrs: { '自信': 10, '团队': 15 } },
  { label: "普通球员(team=10,conf=10)", attrs: { '自信': 10, '团队': 10 } },
  { label: "独狼(team=4,conf=17)", attrs: { '自信': 17, '团队': 4 } },
];

for (const sc of scenarios) {
  console.log(`  ${sc.label}:`);
  for (const sw of [0, 0.3, 0.6]) {
    const probs = decisionProbs('MID_A_C', 'AM_C', sc.attrs, 0.1, null, 0.053, sw, 45, 0, 0);
    const pers = ((sc.attrs['自信']||10)-10)*0.02 + (10-(sc.attrs['团队']||10))*0.02;
    console.log(`    sw=${sw}  persBonus=${pers.toFixed(2)}  pShoot=${(probs.pShoot*100).toFixed(1)}%  shootU=${probs._shoot.toFixed(4)}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. 总结：战术应占多大比例？
// ═══════════════════════════════════════════════════════════════
console.log("\n### 5. 推荐战术值范围\n");
console.log("  当前结构：tacticalMod = exp(tendency)");
console.log("  exp(0.3)=1.35  exp(0.6)=1.82  exp(1.0)=2.72");
console.log("  exp(-0.3)=0.74 exp(-0.6)=0.55 exp(-1.0)=0.37");
console.log("");
console.log("  非战术因素(射门): timePressure(0-0.3) + personality(-0.3~+0.4) ≈ ±0.5范围");
console.log("  如果战术值取 0.6，exp(0.6)=1.82，战术影响 ≈ 非战术最大值的同等量级");
console.log("  如果战术值取 1.0，exp(1.0)=2.72，战术成为绝对主导");
console.log("");
console.log("  建议战术值范围: ±0.5 ~ ±1.0");
console.log("  其中 0.5=显著倾向, 1.0=强战术指令");
