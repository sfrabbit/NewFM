/**
 * 1000场多组合测试 — 20+种球员能力+战术组合
 * 目的：观察数据自然涌现，分析决策分布
 * 不调参数，只统计
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");

function zoneRegion(zone) {
  if (!zone) return "未知";
  if (zone.startsWith("BOX_A")) return "禁区A";
  if (zone.startsWith("DEEP_A")) return "前场";
  if (zone.startsWith("MID_A")) return "中场A";
  if (zone.startsWith("MID_D")) return "中场D";
  if (zone.startsWith("DEEP_D")) return "后场";
  if (zone.startsWith("BOX_D")) return "禁区D";
  return "";
}

// ============================================================
// 24种战术配置（阵型×战术×球员素质）
// ============================================================
const CONFIGS = [
  // ── 4-4-2 系列 ──
  { name:"442高位压迫",  formation:"4-4-2", def:1,  press:2,  tempo:1,  comp:1,  elite:4, qual:"star" },
  { name:"442中位拦截",  formation:"4-4-2", def:0,  press:1,  tempo:1,  comp:1,  elite:2, qual:"starter" },
  { name:"442低位防守",  formation:"4-4-2", def:-1, press:-1, tempo:-1, comp:2,  elite:1, qual:"starter" },
  { name:"442快速反击",  formation:"4-4-2", def:-1, press:0,  tempo:2,  comp:0,  elite:3, qual:"star" },
  { name:"442传控控制",  formation:"4-4-2", def:1,  press:1,  tempo:-1, comp:1,  elite:5, qual:"star" },
  { name:"442保级弱队",  formation:"4-4-2", def:-2, press:-2, tempo:-2, comp:0,  elite:0, qual:"rotation" },

  // ── 4-3-3 系列 ──
  { name:"433高压快攻",  formation:"4-3-3", def:2,  press:2,  tempo:2,  comp:1,  elite:5, qual:"star" },
  { name:"433控球组织",  formation:"4-3-3", def:1,  press:1,  tempo:-1, comp:1,  elite:4, qual:"star" },
  { name:"433三中场平衡",formation:"4-3-3", def:0,  press:1,  tempo:0,  comp:1,  elite:2, qual:"starter" },
  { name:"433低配置弱队",formation:"4-3-3", def:-1, press:-1, tempo:-1, comp:1,  elite:0, qual:"rotation" },

  // ── 4-2-3-1 系列 ──
  { name:"4231双后腰稳守",formation:"4-2-3-1",def:0, press:0,  tempo:0,  comp:2,  elite:3, qual:"star" },
  { name:"4231前腰串联",  formation:"4-2-3-1",def:1, press:1,  tempo:1,  comp:1,  elite:4, qual:"star" },
  { name:"4231防守反击",  formation:"4-2-3-1",def:-2,press:0,  tempo:2,  comp:2,  elite:2, qual:"starter" },

  // ── 3-5-2 系列 ──
  { name:"352翼卫狂飙",  formation:"3-5-2", def:1,  press:2,  tempo:2,  comp:0,  elite:3, qual:"star" },
  { name:"352中路堆人",  formation:"3-5-2", def:0,  press:1,  tempo:0,  comp:2,  elite:2, qual:"starter" },
  { name:"352铁桶大巴",  formation:"3-5-2", def:-2, press:-2, tempo:-2, comp:2,  elite:1, qual:"rotation" },

  // ── 5-3-2 系列 ──
  { name:"532五后卫铁桶",formation:"5-3-2", def:-2, press:-1, tempo:0,  comp:2,  elite:2, qual:"starter" },
  { name:"532反击快马",  formation:"5-3-2", def:-1, press:0,  tempo:2,  comp:1,  elite:3, qual:"star" },
  { name:"532弱队死守",  formation:"5-3-2", def:-2, press:-2, tempo:-2, comp:2,  elite:0, qual:"rotation" },

  // ── 传奇级（全明星阵容）──
  { name:"传奇433全明星",formation:"4-3-3", def:1,  press:2,  tempo:1,  comp:1,  elite:8, qual:"star" },
  { name:"传奇442梦幻阵容",formation:"4-4-2",def:1,  press:2,  tempo:1,  comp:1,  elite:8, qual:"star" },

  // ── 极端配置 ──
  { name:"全攻433",       formation:"4-3-3", def:2,  press:2,  tempo:2,  comp:-2, elite:3, qual:"star" },
  { name:"全守532",       formation:"5-3-2", def:-2, press:-2, tempo:-2, comp:2,  elite:3, qual:"star" },
  { name:"太极拳442",     formation:"4-4-2", def:0,  press:-2, tempo:-2, comp:1,  elite:2, qual:"rotation" },
];

// ============================================================
// 跑1000场，随机配对
// ============================================================
const TOTAL = 1000;
const seed = 12345;
const baseRng = new Rng(seed);

// 统计累加器
const accum = {
  totalEvents: 0,
  homeGoals: 0,  awayGoals: 0,
  homeShots: 0,  awayShots: 0,
  homeSOT: 0,    awaySOT: 0,
  homePasses: 0,  awayPasses: 0,
  homeTackles: 0, awayTackles: 0,
  homeFouls: 0,   awayFouls: 0,
  homeSaves: 0,   awaySaves: 0,
  passes: 0, shoots: 0, dribbles: 0, tackles: 0, contests: 0,
  passSafe: 0, passNormal: 0, passRisky: 0, passLong: 0,
  dribbleBurst: 0, dribbleControl: 0, dribbleForce: 0, dribbleShield: 0, dribbleFeint: 0,
  // by-zone breakdown
  zoneEvt: {}, // { zone: { type: count } }
  // pass distance tracking
  passDistSafe: 0, passDistNormal: 0, passDistRisky: 0, passDistLong: 0,
  totalMinutes: 0,
  totalDist: 0,
  scores: [], // [{home, away}]
  possessionDiffs: [],
  matches: 0,
};

function pad6(s) { return s.toString().padStart(6); }
function pct(v,t) { return t>0 ? (v/t*100).toFixed(1)+"%" : "0.0%"; }

console.log("┌" + "─".repeat(78) + "┐");
console.log("│" + " 1000场比赛多组合测试".padEnd(78) + "│");
console.log("│" + (" 配置数: " + CONFIGS.length + " | 每场配对随机抽取 | 共" + TOTAL + "场").padEnd(78) + "│");
console.log("└" + "─".repeat(78) + "┘");
console.log();

let lastPct = -1;
for (let m = 0; m < TOTAL; m++) {
  const pct = Math.floor(m / TOTAL * 100);
  if (pct > lastPct) {
    process.stdout.write("\r  进度: " + pct + "% (" + m + "/" + TOTAL + ")");
    lastPct = pct;
  }

  // 随机选两支不同配置
  const i = baseRng.randint(0, CONFIGS.length - 1);
  let j = i;
  while (j === i) j = baseRng.randint(0, CONFIGS.length - 1);
  const hc = CONFIGS[i], ac = CONFIGS[j];

  const home = new Team({
    name: hc.name + "(主)", formation: hc.formation,
    tactics: new TacticalInstructions({
      defensive_line: hc.def, pressing_intensity: hc.press,
      default_tempo: hc.tempo, compactness: hc.comp
    }),
    eliteCount: hc.elite, rng: new Rng(baseRng.randint(1, 999999))
  });
  const away = new Team({
    name: ac.name + "(客)", formation: ac.formation,
    tactics: new TacticalInstructions({
      defensive_line: ac.def, pressing_intensity: ac.press,
      default_tempo: ac.tempo, compactness: ac.comp
    }),
    eliteCount: ac.elite, rng: new Rng(baseRng.randint(1, 999999))
  });

  const mx = new MatchEngine(home, away, baseRng.randint(1, 999999));
  const summary = mx.runMatch({ maxActions: 400, verbose: false });

  // 累加
  accum.totalEvents += summary.events.length;
  accum.homeGoals += mx.score_home;  accum.awayGoals += mx.score_away;
  accum.homeShots += mx.stats.home.shots;  accum.awayShots += mx.stats.away.shots;
  accum.homeSOT += mx.stats.home.shots_on_target; accum.awaySOT += mx.stats.away.shots_on_target;
  accum.homePasses += mx.stats.home.passes;  accum.awayPasses += mx.stats.away.passes;
  accum.homeTackles += mx.stats.home.tackles; accum.awayTackles += mx.stats.away.tackles;
  accum.homeFouls += mx.stats.home.fouls;    accum.awayFouls += mx.stats.away.fouls;
  accum.homeSaves += mx.stats.home.saves;    accum.awaySaves += mx.stats.away.saves;
  accum.totalMinutes += summary.minute;
  accum.scores.push({ home: mx.score_home, away: mx.score_away });
  accum.possessionDiffs.push(summary.possession_home_pct - 50);

  // 事件类型 — 注意 type="pass" → accum.passes 而非 accum.passs
  const evtProp = { pass:"passes", dribble:"dribbles", shoot:"shoots", tackle:"tackles", contest:"contests" };
  for (const e of summary.events) {
    const prop = evtProp[e.type] || (e.type + "s");
    accum[prop] = (accum[prop] || 0) + 1;
    if (e.type === "pass" && e.action !== undefined) {
      // action 现在是连续的 riskLevel (0-1)
      const rl = typeof e.action === 'number' ? e.action : 0.4;
      if (rl < 0.15) accum.passSafe += 1;
      else if (rl < 0.35) accum.passNormal += 1;
      else if (rl < 0.6) accum.passRisky += 1;
      else accum.passLong += 1;
    }
    if (e.type === "dribble" && e.action) {
      const key = "dribble" + e.action[0].toUpperCase() + e.action.slice(1);
      accum[key] = (accum[key] || 0) + 1;
    }
    // zone breakdown (sampled every 10th match)
    if (m % 10 === 0) {
      const zr = zoneRegion(e.zone || "");
      if (!accum.zoneEvt[zr]) accum.zoneEvt[zr] = {};
      accum.zoneEvt[zr][e.type] = (accum.zoneEvt[zr][e.type] || 0) + 1;
    }
  }

  // 跑动距离
  const allPos = [...summary.home_positions, ...summary.away_positions];
  accum.totalDist += allPos.reduce((s,p)=>s+(p.distanceCovered||0), 0);

  accum.matches++;
}

process.stdout.write("\r  进度: 100% (" + TOTAL + "/" + TOTAL + ")\n\n");

// ============================================================
// 输出汇总
// ============================================================
const M = accum.matches;
function avg(v) { return M>0 ? (v/M).toFixed(1) : "nan"; }
function avgInt(v) { return M>0 ? Math.round(v/M) : 0; }

console.log("=".repeat(80));
console.log("  汇总统计 (" + M + "场比赛)");
console.log("=".repeat(80));

console.log("\n  ── 场均比分 ──");
console.log("  主场: " + avg(accum.homeGoals) + "  客场: " + avg(accum.awayGoals) + "  总进球: " + avg(accum.homeGoals+accum.awayGoals));

// 比分分布
const scoreBuckets = {};
for (const s of accum.scores) {
  const total = s.home + s.away;
  const k = total < 3 ? total : total < 5 ? "3-4球" : total < 7 ? "5-6球" : "7+球";
  scoreBuckets[k] = (scoreBuckets[k]||0) + 1;
}
console.log("\n  ── 比分分布 ──");
for (const [k,v] of Object.entries(scoreBuckets).sort((a,b)=> {
  const na=parseInt(a[0]),nb=parseInt(b[0]);
  if (!isNaN(na)&&!isNaN(nb)) return na-nb;
  return a[0].localeCompare(b[0]);
})) {
  console.log("  总" + k + "球: " + v + "场 (" + pct(v,M) + ")");
}

// 胜平负
let hWins=0, draws=0, aWins=0;
for (const s of accum.scores) {
  if (s.home > s.away) hWins++;
  else if (s.home < s.away) aWins++;
  else draws++;
}
console.log("  主胜:"+hWins+"("+pct(hWins,M)+") 平:"+draws+"("+pct(draws,M)+") 客胜:"+aWins+"("+pct(aWins,M)+")");

console.log("\n  ── 场均技术统计 ──");
console.log("  " + "指标".padEnd(14) + "主场".padStart(8) + "客场".padStart(8) + "合计".padStart(8));
console.log("  " + "-".repeat(38));
const row = (label, hv, av) => {
  console.log("  " + label.padEnd(14) + avgInt(hv).toString().padStart(8) + avgInt(av).toString().padStart(8) + avgInt(hv+av).toString().padStart(8));
};
row("射门", accum.homeShots, accum.awayShots);
row("射正", accum.homeSOT, accum.awaySOT);
row("传球", accum.homePasses, accum.awayPasses);
row("抢断", accum.homeTackles, accum.awayTackles);
row("犯规", accum.homeFouls, accum.awayFouls);
row("扑救", accum.homeSaves, accum.awaySaves);

console.log("\n  射正率: 主" + pct(accum.homeSOT,accum.homeShots) + " 客" + pct(accum.awaySOT,accum.awayShots));

console.log("\n  ── 场均事件分布 ──");
const totalEvt = accum.passes + accum.shoots + accum.dribbles + accum.tackles + accum.contests;
const evtAvg = totalEvt / M;
console.log("  场均总事件: " + evtAvg.toFixed(0));
for (const [k,v] of [["pass",accum.passes],["dribble",accum.dribbles],["shoot",accum.shoots],["tackle",accum.tackles],["contest",accum.contests]]) {
  console.log("  " + k.padEnd(10) + pad6(avgInt(v)) + "/场 (" + pct(v,totalEvt) + ")");
}

console.log("\n  ── 传球类型 → 同队长短传比例 ──");
for (const [k,v] of [["passSafe",accum.passSafe],["passNormal",accum.passNormal],["passRisky",accum.passRisky],["passLong",accum.passLong]]) {
  console.log("  " + k.replace("pass","").padEnd(10) + pad6(avgInt(v)) + "/场 (" + pct(v,accum.passes) + ")");
}

console.log("\n  ── 盘带类型 → 场均 ──");
for (const [k,v] of [["dribbleBurst",accum.dribbleBurst],["dribbleControl",accum.dribbleControl],["dribbleForce",accum.dribbleForce],["dribbleShield",accum.dribbleShield],["dribbleFeint",accum.dribbleFeint]]) {
  const totalD = accum.dribbles || 1;
  console.log("  " + k.replace("dribble","").padEnd(10) + pad6(avgInt(v)) + "/场 (" + pct(v,totalD) + ")");
}

// zone breakdown
if (Object.keys(accum.zoneEvt).length > 0) {
  console.log("\n  ── 区域×事件类型（采样100场） ──");
  const evtTypesAll = ["pass","shoot","dribble","tackle","contest"];
  process.stdout.write("  区域".padEnd(10));
  for (const t of evtTypesAll) process.stdout.write(t.padStart(7));
  process.stdout.write("  pass率\n");
  for (const [z, counts] of Object.entries(accum.zoneEvt).sort()) {
    const zTotal = Object.values(counts).reduce((a,b)=>a+b,0);
    if (zTotal < 5) continue;
    process.stdout.write("  " + z.padEnd(10));
    const pc = counts["pass"]||0;
    for (const t of evtTypesAll) process.stdout.write((counts[t]||0).toString().padStart(7));
    process.stdout.write("  " + (pc/zTotal*100).toFixed(0) + "%\n");
  }
}

console.log("\n  ── 时间 ──");
console.log("  场均比赛时间: " + avg(accum.totalMinutes) + "分钟");
console.log("  场均跑动: " + avg(accum.totalDist/M/22) + "m/人");

console.log("\n  ── 控球率分布 ──");
const posDiffs = accum.possessionDiffs;
const avgPosDiff = posDiffs.reduce((a,b)=>a+b,0)/posDiffs.length;
const posBuckets = { "主<40%":0, "40-45%":0, "45-50%":0, "50-55%":0, "55-60%":0, "主>60%":0 };
for (const d of posDiffs) {
  const hp = 50 + d;
  if (hp < 40) posBuckets["主<40%"]++;
  else if (hp < 45) posBuckets["40-45%"]++;
  else if (hp < 50) posBuckets["45-50%"]++;
  else if (hp < 55) posBuckets["50-55%"]++;
  else if (hp < 60) posBuckets["55-60%"]++;
  else posBuckets["主>60%"]++;
}
for (const [k,v] of Object.entries(posBuckets)) {
  console.log("  " + k + ": " + v + "场 (" + pct(v,M) + ")");
}

console.log("\n" + "=".repeat(80));
console.log("  测试完成 — 所有数据均自然涌现，未调任何参数");
console.log("=".repeat(80));
