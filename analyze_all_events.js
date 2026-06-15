/**
 * 深度事件分析 — 所有事件×角色×区域×成功率的交叉报表
 * 不调参数，只看决策偏差
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");

// 跑1场详细比赛，收集所有事件的完整上下文
const CONFIGS = [
  { name:"高位压迫强队", formation:"4-3-3", def:1, press:2, tempo:1, comp:1, elite:4 },
  { name:"低位防守弱队", formation:"4-4-2", def:-1, press:-1, tempo:-1, comp:2, elite:1 },
];

const rng = new Rng(42);
const home = new Team({
  name: "主队", formation: CONFIGS[0].formation,
  tactics: new TacticalInstructions({
    defensive_line: CONFIGS[0].def, pressing_intensity: CONFIGS[0].press,
    default_tempo: CONFIGS[0].tempo, compactness: CONFIGS[0].comp
  }),
  eliteCount: CONFIGS[0].elite, rng: new Rng(rng.randint(1, 999999))
});
const away = new Team({
  name: "客队", formation: CONFIGS[1].formation,
  tactics: new TacticalInstructions({
    defensive_line: CONFIGS[1].def, pressing_intensity: CONFIGS[1].press,
    default_tempo: CONFIGS[1].tempo, compactness: CONFIGS[1].comp
  }),
  eliteCount: CONFIGS[1].elite, rng: new Rng(rng.randint(1, 999999))
});

// 先看两个队的实际球员属性
console.log("=".repeat(100));
console.log("  球员属性一览（每项/20）");
console.log("=".repeat(100));

function printTeam(team) {
  const allPlayers = Object.values(team.players).slice(0, 16);
  for (const p of allPlayers) {
    const a = p.attrs;
    const keyAttrs = {
      角色: p.role, 自信:a["自信"], 力量:a["力量输出"], 触球:a["触球精度"],
      理解:a["足球理解"], 爆发:a["爆发"], 速度:a["速度"], 控技:a["控制技巧"],
      空中:a["空中能力"], 耐:a["耐力"], 对抗:a["对抗"], 防技:a["防守技术"],
      队友:a["队友识别"], 决断:a["决断速度"], 团队:a["团队导向"]
    };
    process.stdout.write("  " + p.role.padEnd(8) + p.role_name.padEnd(12));
    let attrs = [];
    for (const [k,v] of Object.entries(keyAttrs)) {
      if (k !== "角色") attrs.push(k + "=" + v);
    }
    console.log(attrs.join(" "));
  }
}
console.log("\n=== 主队(" + CONFIGS[0].name + ") ===");
printTeam(home);
console.log("\n=== 客队(" + CONFIGS[1].name + ") ===");
printTeam(away);

// 跑比赛并收集所有事件
const mx = new MatchEngine(home, away, 777);
const summary = mx.runMatch({ maxActions: 400, verbose: false });

console.log("\n\n" + "=".repeat(100));
console.log("  完整事件序列（开局20事件 → 最后20事件 → 全部统计）");
console.log("=".repeat(100));

const events = summary.events;

// 打印前20和后20
function printEvent(e, i) {
  const mark = e.success ? "✓" : "✗";
  const zoneShort = e.zone ? e.zone.substring(0,8) : "??";
  process.stdout.write(
    (i+1).toString().padStart(3) + " " +
    e.minute.toString().padStart(2) + "' " +
    (e.type+"/"+e.action).padEnd(18) +
    mark + " " +
    zoneShort.padEnd(10)
  );
  // carrier 信息
  if (e.carrier_pid) {
    const roleMatch = e.carrier_pid.match(/_(.+)$/);
    if (roleMatch) process.stdout.write(" carrier:" + roleMatch[1].padEnd(8));
  }
  // 简化描述
  const descShort = (e.desc||"").replace(/\[\d+\'\]\s*/,"").substring(0, 35);
  process.stdout.write(" " + descShort);
  console.log();
}

console.log("\n── 开局20个事件 ──");
for (let i = 0; i < Math.min(20, events.length); i++) printEvent(events[i], i);

console.log("\n── 最后20个事件 ──");
for (let i = Math.max(0, events.length-20); i < events.length; i++) printEvent(events[i], i);

// ============================================================
// 全事件交叉分析
// ============================================================
console.log("\n\n" + "=".repeat(100));
console.log("  交叉表1: 角色 × 事件类型（持球者角色分类）");
console.log("=".repeat(100));

