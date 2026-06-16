/**
 * 对比引擎决策 vs 现实基准
 * 基于 1000场审计数据 + reference_data.md 的现实数据
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { estimateXG, decisionProbs } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };
const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2"];
const tempos = [-1, 0, 1];
const presses = [-1, 0, 1];

// ── zone × role × action 统计 ──
const stats = {};

function ensure(obj, ...keys) {
  let cur = obj;
  for (const k of keys) { if (!cur[k]) cur[k] = {}; cur = cur[k]; }
  return cur;
}
function incr(obj, key) { obj[key] = (obj[key] || 0) + 1; }

// 额外记录 角色→zone分布 和 总体计数
const roleZoneDist = {}; // { roleBase → { v → count } }
let totalShots = 0, totalPasses = 0, totalDribbles = 0;
let totalActions = 0;

for (let i = 0; i < 500; i++) {
  const fm = formations[i % 5];
  const home = new Team({ name:"H"+i, formation:fm,
    tactics: new TacticalInstructions({ defensive_line:(i%3)-1, pressing_intensity:(i%3)-1, default_tempo:(i%3)-1, compactness:(i%3)-1 }),
    eliteCount:(i%4), rng:new Rng(i*31+99)
  });
  const away = new Team({ name:"A"+i, formation:formations[(i+3)%5],
    tactics: new TacticalInstructions({ defensive_line:(i%3)-1, pressing_intensity:(i%3)-1, default_tempo:(i%3)-1, compactness:(i%3)-1 }),
    eliteCount:(i%4)+1, rng:new Rng(i*53+201)
  });
  const mx = new MatchEngine(home, away, i*100+777);

  const origStep = mx.step.bind(mx);
  mx.step = function() {
    const result = origStep();
    if (!result) return result;
    totalActions++;

    // 用result.zone确定决策后位置
    const zone = result.zone || this.ball_zone || 'MID_D_C';
    const v = getZoneV(zone);
    const carrier = this._getCarrierPlayer();
    const role = carrier ? carrier.role : '?';
    const roleBase = role ? role.split("_")[0] : "?";

    // zone×role×action
    incr(ensure(stats, v, roleBase), result.type);
    incr(ensure(roleZoneDist, roleBase), v);

    if (result.type === 'shoot') totalShots++;
    if (result.type === 'pass') totalPasses++;
    if (result.type === 'dribble') totalDribbles++;

    return result;
  };
  mx.runMatch({ maxActions: 400, verbose: false });
}

// ── 计算 ──
console.log("=".repeat(100));
console.log("引擎决策 vs 现实基准对比");
console.log("=".repeat(100));

console.log(`\n总计: ${totalActions}次行动, 射门${totalShots}(${(totalShots/totalActions*100).toFixed(1)}%) 盘带${totalDribbles}(${(totalDribbles/totalActions*100).toFixed(1)}%) 传球${totalPasses}(${(totalPasses/totalActions*100).toFixed(1)}%)`);

// ============================
// 1. 对比：射门占比
// ============================
console.log("\n" + "─".repeat(100));
console.log("1. 射门占比对比（每场每队 ≈ 400actions × 50%进攻方 ≈ 200次进攻决策）");
console.log("─".repeat(100));

const ZONE_ORDER = ["BOX_A", "DEEP_A", "MID_A", "MID_D", "DEEP_D", "BOX_D"];
const ROLE_ORDER = ["ST", "W", "IF", "AM", "CM", "DM", "FB", "WB", "CB"];

console.log("\n  区域   角色    行动数  射门%  传球%  盘带%   现实判断");
console.log("  ──────────────────────────────────────────────");

for (const v of ZONE_ORDER) {
  const vd = stats[v];
  if (!vd) continue;
  for (const rb of ROLE_ORDER) {
    const d = vd[rb];
    if (!d) continue;
    const ttl = (d.shoot||0)+(d.pass||0)+(d.dribble||0)+(d.tackle||0)+(d.contest||0);
    if (ttl < 50) continue;
    const sp = (d.shoot||0)/ttl*100, pp = (d.pass||0)/ttl*100, dp = (d.dribble||0)/ttl*100;

    // 现实判断
    let judge = "";
    if (v === "ST" && ["BOX_A","DEEP_A"].includes(v)) {
      judge = sp >= 30 && sp <= 55 ? "✅" : "⚠️";
    } else if (v === "MID_D" && ["CM","DM","FB","CB","WB"].includes(rb)) {
      judge = sp <= 3 ? "✅ 偶有远射" : "⚠️ 偏高";
    } else if (v === "DEEP_D" || v === "BOX_D") {
      judge = sp === 0 ? "✅" : "⚠️ 后场射门";
    } else {
      judge = "—";
    }

    console.log(`  ${v.padEnd(8)} ${rb.padEnd(6)} ${String(ttl).padStart(5)}  ${sp.toFixed(1).padStart(5)}% ${pp.toFixed(1).padStart(5)}% ${dp.toFixed(1).padStart(5)}% ${judge}`);
  }
}

// ============================
// 2. 对比：角色在哪活动
// ============================
console.log("\n\n" + "─".repeat(100));
console.log("2. 角色→zone 分布（验证阵型部署是否合理）");
console.log("─".repeat(100));
console.log("  真实基准: CB主要在BOX_D/DEEP_D, CM在MID_D/MID_A, ST在DEEP_A/BOX_A");

for (const rb of ROLE_ORDER) {
  const zd = roleZoneDist[rb];
  if (!zd) continue;
  let total = 0;
  for (const k of Object.keys(zd)) total += zd[k];

  const parts = [];
  for (const v of ZONE_ORDER) {
    const cnt = zd[v] || 0;
    const pct = (cnt / total * 100);
    if (pct > 2) parts.push(`${v}:${pct.toFixed(0)}%`);
  }
  console.log(`  ${rb.padEnd(4)}: ${parts.join("  ")}`);
}

// ============================
// 3. 对比：盘带占比
// ============================
console.log("\n\n" + "─".repeat(100));
console.log("3. 盘带占比对比");
console.log("─".repeat(100));
console.log("  真实基准(StatsBomb 25场): 710次盘带 / 20490次传球 ≈ 3.5%盘带:传球");
console.log(`  引擎(500场): ${totalDribbles}次盘带 / ${totalPasses}次传球 = ${(totalDribbles/totalPasses*100).toFixed(1)}%盘带:传球`);

console.log("\n  各角色盘带占比(所有zone合计):");
for (const rb of ROLE_ORDER) {
  let tbTotal = 0, tbDrib = 0;
  for (const v of Object.keys(stats)) {
    const d = stats[v][rb];
    if (!d) continue;
    tbTotal += (d.shoot||0)+(d.pass||0)+(d.dribble||0);
    tbDrib += (d.dribble||0);
  }
  if (tbTotal < 100) continue;
  const dp = tbDrib / tbTotal * 100;
  // 现实：边锋盘带多, 中后卫盘带少
  let rjudge = "";
  if (rb === "W" || rb === "IF") rjudge = dp >= 5 && dp <= 15 ? "✅" : "⚠️";
  else if (rb === "CB") rjudge = dp <= 3 ? "✅ 后卫少带" : "⚠️";
  else if (rb === "CM" || rb === "DM") rjudge = dp >= 5 && dp <= 20 ? "✅" : "⚠️";
  else rjudge = "—";
  console.log(`    ${rb.padEnd(4)}: ${tbDrib}/${tbTotal} = ${dp.toFixed(1)}% ${rjudge}`);
}

// ============================
// 4. 平均每场射门数
// ============================
console.log("\n\n" + "─".repeat(100));
console.log("4. 平均射门数");
console.log("─".repeat(100));
console.log(`  真实基准: 英超场均25.9次(双方合计), 每队≈13次`);
console.log(`  引擎(500场): ${totalShots}次射门 / 500场 = ${(totalShots/500).toFixed(1)}次/场(双方合计)`);
console.log(`              每队≈${(totalShots/500/2).toFixed(1)}次`);

// ============================
// 5. 各角色射门贡献
// ============================
console.log("\n\n" + "─".repeat(100));
console.log("5. 各角色射门贡献排行");
console.log("─".repeat(100));
console.log("  真实基准: ST占比最高(≈40-50%), W/IF次之(≈20-30%), CM/DM少量(≈10-15%), 后卫极少");

const roleShotRank = [];
for (const rb of ROLE_ORDER) {
  let shots = 0;
  for (const v of Object.keys(stats)) {
    shots += (stats[v][rb]?.shoot || 0);
  }
  if (shots > 0) roleShotRank.push({ role: rb, shots, pct: (shots/totalShots*100).toFixed(1) });
}
roleShotRank.sort((a,b) => b.shots - a.shots);

for (const r of roleShotRank) {
  const p = parseFloat(r.pct);
  let j = "";
  if (r.role === "ST" && p >= 30 && p <= 55) j = "✅";
  else if ((r.role === "W" || r.role === "IF") && p >= 15 && p <= 35) j = "✅";
  else if ((r.role === "CM" || r.role === "AM") && p >= 5 && p <= 20) j = "✅";
  else if ((r.role === "FB" || r.role === "WB" || r.role === "CB") && p >= 1 && p <= 8) j = "✅";
  console.log(`  ${r.role.padEnd(4)}: ${r.shots.toString().padStart(7)}次  ${r.pct}% ${j}`);
}
console.log("\n  验证: 射门是否主要由前锋/边锋贡献? 中场是否有适量参与? 后卫极少射门?");
