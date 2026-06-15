/**
 * 调试审计9 — 验证ball_carrier为null时ball_zone是否被修改
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { getZoneV } = require("./engine/zones");

const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];
const tempos = [{tempo: -1}, {tempo: 0}, {tempo: 1}];
const presses = [{press: -1}, {press: 0}, {press: 1}];

let found = 0;

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
    const carrierBefore = this.ball_carrier;
    const vBefore = getZoneV(zoneBefore);

    const result = origStep();
    if (!result) return result;

    // 检查：audit会标记为异常的情况
    if (result.type === 'shoot' && vBefore === 'MID_D') {
      found++;
      if (found <= 5) {
        console.log(`\n=== Anomaly #${found} ===`);
        console.log(`  zoneBefore: ${zoneBefore} (carrierBefore=${carrierBefore})`);
        console.log(`  result.zone: ${result.zone}`);
        console.log(`  result.subType: ${result.subType}`);
        console.log(`  carrier changed: ${carrierBefore} -> ${this.ball_carrier}`);
        console.log(`  zone changed: ${zoneBefore} -> ${this.ball_zone}`);
      }
    }

    return result;
  };

  mx.runMatch({ maxActions: 400, verbose: false });
}

console.log(`\nTotal anomalies: ${found}`);