// 从carrier_pid提取角色
function pidRole(pid) {
  if (!pid) return "未知";
  // pid格式: 主队_CM_C_1 或 客队_W_L_2，提取中间角色部分
  const parts = pid.split("_");
  // 去掉队名前缀和末尾序号
  let roleParts = [];
  for (let i = 1; i < parts.length; i++) {
    if (/^\d+$/.test(parts[i])) break; // 遇到纯数字=序号，停止
    roleParts.push(parts[i]);
  }
  if (roleParts.length === 0) return pid;
  return roleParts.join("_");
}

const roleEventMap = {}; // { role: { type: count, ... } }
const roleTotal = {};
for (const e of events) {
  const role = pidRole(e.carrier_pid);
  if (!roleEventMap[role]) { roleEventMap[role] = {}; roleTotal[role] = 0; }
  roleEventMap[role][e.type] = (roleEventMap[role][e.type] || 0) + 1;
  roleTotal[role]++;
}

const evtTypesAll = ["pass","shoot","dribble","tackle","contest"];
// 表头
process.stdout.write("  角色".padEnd(16) + "总数".padStart(5));
for (const t of evtTypesAll) process.stdout.write(t.padStart(7));
process.stdout.write("  主要行为\n");
process.stdout.write("  " + "-".repeat(65) + "\n");

for (const [role, counts] of Object.entries(roleEventMap).sort((a,b)=>roleTotal[b]-roleTotal[a])) {
  if (roleTotal[role] < 3) continue;
  process.stdout.write("  " + role.padEnd(16) + roleTotal[role].toString().padStart(5));
  let maxType="", maxCount=0;
  for (const t of evtTypesAll) {
    const c = counts[t]||0;
    process.stdout.write(c.toString().padStart(7));
    if (c>maxCount) { maxCount=c; maxType=t; }
  }
  const pct = maxCount>0 ? ((maxCount/roleTotal[role])*100).toFixed(0) : "0";
  process.stdout.write("  " + maxType + "(" + pct + "%)\n");
}
console.log();

// ============================================================
// 交叉表2: 区域 × 事件类型
// ============================================================
console.log("=".repeat(100));
console.log("  交叉表2: 球所在区域 × 事件类型");
console.log("=".repeat(100));

function zoneRegion(zone) {
  if (!zone) return "未知";
  if (zone.startsWith("BOX_A")) return "禁区A";
  if (zone.startsWith("DEEP_A")) return "前场";
  if (zone.startsWith("MID_A")) return "中场A";
  if (zone.startsWith("MID_D")) return "中场D";
  if (zone.startsWith("DEEP_D")) return "后场";
  if (zone.startsWith("BOX_D")) return "禁区D";
  return zone.substring(0,10);
}

const zoneEventMap = {};
const zoneTotal = {};
for (const e of events) {
  const z = zoneRegion(e.zone);
  if (!zoneEventMap[z]) { zoneEventMap[z] = {}; zoneTotal[z] = 0; }
  zoneEventMap[z][e.type] = (zoneEventMap[z][e.type] || 0) + 1;
  zoneTotal[z]++;
}

process.stdout.write("  区域".padEnd(10) + "总数".padStart(5));
for (const t of evtTypesAll) process.stdout.write(t.padStart(7));
process.stdout.write("  pass率\n");
process.stdout.write("  " + "-".repeat(55) + "\n");
for (const [z, counts] of Object.entries(zoneEventMap).sort()) {
  process.stdout.write("  " + z.padEnd(10) + zoneTotal[z].toString().padStart(5));
  const pc = counts["pass"]||0;
  for (const t of evtTypesAll) process.stdout.write((counts[t]||0).toString().padStart(7));
  process.stdout.write("  " + (pc/zoneTotal[z]*100).toFixed(0) + "%\n");
}
console.log();

// ============================================================
// 交叉表3: 射门 — 谁在什么距离射门？
// ============================================================
console.log("=".repeat(100));
console.log("  交叉表3: 射门事件 — 角色×区域分布");
console.log("=".repeat(100));
const shootEvents = events.filter(e => e.type === "shoot");
const shootMap = {};
for (const e of shootEvents) {
  const role = pidRole(e.carrier_pid);
  const z = zoneRegion(e.zone);
  const k = role + "@" + z;
  if (!shootMap[k]) shootMap[k] = { total:0, success:0 };
  shootMap[k].total++;
  if (e.success) shootMap[k].success++;
}

