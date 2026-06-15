// ============================================================
// 决策分析脚本：追踪不同球员类型在各区域的决策概率
// 不做任何参数修改，只输出分析结果
// ============================================================

// 复制 situations.js 中的评分函数（不依赖 require，独立分析）
function computeShootScore(attrs, ctx, v, tactics) {
  if (v === "BOX_D" || v === "DEEP_D") return -999;
  const conf  = (attrs["自信"] || 10) - 10;
  const power = (attrs["力量输出"] || 10) - 10;
  const touch = (attrs["触球精度"] || 10) - 10;
  const understand = (attrs["足球理解"] || 10) - 10;
  const distPenalty = Math.max(0, ctx.distance - 6) * 0.12;
  let score = conf * 0.22 + power * 0.13 + touch * 0.10 + understand * 0.05;
  score -= distPenalty;
  if (ctx.pressure > 0.5) {
    score -= (ctx.pressure - 0.5) * (3 - conf * 0.15);
  }
  if (tactics.getTempoMod() > 0.3) score += 0.5;
  return score;
}

function computePassScore(attrs, ctx, v, tactics) {
  const understand = (attrs["足球理解"] || 10) - 8;
  const teammate  = (attrs["队友识别"] || 10) - 8;
  const teamOri   = (attrs["团队导向"] || 10) - 8;
  const decision  = (attrs["决断速度"] || 10) - 8;
  let score = understand * 0.20 + teammate * 0.18 + teamOri * 0.12 + decision * 0.08;
  if (ctx.distance > 30) score += 1.5;
  else if (ctx.distance > 20) score += 0.8;
  else if (ctx.distance > 12) score += 0.3;
  if (ctx.pressure > 0.6) score += 1.2;
  else if (ctx.pressure > 0.35) score += 0.5;
  if (v === "BOX_A") score -= 1.5;
  if (tactics.getTempoMod() < -0.2) score += 0.8;
  return score;
}

function computeDribbleScore(attrs, ctx, v, isTransition) {
  if (v === "BOX_D") return -999;
  const burst  = (attrs["爆发"] || 10) - 10;
  const speed  = (attrs["速度"] || 10) - 10;
  const control = (attrs["控制技巧"] || 10) - 10;
  const conf   = (attrs["自信"] || 10) - 10;
  let score = burst * 0.20 + speed * 0.18 + control * 0.15 + conf * 0.12;
  const space = ctx.space || 10;
  if (space > 25) score += 2.0;
  else if (space > 15) score += 1.2;
  else if (space > 8) score += 0.5;
  if (isTransition && burst > 0) score += 2.0 + burst * 0.1;
  if (ctx.pressure > 0.7) score -= 2.5;
  else if (ctx.pressure > 0.5) score -= 1.2;
  return score;
}

function softmax(scores) {
  const maxScore = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - maxScore));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / total);
}

function pct(v) { return (v * 100).toFixed(1) + "%"; }

// ---------- 球员类型 ----------
const archetypes = {
  "ST_明星": {
    role:"ST", attrs:{自信:18,力量输出:16,触球精度:15,足球理解:14,爆发:14,速度:15,控制技巧:13,队友识别:12,团队导向:10,决断速度:15,情绪稳定性:12,空中能力:16,对抗:15}
  },
  "ST_普通": {
    role:"ST", attrs:{自信:12,力量输出:12,触球精度:11,足球理解:10,爆发:11,速度:12,控制技巧:10,队友识别:10,团队导向:10,决断速度:10,情绪稳定性:10,空中能力:11,对抗:11}
  },
  "CM_组织核心": {
    role:"CM", attrs:{足球理解:17,队友识别:16,触球精度:15,决断速度:15,集中力:15,力量输出:12,控制技巧:13,自信:13,团队导向:15,爆发:10,速度:10,情绪稳定性:14,对手识别:14}
  },
  "CM_防守型": {
    role:"DM", attrs:{防守技术:16,决断速度:14,对抗:15,足球理解:13,触球精度:11,力量输出:12,集中力:14,队友识别:12,团队导向:13,自信:10,爆发:10,速度:10,对手识别:13}
  },
  "W_速度型": {
    role:"W_", attrs:{爆发:18,速度:17,控制技巧:15,自信:15,触球精度:13,足球理解:12,队友识别:11,力量输出:10,团队导向:9,决断速度:13,对抗:9}
  },
  "W_普通": {
    role:"W_", attrs:{爆发:12,速度:12,控制技巧:11,自信:10,触球精度:10,足球理解:10,队友识别:10,力量输出:10,团队导向:10,决断速度:10,对抗:10}
  },
  "FB_进攻型": {
    role:"FB", attrs:{爆发:14,速度:15,耐力:15,控制技巧:12,触球精度:12,足球理解:12,队友识别:12,团队导向:12,决断速度:12,对抗:12}
  },
  "CB_典型": {
    role:"CB", attrs:{防守技术:15,对抗:16,空中能力:15,决断速度:14,足球理解:12,触球精度:10,力量输出:10,爆发:8,速度:8,团队导向:12,集中力:13}
  },
};

