/**
 * 调试审计2 — 完全复现audit_decisions.js的设置
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { estimateXG, decisionProbs } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];
const tempos = [{tempo: -1}, {tempo: 0}, {tempo: 1}];
const presses = [{press: -1}, {press: 0}, {press: 1}];
const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };

let totalFound = 0;

for (let i = 0; i < 100; i++) {
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

    if (result.type === 'shoot' && (vBefore === 'MID_D' || vBefore === 'DEEP_D')) {
      totalFound++;
      if (totalFound <= 5) {
        console.log(`\n=== Anomaly #${totalFound} (match ${i}) ===`);
        console.log(`  zoneBefore: ${zoneBefore} (v=${vBefore})`);
        console.log(`  result.zone: ${result.zone}`);
        console.log(`  result.subType: ${result.subType}`);
        console.log(`  xG: ${xg.toFixed(4)}, pressure: ${pressure.toFixed(2)}`);
        const probs = decisionProbs(zoneBefore, 'ST_C', {}, pressure, null, xg);
        console.log(`  decisionProbs: shoot=${(probs.pShoot*100).toFixed(1)}%`);
      }
    }

    return result;
  };

  mx.runMatch({ maxActions: 400, verbose: false });
}

console.log(`\nTotal anomalies: ${totalFound}`);
