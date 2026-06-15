/**
 * 调试审计 — 追踪MID_D shoot异常的来源
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { estimateXG, decisionProbs } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];
const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };

const home = new Team({
  name: "H", formation: "4-3-3",
  tactics: new TacticalInstructions({ defensive_line: 0, pressing_intensity: 0, default_tempo: 0, compactness: 0 }),
  eliteCount: 3, rng: new Rng(99)
});
const away = new Team({
  name: "A", formation: "4-4-2",
  tactics: new TacticalInstructions({ defensive_line: 0, pressing_intensity: 0, default_tempo: 0, compactness: 0 }),
  eliteCount: 1, rng: new Rng(201)
});
const mx = new MatchEngine(home, away, 777);

let found = 0;
const origStep = mx.step.bind(mx);

mx.step = function() {
  const zoneBefore = this.ball_zone;
  const vBefore = getZoneV(zoneBefore);
  const defDist = this._ballDefDist ? this._ballDefDist() : 25;
  const pressure = Math.max(0, Math.min(1, 1 - (defDist - 0.3) / 4.7));
  const d = distMap[vBefore] || 25;
  const angle = zoneBefore ? zoneBefore.split('_')[1] : 'C';
  const angleDeg = {L:0, CL:1, C:2, CR:3, R:4}[angle] || 2;
  const xg = estimateXG(vBefore, { distance: d, angle: angleDeg * 18, pressure: pressure });

  const result = origStep();
  if (!result) return result;

  // 检查异常：决策类型是shoot但zone是MID_D或DEEP_D
  if (result.type === 'shoot' && (vBefore === 'MID_D' || vBefore === 'DEEP_D')) {
    found++;
    console.log(`\n=== Anomaly #${found} ===`);
    console.log(`  zoneBefore: ${zoneBefore} (v=${vBefore})`);
    console.log(`  result.zone: ${result.zone}`);
    console.log(`  result.type: ${result.type}, result.subType: ${result.subType}`);
    console.log(`  audit xG: ${xg.toFixed(4)}, pressure: ${pressure.toFixed(2)}, defDist: ${defDist.toFixed(1)}m`);
    console.log(`  carrier: ${result.carrier_pid} on ${result.carrier_side}`);

    // 检查 Sanity Check
    const probs = decisionProbs(zoneBefore, 'ST_C', {}, pressure, null, xg);
    console.log(`  decisionProbs: shoot=${(probs.pShoot*100).toFixed(1)}% pass=${(probs.pPass*100).toFixed(1)}% drib=${(probs.pDribble*100).toFixed(1)}%`);

    if (found >= 10) {
      console.log("\nStopping after 10 anomalies for inspection.");
      process.exit(0);
    }
  }

  return result;
};

mx.runMatch({ maxActions: 2000, verbose: false });
console.log(`\nMatch ended. Found ${found} anomalies.`);
