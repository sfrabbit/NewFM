/**
 * 1000场深度审计 — 按阵型×角色×属性追踪决策
 * 验证：(1)各角色决策是否现实 (2)阵型/属性切换后决策是否合理变化
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { estimateXG, decisionProbs } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };

const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2"];
const qualities = ["starter", "rotation", "star"];
const tempos = [-1, 0, 1];
const presses = [-1, 0, 1];

// ── 角色分组 ──
const ROLE_GROUPS = {
  ST: "前锋", W: "边锋", IF: "前锋", AM: "前腰",
  CM: "中场", DM: "中场",
  CB: "后卫", FB: "后卫", WB: "后卫",
  GK: "门将"
};
function roleGroup(role) {
  if (!role) return "未知";
  const base = role.split("_")[0];
  return ROLE_GROUPS[base] || base;
}

// ── 数据结构 ──
// zoneRoleStats[v][roleBase][action] = count
const zoneRoleStats = {}; // { v → { roleBase → { shoot, pass, dribble, ... } } }
const attrImpact = [];    // [{ role, conf, team, zone, action, formation }]
const formStats = {};     // { formation → { v → { roleGroup → { shoot, pass, ... } } } }

function ensure(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (!cur[k]) cur[k] = {};
    cur = cur[k];
  }
  return cur;
}

function incr(obj, key) { obj[key] = (obj[key] || 0) + 1; }

// ── 运行1000场 ──
const total = 1000;
const startTime = Date.now();

for (let i = 0; i < total; i++) {
  const fm = formations[i % formations.length];
  const qa = qualities[i % qualities.length];
  const qb = qualities[(i + 2) % qualities.length];
  const ta = tempos[i % 3];
  const pb = presses[i % 3];
  const pc = presses[(i + 1) % 3];
  const ec = (i % 4);

  const home = new Team({
    name: "H" + i, formation: fm,
    tactics: new TacticalInstructions({ defensive_line: pc, pressing_intensity: pb, default_tempo: ta, compactness: pc }),
    eliteCount: ec, rng: new Rng(i * 31 + 99)
  });
  const away = new Team({
    name: "A" + i, formation: formations[(i + 3) % formations.length],
    tactics: new TacticalInstructions({ defensive_line: pb, pressing_intensity: pc, default_tempo: ta, compactness: pb }),
    eliteCount: ec + 1, rng: new Rng(i * 53 + 201)
  });
  const mx = new MatchEngine(home, away, i * 100 + 777);

  const origStep = mx.step.bind(mx);
  mx.step = function () {
    const result = origStep();
    if (!result) return result;

    // 从match state获取决策时信息
    const zone = result.zone || this.ball_zone || 'MID_D_C';
    const v = getZoneV(zone);
    const carrier = this._getCarrierPlayer();
    const role = carrier ? carrier.role : '?';
    const roleBase = role ? role.split("_")[0] : "?";
    const attrs = carrier ? carrier.attrs || {} : {};
    const conf = attrs["自信"] || 10;
    const team = attrs["团队"] || 10;

    // zone×role×action
    const zrs = ensure(zoneRoleStats, v, roleBase);
    incr(zrs, result.type);

    // formation×v×roleGroup×action
    const frs = ensure(formStats, fm, v, roleGroup(role));
    incr(frs, result.type);

    // 抽样记录属性影响（每100个action记录一条）
    if (attrImpact.length < 50000 && Math.random() < 0.01) {
      const angle = zone ? zone.split('_')[2] || 'C' : 'C';
      const angleIdx = { L: 0, CL: 1, C: 2, CR: 3, R: 4 }[angle] || 2;
      const xg = estimateXG(v, { distance: distMap[v] || 25, angle: angleIdx * 18, pressure: 0 });
      attrImpact.push({ role: roleBase, conf, team, v, action: result.type, formation: fm, xg });
    }

    return result;
  };

  mx.runMatch({ maxActions: 400, verbose: false });
  if ((i + 1) % 100 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  进度: ${i + 1}/${total} (${elapsed}s)`);
  }
}

// ── 输出报告 ──
console.log("\n" + "=".repeat(80));
console.log("1000场深度审计报告");
console.log("=".repeat(80));

// ============================
// 1. zone × role × action 分布
// ============================
console.log("\n### 1. 各区域 × 角色基类 × 决策分布\n");
const ZONE_ORDER = ["BOX_A", "DEEP_A", "MID_A", "MID_D", "DEEP_D", "BOX_D"];
const ROLE_ORDER = ["ST", "W", "IF", "AM", "CM", "DM", "FB", "WB", "CB"];

for (const v of ZONE_ORDER) {
  const vData = zoneRoleStats[v];
  if (!vData) continue;
  console.log(`\n--- ${v} (${distMap[v]}m) ---`);

  // 表头
  console.log(`  ${"角色".padEnd(8)} ${"shoot".padStart(6)} ${"pass".padStart(6)} ${"drib".padStart(6)} ${"tackle".padStart(6)} ${"contest".padStart(7)} ${"总计".padStart(7)}`);

  for (const rb of ROLE_ORDER) {
    const d = vData[rb];
    if (!d) continue;
    const shoot = d.shoot || 0;
    const pass = d.pass || 0;
    const drib = d.dribble || 0;
    const tackle = d.tackle || 0;
    const contest = d.contest || 0;
    const ttl = shoot + pass + drib + tackle + contest;
    if (ttl < 10) continue; // 样本太小不显示

    const sp = shoot / ttl * 100, pp = pass / ttl * 100, dp = drib / ttl * 100;
    const tkp = tackle / ttl * 100, cp = contest / ttl * 100;

    // 标记异常
    let flag = "";
    if (v === "MID_D" && shoot > 0 && ttl > 20) {
      if (sp > 5) flag = " ⚠️远射偏高";
    }
    if (v === "BOX_D" && drib > 0) flag = " ⚠️禁区盘带";
    if (v === "DEEP_D" && shoot > 0) flag = " ⚠️后场射门";

    console.log(`  ${rb.padEnd(8)} ${sp.toFixed(1).padStart(5)}% ${pp.toFixed(1).padStart(5)}% ${dp.toFixed(1).padStart(5)}% ${tkp.toFixed(1).padStart(5)}% ${cp.toFixed(1).padStart(6)}% ${ttl.toString().padStart(7)}${flag}`);
  }
}

// ============================
// 2. 属性影响分析
// ============================
console.log("\n\n### 2. 球员属性(自信/团队)对射门决策的影响\n");
console.log("验证：同一zone下，自信高→pShoot高，团队高→pShoot低");

// 按 v×role×conf_bucket 分组
const attrBuckets = {};
for (const entry of attrImpact) {
  const key = `${entry.v}|${entry.role}`;
  if (!attrBuckets[key]) attrBuckets[key] = [];
  attrBuckets[key].push(entry);
}

// 只分析样本足够的zone+role组合
for (const [key, entries] of Object.entries(attrBuckets)) {
  if (entries.length < 30) continue;
  const [v, role] = key.split("|");

  // 按自信分组
  const lowConf = entries.filter(e => e.conf <= 8);
  const midConf = entries.filter(e => e.conf >= 9 && e.conf <= 12);
  const highConf = entries.filter(e => e.conf >= 14);

  const shootRate = (arr) => arr.length > 0 ? (arr.filter(e => e.action === 'shoot').length / arr.length * 100) : -1;

  const sl = shootRate(lowConf), sm = shootRate(midConf), sh = shootRate(highConf);

  if (sl < 0 || sm < 0 || sh < 0) continue;

  // 只在有明显差异或MID_D时展示
  if (Math.abs(sl - sh) > 2 || v === "MID_D") {
    console.log(`  ${v} ${role.padEnd(4)}: 低自信(≤8) ${sl.toFixed(1)}% → 中自信(9-12) ${sm.toFixed(1)}% → 高自信(≥14) ${sh.toFixed(1)}%  (样本:${lowConf.length}/${midConf.length}/${highConf.length})`);
  }
}

// 也检查团队属性影响
console.log("\n  团队属性对 pass 决策的影响:");
for (const [key, entries] of Object.entries(attrBuckets)) {
  if (entries.length < 30) continue;
  const [v, role] = key.split("|");

  const lowTeam = entries.filter(e => e.team <= 7);
  const highTeam = entries.filter(e => e.team >= 14);
  const passRate = (arr) => arr.length > 0 ? (arr.filter(e => e.action === 'pass').length / arr.length * 100) : -1;
  const pl = passRate(lowTeam), ph = passRate(highTeam);
  if (pl < 0 || ph < 0) continue;
  if (Math.abs(pl - ph) > 3) {
    console.log(`  ${v} ${role.padEnd(4)}: 低团队(≤7) ${pl.toFixed(1)}% → 高团队(≥14) ${ph.toFixed(1)}%`);
  }
}

// ============================
// 3. 阵型切换影响
// ============================
console.log("\n\n### 3. 阵型切换对决策的影响\n");
console.log("验证：同一zone+角色组，不同阵型下决策应基本一致（物理条件主导）");
console.log("（差异主要来自阵型部署位置不同导致不同zone出现频率不同）\n");

const formList = Object.keys(formStats).sort();
for (const v of ZONE_ORDER) {
  // 收集各阵型在v的决策分布
  const fDecisions = {};
  for (const fm of formList) {
    const vd = (formStats[fm] || {})[v];
    if (!vd) continue;
    let total = 0, shoots = 0;
    for (const [rg, acts] of Object.entries(vd)) {
      total += (acts.shoot || 0) + (acts.pass || 0) + (acts.dribble || 0);
      shoots += (acts.shoot || 0);
    }
    if (total > 30) fDecisions[fm] = { total, shoots, pct: shoots / total * 100 };
  }
  if (Object.keys(fDecisions).length < 2) continue;

  // 只看pct有差异的zone
  const pcts = Object.values(fDecisions).map(d => d.pct);
  const maxDiff = Math.max(...pcts) - Math.min(...pcts);
  if (maxDiff < 3) continue;

  console.log(`  ${v}:`);
  for (const [fm, d] of Object.entries(fDecisions)) {
    console.log(`    ${fm}: shoot=${d.pct.toFixed(1)}% (${d.shoots}/${d.total})`);
  }
}

// ============================
// 4. 异常总览
// ============================
console.log("\n\n### 4. 偏离总览\n");

// 检视DEEP_D射门
console.log("  DEEP_D(后场)射门:");
for (const rb of ROLE_ORDER) {
  const d = zoneRoleStats["DEEP_D"]?.[rb];
  if (!d || !d.shoot) continue;
  console.log(`    ${rb}: ${d.shoot}次`);
}

// 检视BOX_D盘带
console.log("\n  BOX_D(本方禁区)盘带:");
for (const rb of ROLE_ORDER) {
  const d = zoneRoleStats["BOX_D"]?.[rb];
  if (!d || !d.dribble) continue;
  console.log(`    ${rb}: ${d.dribble}次`);
}

console.log("\n审计完成。");
