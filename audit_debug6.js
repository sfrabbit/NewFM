/**
 * 调试审计6 — 在match.js内部记录决策时的zone
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { getZoneV } = require("./engine/zones");

// 拦截match.js的step方法，在determineSituation调用点记录
const origMatchStep = MatchEngine.prototype.step;
MatchEngine.prototype.step = function() {
  // 保存决策前的zone
  const decisionZone = this.ball_zone;
  const decisionV = getZoneV(decisionZone);

  // 调用原始step
  const result = origMatchStep.call(this);

  // 如果结果是shoot且决策时zone是MID_D/DEEP_D，记录详细信息
  if (result && result.type === 'shoot' && (decisionV === 'MID_D' || decisionV === 'DEEP_D')) {
    console.log(`\n[DEBUG] step anomaly:`);
    console.log(`  decisionZone: ${decisionZone} (v=${decisionV})`);
    console.log(`  result.zone: ${result.zone} (v=${getZoneV(result.zone)})`);
    console.log(`  result.subType: ${result.subType}`);
    console.log(`  carrier: ${this.ball_carrier}`);
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
