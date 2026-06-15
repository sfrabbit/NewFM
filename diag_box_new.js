const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { decisionProbs, zoneBaseline, roleToStructPos } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

// ===== 理论值：逐区域打印决策分布 =====
console.log("=".repeat(70));
console.log("  决策模型：zoneBaseline → decisionProbs（无压力默认值）");
console.log("=".repeat(70));

const zones = [
  { zone: "BOX_D_C", v: "BOX_D" },
  { zone: "DEEP_D_C", v: "DEEP_D" },
  { zone: "MID_D_C", v: "MID_D" },
  { zone: "MID_A_C", v: "MID_A" },
  { zone: "DEEP_A_C", v: "DEEP_A" },
  { zone: "BOX_A_C", v: "BOX_A" },
];

const sampleRoles = ["GK", "CB_L", "FB_R", "DM_L", "CM_C", "W_L", "ST_C"];
const sampleAttrs = { 自信: 12, 力量输出: 12, 爆发: 12, 速度: 12, 控制技巧: 12 };

console.log("");
console.log("zone".padEnd(12) + "press".padStart(6) + "shoot%".padStart(8) + "pass%".padStart(8) + "drib%".padStart(8) + "base(shoot/pass/drib)");
console.log("-".repeat(60));

for (const { zone, v } of zones) {
  for (const p of [0, 0.3, 0.7]) {
    const base = zoneBaseline(v, p);
    const label = v + (p === 0 ? "_low" : p === 0.3 ? "_mid" : "_hi");
    const probs = decisionProbs(zone, "ST_C", sampleAttrs, p);
    console.log(
      label.padEnd(12) +
      p.toFixed(1).toString().padStart(6) +
      (probs.pShoot*100).toFixed(0).padStart(7) + "%" +
      (probs.pPass*100).toFixed(0).padStart(7) + "%" +
      (probs.pDribble*100).toFixed(0).padStart(7) + "%" +
      "  base(" + base.shoot.toFixed(2) + "/" + base.pass.toFixed(2) + "/" + base.dribble.toFixed(2) + ")"
    );
  }
  console.log("");
}

// ===== BOX_A with different pressure =====
console.log("=".repeat(70));
console.log("  BOX_A：压力对决策的影响（前锋 ST_C）");
console.log("=".repeat(70));

for (const p of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
  const base = zoneBaseline("BOX_A", p);
  const probs = decisionProbs("BOX_A_C", "ST_C", sampleAttrs, p);
  console.log(
    "press=" + p.toFixed(1).padStart(4) +
    "  base(" + base.shoot.toFixed(2) + "/" + base.pass.toFixed(2) + "/" + base.dribble.toFixed(2) + ")" +
    "  → shoot=" + (probs.pShoot*100).toFixed(0) + "% pass=" + (probs.pPass*100).toFixed(0) + "% drib=" + (probs.pDribble*100).toFixed(0) + "%"
  );
}

// ===== BOX_A：不同位置类型的差异 =====
console.log("");
console.log("=".repeat(70));
console.log("  BOX_A press=0.3：不同战术位置的决策差异");
console.log("=".repeat(70));

for (const role of sampleRoles) {
  const structPos = roleToStructPos(role);
  const probs = decisionProbs("BOX_A_C", role, sampleAttrs, 0.3);
  console.log(
    role.padEnd(8) + "→" + structPos.padEnd(4) +
    "  shoot=" + (probs.pShoot*100).toFixed(0) + "% pass=" + (probs.pPass*100).toFixed(0) + "% drib=" + (probs.pDribble*100).toFixed(0) + "%"
  );
}

console.log("");
console.log("=".repeat(70));
console.log("  理论分析完成");
console.log("=".repeat(70));
