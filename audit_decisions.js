/**
 * 决策审计 — 100场比赛逐行动记录，检查逻辑一致性
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { estimateXG, decisionProbs } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];
const tempos = [{tempo: -1}, {tempo: 0}, {tempo: 1}];
const presses = [{press: -1}, {press: 0}, {press: 1}];

const zoneStats = {};
const anomalies = [];
let totalActions = 0;

const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };

function recordAction(zoneName, v, type, subType, xg, pressure, defDist) {
  if (!zoneStats[v]) zoneStats[v] = { shoot: 0, pass: 0, dribble: 0, tackle: 0, contest: 0, total: 0 };
  zoneStats[v][type] = (zoneStats[v][type] || 0) + 1;
  zoneStats[v].total += 1;

  const reasons = [];
  if (v === 'BOX_D' && type === 'shoot') reasons.push("BOX_D shoot");
  if (v === 'BOX_D' && type === 'dribble') reasons.push("BOX_D dribble");
  if (v === 'BOX_A' && type === 'pass' && xg > 0.25) reasons.push("BOX_A hiXG("+xg.toFixed(2)+") still pass");
  if (v === 'BOX_A' && type === 'dribble' && xg > 0.15 && pressure < 0.2) reasons.push("BOX_A hiXG("+xg.toFixed(2)+") loPress("+pressure.toFixed(2)+") dribble");
  if ((v === 'DEEP_D') && type === 'shoot' && subType !== 'freeKick') reasons.push("DEEP_D shoot");
  if ((v === 'MID_D') && type === 'shoot') reasons.push("MID_D shoot("+xg.toFixed(3)+")");

  if (reasons.length > 0) {
    anomalies.push({ zone: zoneName, v, type, subType, xg: xg.toFixed(3), pressure: pressure.toFixed(2), defDist: defDist.toFixed(1), reasons });
  }
}

const N = 100;
for (let i = 0; i < N; i++) {
  const fm = formations[i % formations.length];
  const ta = tempos[i % tempos.length];
  const pb = presses[i % presses.length];
  const pc = presses[(i + 1) % presses.length];

  const home = new Team({
    name: "H"+i, formation: fm,
    tactics: new TacticalInstructions({ defensive_line: pc.press, pressing_intensity: pb.press, default_tempo: ta.tempo, compactness: pc.press }),
    eliteCount: 3, rng: new Rng(i * 31 + 99)
  });
  const away = new Team({
    name: "A"+i, formation: formations[(i + 3) % formations.length],
    tactics: new TacticalInstructions({ defensive_line: pb.press, pressing_intensity: pc.press, default_tempo: ta.tempo, compactness: pb.press }),
    eliteCount: 1, rng: new Rng(i * 53 + 201)
  });
  const mx = new MatchEngine(home, away, i * 100 + 777);

  // Hook step to capture xG/pressure at decision time
  const origStep = mx.step.bind(mx);
  mx.step = function() {
    // Calculate from current state BEFORE step
    const defDist = this._ballDefDist ? this._ballDefDist() : 25;
    const pressure = Math.max(0, Math.min(1, 1 - (defDist - 0.3) / 4.7));
    const zone = this.ball_zone;
    const v = getZoneV(zone);
    const d = distMap[v] || 25;
    const angle = zone ? zone[1] * 18 : 0;
    const xg = estimateXG(v, { distance: d, angle: angle, pressure: pressure });

    const result = origStep();
    if (!result) return result;

    recordAction(zone || '?', v, result.type, result.subType, xg, pressure, defDist);
    totalActions++;
    return result;
  };

  mx.runMatch({ maxActions: 400, verbose: false });
}

// === Output ===
console.log("=".repeat(70));
console.log("Decision Audit — " + N + " matches, " + totalActions + " actions");
console.log("=".repeat(70));

console.log("\n=== Zone x Action Distribution ===");
const zoneOrder = ['BOX_D', 'DEEP_D', 'MID_D', 'MID_A', 'DEEP_A', 'BOX_A'];
for (const v of zoneOrder) {
  const s = zoneStats[v];
  if (!s) continue;
  const t = s.total;
  console.log(
    v.padEnd(10) + "total=" + t.toString().padStart(5) +
    "  pass=" + (s.pass/t*100).toFixed(0) + "%" +
    "  shoot=" + (s.shoot/t*100).toFixed(0) + "%" +
    "  drib=" + (s.dribble/t*100).toFixed(0) + "%" +
    "  tackle=" + (s.tackle/t*100).toFixed(0) + "%" +
    "  contest=" + (s.contest/t*100).toFixed(0) + "%"
  );
}

console.log("\n=== Anomalies (" + anomalies.length + " total) ===");
if (anomalies.length === 0) {
  console.log("  All clear.");
} else {
  const byReason = {};
  for (const a of anomalies) {
    for (const r of a.reasons) {
      if (!byReason[r]) byReason[r] = [];
      byReason[r].push(a);
    }
  }
  for (const [reason, items] of Object.entries(byReason)) {
    console.log("\n  " + reason + ": " + items.length + " times");
    const show = items.slice(0, 8);
    for (const item of show) {
      console.log("    " + item.v + " " + item.type + "/" + item.subType + " xG=" + item.xg + " press=" + item.pressure + " defDist=" + item.defDist + "m");
    }
    if (items.length > 8) console.log("    ... +" + (items.length - 8) + " more");
  }
}

// Also run a quick probability check from decisionProbs directly
console.log("\n=== decisionProbs Sanity Check ===");
for (const [z, d] of Object.entries(distMap)) {
  const xg = estimateXG(z, { distance: d, angle: 0, pressure: 0.2 });
  const probs = decisionProbs(z + '_C', 'ST_C', {}, 0.2, null, xg);
  console.log(z.padEnd(10) + " d=" + d + "m xG=" + xg.toFixed(3) + "  shoot=" + (probs.pShoot*100).toFixed(0) + "% pass=" + (probs.pPass*100).toFixed(0) + "% drib=" + (probs.pDribble*100).toFixed(0) + "%");
}

console.log("\nAudit complete.");
