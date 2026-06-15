/**
 * 调试审计3 — 直接在determineSituation中追踪
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

  // 检查：如果zone是MID_D/DEEP_D但返回了shoot，打印详细信息
  if ((v === 'MID_D' || v === 'DEEP_D') && result.type === 'shoot') {
    console.log(`\n[DEBUG] determineSituation anomaly:`);
    console.log(`  ballZone: ${ballZone} (v=${v})`);
    console.log(`  carrierRole: ${carrierRole}`);
    console.log(`  setPiece: ${setPiece}`);
    console.log(`  result.type: ${result.type}, result.subType: ${result.subType}`);
    console.log(`  matchContext.realDefDist: ${matchContext.realDefDist}`);
    console.log(`  matchContext.realPressure: ${matchContext.realPressure}`);

    // 手动计算decisionProbs
    const { estimateXG, decisionProbs } = situations;
    const xg = estimateXG(v, result.context);
    const probs = decisionProbs(ballZone, carrierRole, carrierAttrs, matchContext.realPressure || 0, null, xg);
    console.log(`  calculated xG: ${xg.toFixed(4)}`);
    console.log(`  decisionProbs: shoot=${(probs.pShoot*100).toFixed(1)}% pass=${(probs.pPass*100).toFixed(1)}% drib=${(probs.pDribble*100).toFixed(1)}%`);
  }

  return result;
};

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

mx.runMatch({ maxActions: 2000, verbose: false });
console.log("\nMatch ended.");
