/**
 * 展示每一次射门决策的完整计算过程
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { estimateXG, decisionProbs, buildContext } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

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

let shotCount = 0;

// Hook determineSituation来捕获每次射门的决策过程
const situations = require("./engine/situations");
const origDetermine = situations.determineSituation;
situations.determineSituation = function(rng, ballZone, carrierRole, carrierAttrs, possessionTeam,
                                          opponentZones, tactics, setPiece, matchContext, defenderTactics) {
  const result = origDetermine.apply(this, arguments);

  if (result.type === 'shoot') {
    shotCount++;
    const v = getZoneV(ballZone);
    const d = distMap[v] || 25;
    const angle = ballZone ? ballZone.split('_')[1] : 'C';
    const angleDeg = {L:0, CL:1, C:2, CR:3, R:4}[angle] || 2;
    const pressure = matchContext.realPressure || 0;
    const xg = estimateXG(v, { distance: d, angle: angleDeg * 18, pressure });
    const probs = decisionProbs(ballZone, carrierRole, carrierAttrs, pressure, null, xg);

    console.log(`\n=== 射门 #${shotCount} ===`);
    console.log(`  区域: ${ballZone} (v=${v})`);
    console.log(`  持球者角色: ${carrierRole}`);
    console.log(`  距离球门: ${d}m`);
    console.log(`  角度: ${angleDeg * 18}度`);
    console.log(`  防守压力: ${pressure.toFixed(2)}`);
    console.log(`  xG: ${xg.toFixed(4)}`);
    console.log(`  --- 决策计算 ---`);
    console.log(`  shootUtility(xG) = ${xg.toFixed(4)}`);
    console.log(`  passUtility(${v}, ${pressure.toFixed(2)}) = ${probs._pass.toFixed(4)}`);
    console.log(`  dribbleUtility(${v}, ${pressure.toFixed(2)}, ${xg.toFixed(4)}) = ${probs._dribble.toFixed(4)}`);
    console.log(`  total = ${(probs._shoot + probs._pass + probs._dribble).toFixed(4)}`);
    console.log(`  => pShoot = ${(probs.pShoot * 100).toFixed(2)}%`);
    console.log(`  => pPass  = ${(probs.pPass * 100).toFixed(2)}%`);
    console.log(`  => pDribble = ${(probs.pDribble * 100).toFixed(2)}%`);
    console.log(`  随机数 r = ${result._debug_r ? result._debug_r.toFixed(4) : 'N/A'}`);
    console.log(`  射门类型: ${result.subType}`);

    if (shotCount >= 20) {
      console.log("\n(已展示20次射门，停止输出)");
      process.exit(0);
    }
  }

  return result;
};

mx.runMatch({ maxActions: 2000, verbose: false });
console.log(`\n比赛结束，共${shotCount}次射门`);