process.stdout.write("  持球者@区域".padEnd(28) + "射门数".padStart(6) + "进球".padStart(5) + "进球率".padStart(7) + "\n");
process.stdout.write("  " + "-".repeat(46) + "\n");
for (const [k, v] of Object.entries(shootMap).sort((a,b)=>b[1].total-a[1].total)) {
  const rate = v.total>0 ? (v.success/v.total*100).toFixed(0)+"%" : "0%";
  process.stdout.write("  " + k.padEnd(28) + v.total.toString().padStart(6) + v.success.toString().padStart(5) + rate.padStart(7) + "\n");
}
console.log("\n  假设: 射门距离(8m=禁区, 14m=前场, 22m=中场A, >35m=后场)");

// ============================================================
// 交叉表4: 成功率
// ============================================================
console.log("\n" + "=".repeat(100));
console.log("  交叉表4: 事件成功率 — 类型×角色");
console.log("=".repeat(100));

const successMap = {};
for (const e of events) {
  const role = pidRole(e.carrier_pid);
  const base = role.split("_")[0]; // GK, CB, FB, CM, W, ST etc
  const k = base + "×" + e.type;
  if (!successMap[k]) successMap[k] = { total:0, ok:0 };
  successMap[k].total++;
  if (e.success) successMap[k].ok++;
}

process.stdout.write("  角色".padEnd(6) + "事件".padStart(8) + "成功".padStart(5) + "失败".padStart(5) + "成功率".padStart(7) + "\n");
process.stdout.write("  " + "-".repeat(36) + "\n");
for (const [k, v] of Object.entries(successMap).sort((a,b)=>b[1].total-a[1].total)) {
  if (v.total < 2) continue;
  process.stdout.write("  " + k.padEnd(12) + v.total.toString().padStart(6) + v.ok.toString().padStart(5) + (v.total-v.ok).toString().padStart(5) + (v.ok/v.total*100).toFixed(0)+"%".padStart(7) + "\n");
}

// ============================================================
// 最后跑100场的汇总
// ============================================================
console.log("\n\n" + "=".repeat(100));
console.log("  汇总: 相同配置跑100场平均 (验证稳定性)");
console.log("=".repeat(100));

let totalH=0, totalA=0, totalShots=0, totalPasses=0, totalTackles=0, totalDribbles=0, totalEvents=0;
for (let i=0; i<100; i++) {
  const h = new Team({
    name: "主队", formation: CONFIGS[0].formation,
    tactics: new TacticalInstructions({
      defensive_line: CONFIGS[0].def, pressing_intensity: CONFIGS[0].press,
      default_tempo: CONFIGS[0].tempo, compactness: CONFIGS[0].comp
    }),
    eliteCount: CONFIGS[0].elite, rng: new Rng(rng.randint(1, 999999))
  });
  const a = new Team({
    name: "客队", formation: CONFIGS[1].formation,
    tactics: new TacticalInstructions({
      defensive_line: CONFIGS[1].def, pressing_intensity: CONFIGS[1].press,
      default_tempo: CONFIGS[1].tempo, compactness: CONFIGS[1].comp
    }),
    eliteCount: CONFIGS[1].elite, rng: new Rng(rng.randint(1, 999999))
  });
  const m = new MatchEngine(h, a, rng.randint(1, 999999));
  const s = m.runMatch({ maxActions: 400, verbose: false });
  totalH += m.score_home; totalA += m.score_away;
  totalShots += m.stats.home.shots + m.stats.away.shots;
  totalPasses += m.stats.home.passes + m.stats.away.passes;
  totalTackles += m.stats.home.tackles + m.stats.away.tackles;
  totalEvents += s.events.length;
  for (const e of s.events) {
    if (e.type==="dribble") totalDribbles++;
  }
}
console.log("  场均比分: " + (totalH/100).toFixed(1) + "-" + (totalA/100).toFixed(1));
console.log("  场均射门: " + (totalShots/100).toFixed(0) + "  场均传球: " + (totalPasses/100).toFixed(0));
console.log("  场均抢断: " + (totalTackles/100).toFixed(0) + "  场均盘带: " + (totalDribbles/100).toFixed(0));
console.log("  场均事件: " + (totalEvents/100).toFixed(0));

console.log("\n" + "=".repeat(100));
console.log("  分析完成 — 未调任何参数");
console.log("=".repeat(100));