// ---------- 区域上下文 ----------
const zones = [
  { name:"BOX_A禁区",       v:"BOX_A",  d:8,  space:5,  p:0.60 },
  { name:"BOX_A禁区(低压)",  v:"BOX_A",  d:8,  space:8,  p:0.25 },
  { name:"DEEP_A前场",      v:"DEEP_A", d:14, space:12, p:0.45 },
  { name:"DEEP_A前场(高压)", v:"DEEP_A", d:14, space:5,  p:0.70 },
  { name:"MID_A中场前区",    v:"MID_A",  d:22, space:15, p:0.35 },
  { name:"MID_A前区(紧逼)",  v:"MID_A",  d:22, space:8,  p:0.55 },
  { name:"MID_D中场后区",    v:"MID_D",  d:35, space:18, p:0.28 },
  { name:"MID_D后区(高压)",  v:"MID_D",  d:35, space:8,  p:0.65 },
  { name:"DEEP_D后场",      v:"DEEP_D", d:45, space:20, p:0.25 },
];

const neutral = { getTempoMod:()=>0 };
const fast    = { getTempoMod:()=>0.5 };
const slow    = { getTempoMod:()=>-0.3 };

console.log("=".repeat(100));
console.log("  决策分析：不同球员类型在不同区域的 射门/传球/盘带 概率");
console.log("  所有数值均由属性+情境公式计算，未调任何参数");
console.log("=".repeat(100));
console.log();

for (const [name, data] of Object.entries(archetypes)) {
  const a = data.attrs;
  console.log("\n" + "-".repeat(100));
  console.log("  " + name + "  关键: 自信=" + a["自信"] + " 足球理解=" + a["足球理解"] + " 爆发=" + a["爆发"] + " 触球=" + a["触球精度"] + " 力量=" + a["力量输出"] + " 速度=" + a["速度"]);
  console.log("-".repeat(100));
  process.stdout.write("  区域".padEnd(20) + " 射分".padStart(7) + " 传分".padStart(7) + " 带分".padStart(7) + "  射门".padStart(7) + " 传球".padStart(7) + " 盘带".padStart(7) + "\n");
  process.stdout.write("  " + "-".repeat(65) + "\n");
  for (const z of zones) {
    const ctx = { distance:z.d, pressure:z.p, space:z.space };
    const ss = computeShootScore(a, ctx, z.v, neutral);
    const ps = computePassScore(a, ctx, z.v, neutral);
    const ds = computeDribbleScore(a, ctx, z.v, false);
    const [pS,pP,pD] = softmax([ss,ps,ds]);
    process.stdout.write("  " + z.name.padEnd(20) + ss.toFixed(1).padStart(7) + ps.toFixed(1).padStart(7) + ds.toFixed(1).padStart(7) + " " + pct(pS).padStart(7) + pct(pP).padStart(7) + pct(pD).padStart(7) + "\n");
  }
}

