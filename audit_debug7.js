/**
 * 调试审计7 — 100场，在match.js内部记录决策时的zone
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { getZoneV } = require("./engine/zones");

// 拦截match.js的step方法
const origMatchStep = MatchEngine.prototype.step;
MatchEngine.prototype.step = function() {
  const decisionZone = this.ball_zone;
  const decisionV = getZoneV(decisionZone);
  const result = origMatchStep.call(this);

  if (result && result.type === 'shoot' && (decisionV === 'MID_D' || decisionV === 'DEEP_D')) {
    console.log(`[DEBUG] decisionZone=${decisionZone} resultZone=${result.zone} subType=${result.subType}`);
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
