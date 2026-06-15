/**
 * 调试审计4 — 100场设置，拦截determineSituation
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const situations = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

// 拦截determineSituation
const origDetermine = situations.determineSituation;
situations.determineSituation = function(rng, ballZone, carrierRole, carrierAttrs, possessionTeam, opponentZones, tactics, setPiece, matchContext, defenderTactics) {
  const v = getZoneV(ballZone);
  const result = origDetermine.apply(this, arguments);

  if ((v === 'MID_D' || v === 'DEEP_D') && result.type === 'shoot') {
    console.log(`\n[DEBUG] determineSituation anomaly:`);
    console.log(`  ballZone: ${ballZone} (v=${v})`);
    console.log(`  carrierRole: ${carrierRole}`);
    console.log(`  setPiece: ${setPiece}`);
    console.log(`  result.subType: ${result.subType}`);
    console.log(`  realDefDist: ${matchContext.realDefDist}, realPressure: ${matchContext.realPressure}`);

    const { estimateXG, decisionProbs } = situations;
    const xg = estimateXG(v, result.context);
    const probs = decisionProbs(ballZone, carrierRole, carrierAttrs, matchContext.realPressure || 0, null, xg);
    console.log(`  xG: ${xg.toFixed(4)}  probs: shoot=${(probs.pShoot*100).toFixed(1)}%`);
  }

  return result;
};

const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];
const tempos = [{tempo: -1}, {tempo: 0}, {tempo: 1}];
const presses = [{press: -1}, {press: 0}, {press: 1}];

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
  mx.runMatch({ maxActions: 400, verbose: false });
}

console.log("\n100 matches complete.");