// ---------- 战术影响 ----------
console.log("\n\n" + "=".repeat(80));
console.log("  战术影响：W_速度型在 MID_A前区(紧逼) — 快/中/慢节奏");
console.log("=".repeat(80));
const wa = archetypes["W_速度型"].attrs;
const cMid = { distance:22, pressure:0.55, space:8 };
for (const [tn,t] of [["中性",neutral],["快节奏(0.5)",fast],["慢节奏(-0.3)",slow]]) {
  const ss=computeShootScore(wa,cMid,"MID_A",t), ps=computePassScore(wa,cMid,"MID_A",t), ds=computeDribbleScore(wa,cMid,"MID_A",false);
  const [pS,pP,pD]=softmax([ss,ps,ds]);
  console.log("  "+tn.padEnd(14)+" 射:"+ss.toFixed(1)+"("+pct(pS)+") 传:"+ps.toFixed(1)+"("+pct(pP)+") 带:"+ds.toFixed(1)+"("+pct(pD)+")");
}

// ---------- 反击 ----------
console.log("\n\n" + "=".repeat(80));
console.log("  反击影响：W_速度型在 MID_A前区 space=20 反击中");
console.log("=".repeat(80));
const cCt = { distance:22, pressure:0.3, space:20 };
{
  const ss=computeShootScore(wa,cCt,"MID_A",neutral), ps=computePassScore(wa,cCt,"MID_A",neutral), ds=computeDribbleScore(wa,cCt,"MID_A",true);
  const [pS,pP,pD]=softmax([ss,ps,ds]);
  console.log("  反击: 射:"+ss.toFixed(1)+"("+pct(pS)+") 传:"+ps.toFixed(1)+"("+pct(pP)+") 带:"+ds.toFixed(1)+"("+pct(pD)+")");
}
{
  const ss=computeShootScore(wa,cCt,"MID_A",neutral), ps=computePassScore(wa,cCt,"MID_A",neutral), ds=computeDribbleScore(wa,cCt,"MID_A",false);
  const [pS,pP,pD]=softmax([ss,ps,ds]);
  console.log("  正常: 射:"+ss.toFixed(1)+"("+pct(pS)+") 传:"+ps.toFixed(1)+"("+pct(pP)+") 带:"+ds.toFixed(1)+"("+pct(pD)+")");
}

// ---------- 射门分解 ----------
console.log("\n\n" + "=".repeat(80));
console.log("  射门得分分解：明星ST vs 普通ST 在 BOX_A禁区(pressure=0.6)");
console.log("=".repeat(80));
for (const [nm,p] of [["明星ST",archetypes["ST_明星"]],["普通ST",archetypes["ST_普通"]]]) {
  const a=p.attrs, ctx={distance:8,pressure:0.6,space:5};
  const c=(a["自信"]||10)-10, pw=(a["力量输出"]||10)-10, t=(a["触球精度"]||10)-10, u=(a["足球理解"]||10)-10;
  const cc=c*0.22, pc=pw*0.13, tc=t*0.10, uc=u*0.05;
  const dp=Math.max(0,ctx.distance-6)*0.12;
  const pp=ctx.pressure>0.5?(ctx.pressure-0.5)*(3-c*0.15):0;
  const total=cc+pc+tc+uc-dp-pp;
  console.log("  "+nm+": 自信="+c+"(+ "+cc.toFixed(2)+") 力量="+pw+"(+ "+pc.toFixed(2)+") 触球="+t+"(+ "+tc.toFixed(2)+") 理解="+u+"(+ "+uc.toFixed(2)+")");
  console.log("         dist=-"+dp.toFixed(2)+" pressure=-"+pp.toFixed(2)+" => "+total.toFixed(2));
  const ps=computePassScore(a,ctx,"BOX_A",neutral), ds=computeDribbleScore(a,ctx,"BOX_A",false);
  const [pS,pP,pD]=softmax([total,ps,ds]);
  console.log("         传球分="+ps.toFixed(1)+" 盘带分="+ds.toFixed(1)+" => 射"+pct(pS)+" 传"+pct(pP)+" 带"+pct(pD));
}

console.log("\n" + "=".repeat(100));
console.log("  分析完成 — 以上所有数值均由球员属性+情境公式计算得出，未调任何参数");
console.log("=".repeat(100));
