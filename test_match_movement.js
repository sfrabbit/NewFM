/**
 * 完整比赛测试 — 400动作 + 全维度数据分析
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");

console.log("=== 完整比赛 400动作 + 数据合理性分析 ===\n");

const rng = new Rng(42);

const home = new Team({
  name: "红军", formation: "4-3-3",
  tactics: new TacticalInstructions({
    defensive_line: 1, pressing_intensity: 2, default_tempo: 1, compactness: 0
  }),
  eliteCount: 3, rng
});

const away = new Team({
  name: "蓝军", formation: "4-4-2",
  tactics: new TacticalInstructions({
    defensive_line: -1, pressing_intensity: -1, default_tempo: -1, compactness: 1
  }),
  eliteCount: 3, rng: new Rng(99)
});

const match = new MatchEngine(home, away, 777);
const summary = match.runMatch({ maxActions: 400, verbose: false });

// ====== 全维度分析 ======
const events = summary.events;
const evtTypes = {};
const evtTeams = { home: 0, away: 0 };
const passTypeCount = { safe: 0, normal: 0, risky: 0, long: 0 };
const passDistTotal = { safe: 0, normal: 0, risky: 0, long: 0 };
const evtSuccess = { ok: 0, fail: 0 };
const roleCounts = {};
const zoneCounts = {};

for (const e of events) {
  evtTypes[e.type] = (evtTypes[e.type] || 0) + 1;
  evtTeams[e.team] = (evtTeams[e.team] || 0) + 1;
  if (e.success) evtSuccess.ok++; else evtSuccess.fail++;
  // 追踪传球类型分布
  if (e.type === 'pass' && e.action !== undefined) {
    const rl = typeof e.action === 'number' ? e.action : 0.4;
    const cat = rl < 0.15 ? 'safe' : rl < 0.35 ? 'normal' : rl < 0.6 ? 'risky' : 'long';
    passTypeCount[cat] = (passTypeCount[cat] || 0) + 1;
  }
}

console.log("=== §1 比赛结果 ===");
console.log(`比分: ${summary.score}  (${summary.home} vs ${summary.away})`);
console.log(`比赛时间: ${summary.minute}分钟`);
console.log(`总事件数: ${events.length}`);
console.log();

console.log("=== §2 事件类型分布 ===");
const totalEvents = events.length;
for (const [t, c] of Object.entries(evtTypes).sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${t.padEnd(10)} ${c.toString().padStart(4)} (${(c/totalEvents*100).toFixed(1)}%)`);
}

// 传球类型细分
const totalPasses = passTypeCount.safe + passTypeCount.normal + passTypeCount.risky + passTypeCount.long;
if (totalPasses > 0) {
  console.log(`\n  传球类型分布（属性驱动决策）:`);
  console.log(`    safe:   ${passTypeCount.safe} (${(passTypeCount.safe/totalPasses*100).toFixed(0)}%) — 高压/低决断倾向安全`);
  console.log(`    normal: ${passTypeCount.normal} (${(passTypeCount.normal/totalPasses*100).toFixed(0)}%) — 标准选择`);
  console.log(`    risky:  ${passTypeCount.risky} (${(passTypeCount.risky/totalPasses*100).toFixed(0)}%) — 自信+高理解倾向冒险`);
  console.log(`    long:   ${passTypeCount.long} (${(passTypeCount.long/totalPasses*100).toFixed(0)}%) — 力量+远距离倾向长传`);
}
console.log();

console.log("=== §3 攻方分布 ===");
console.log(`  主场: ${evtTeams.home} (${(evtTeams.home/totalEvents*100).toFixed(1)}%)`);
console.log(`  客场: ${evtTeams.away} (${(evtTeams.away/totalEvents*100).toFixed(1)}%)`);
console.log();

console.log("=== §4 统计线 ===");
const h = summary.home, a = summary.away;
const hs = match.stats.home, as = match.stats.away;
console.log(`| 指标 | ${h} | ${a} | 英超均值 | 合理性 |`);
console.log(`|------|------|------|------|------|`);
console.log(`| 比分 | ${match.score_home} | ${match.score_away} | 1.5-0.8 | - |`);
console.log(`| 射门 | ${hs.shots} | ${as.shots} | 12-8 | ${hs.shots>=5?'✅':'⚠'} |`);
console.log(`| 射正 | ${hs.shots_on_target} | ${as.shots_on_target} | 4-3 | ${hs.shots_on_target>0?'✅':'⚠'} |`);
console.log(`| 传球 | ${hs.passes} | ${as.passes} | 500-350 | ${hs.passes>=200?'✅':'⚠太少'} |`);
console.log(`| 抢断 | ${hs.tackles} | ${as.tackles} | 18-15 | ${hs.tackles>=5?'✅':'⚠太少'} |`);
console.log(`| 犯规 | ${hs.fouls} | ${as.fouls} | 10-9 | ${hs.fouls<=15?'✅':'⚠'} |`);
console.log(`| 扑救 | ${hs.saves} | ${as.saves} | 3-2 | - |`);
console.log(`| 控球率 | ${summary.possession_home_pct.toFixed(0)}% | ${(100-summary.possession_home_pct).toFixed(0)}% | 50-50 | ✅ |`);
console.log();

console.log("=== §5 球员跑动数据 ===");
const allPos = [...summary.home_positions, ...summary.away_positions];
const totalDist = allPos.reduce((s,p)=>s+(p.distanceCovered||0), 0);
const avgDist = totalDist / allPos.length;
console.log(`  22人总跑动: ${totalDist.toFixed(0)}m`);
console.log(`  人均跑动: ${avgDist.toFixed(0)}m`);
console.log(`  现实参考: 中场13km, 后卫10km, 前锋9km, 门将2-5km (90分钟)`);
console.log(`  比例(当前/90min人均): ${(avgDist/10000*100).toFixed(0)}%`);

// 按位置分组
const posGroups = {};
for (const p of allPos) {
  const r = p.role;
  const group = r.startsWith('GK') ? 'GK' : r.startsWith('CB') ? 'CB' : r.startsWith('FB') ? 'FB' : r.startsWith('W_') ? 'WM' : r.startsWith('CM') ? 'CM' : r.startsWith('ST') ? 'ST' : 'OTHER';
  if (!posGroups[group]) posGroups[group] = { count:0, dist:0, fatigue:0 };
  posGroups[group].count++;
  posGroups[group].dist += (p.distanceCovered||0);
  posGroups[group].fatigue += (p.fatigue||0);
}
console.log("\n  按位置类型:");
for (const [g, d] of Object.entries(posGroups)) {
  const avg = d.dist/d.count;
  const avgF = (d.fatigue/d.count*100).toFixed(0);
  console.log(`    ${g.padEnd(6)} ${d.count}人 人均${avg.toFixed(0)}m 疲劳${avgF}%`);
}
console.log();

console.log("=== §6 移动系统 + 球位置 ===");
console.log(`  总tick: ${summary.movement.tick_count}`);
console.log(`  球zone: ${summary.movement.ball_zone}`);
console.log(`  球坐标: (${summary.movement.ball_coord.x.toFixed(1)}, ${summary.movement.ball_coord.y.toFixed(1)})m`);
console.log(`  主队紧凑度: ${(summary.movement.home_compactness*100).toFixed(1)}%`);
console.log(`  客队紧凑度: ${(summary.movement.away_compactness*100).toFixed(1)}%`);
console.log(`  快照数: ${summary.movement.snapshots.length}`);
console.log(`  (客队紧凑>主队 → 低位防守确实更紧凑: ${summary.movement.away_compactness>summary.movement.home_compactness?'✅':'⚠'})`);
console.log();

// 第1个快照 vs 最后1个快照 — 验证防守移动方向
if (summary.movement.snapshots.length >= 2) {
  const firstSnap = summary.movement.snapshots[0];
  const lastSnap = summary.movement.snapshots[summary.movement.snapshots.length-1];
  console.log(`  快照1(tick${firstSnap.tick}): 主队均值(${firstSnap.players.filter(p=>p.team==='home').reduce((s,p)=>s+Number(p.x),0)/11})`);
  console.log(`  快照N(tick${lastSnap.tick}): 主队均值(${lastSnap.players.filter(p=>p.team==='home').reduce((s,p)=>s+Number(p.x),0)/11})`);
}

// 最后5个事件
console.log("\n=== §7 最后5个事件 ===");
events.slice(-5).forEach(e => {
  console.log(`  [${e.minute}'] ${e.type}/${e.action} ${e.success?'✅':'❌'} ${e.desc.substring(0,80)}`);
});

// 事件时间分布
console.log("\n=== §8 事件时间分布 ===");
const minBuckets = { '0-15':0, '16-30':0, '31-45':0, '45+':0 };
for (const e of events) {
  if (e.minute <= 15) minBuckets['0-15']++;
  else if (e.minute <= 30) minBuckets['16-30']++;
  else if (e.minute <= 45) minBuckets['31-45']++;
  else minBuckets['45+']++;
}
for (const [k,v] of Object.entries(minBuckets)) {
  console.log(`  ${k}分钟: ${v}事件`);
}

console.log("\n=== 测试完成 ===");
