/**
 * 运行一场比赛，展示每一次射门的决策过程
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");

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

console.log("=".repeat(70));
console.log("开始比赛 - 每次射门决策都会打印详细计算");
console.log("=".repeat(70));

mx.runMatch({ maxActions: 2000, verbose: false });
console.log("\n比赛结束");
