/**
 * 验证 xG 模型 vs 学术数据
 */
const { estimateXG } = require("./engine/situations");

console.log("=== xG 模型验证 ===\n");
console.log("公式: logistic z = 0.2 - d*0.16 + aRad*0.7 - pressure*1.0");
console.log("角度: 正面角度(90度=边线, 45度=中轴线附近, 0度=正对球门)\n");

// 基准：正对球门，零压力
console.log("--- 正对球门(angle=0), 零压力 ---");
const distances = [6, 8, 11, 14, 16, 18, 22, 25, 30, 35, 40, 45];
for (const d of distances) {
  const xg = estimateXG('MID_A', { distance: d, angle: 0, pressure: 0 });
  console.log(`  d=${d.toString().padStart(2)}m  xG=${xg.toFixed(4)}`);
}

console.log("\n--- 中轴附近(angle=45), 零压力 ---");
for (const d of distances) {
  const xg = estimateXG('MID_A', { distance: d, angle: 45, pressure: 0 });
  console.log(`  d=${d.toString().padStart(2)}m  xG=${xg.toFixed(4)}`);
}

console.log("\n--- 参考：真实足球xG数据（学术文献） ---");
console.log("  距离    真实xG(约)   我们的模型");
const refXG = {6:0.32, 8:0.17, 11:0.12, 14:0.08, 16:0.06, 18:0.04, 22:0.025, 25:0.015, 30:0.007, 35:0.003, 40:0.001};
for (const [d, ref] of Object.entries(refXG)) {
  const our = estimateXG('MID_A', { distance: Number(d), angle: 45, pressure: 0.1 });
  const status = Math.abs(our - ref) < ref * 0.3 ? 'OK' : '偏差';
  console.log(`  ${d}m      ${ref.toFixed(3).padStart(6)}        ${our.toFixed(4).padStart(6)}    ${status}`);
}
