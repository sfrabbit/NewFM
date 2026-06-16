/**
 * 小规模精确审计 — 跑5场比赛，展示每一次决策的计算细节
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { estimateXG, decisionProbs } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");
const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };

// 只跑少量比赛，记录全部决策
let totalChoices = 0;
let midDShootDetail = [];

for (let m = 0; m < 5; m++) {
  const home = new Team({ name: "H"+m, formation: "4-3-3",
    tactics: new TacticalInstructions({ defensive_line:0, pressing_intensity:0, default_tempo:0, compactness:0 }),
    eliteCount: 2, rng: new Rng(m * 31 + 99)
  });
  const away = new Team({ name: "A"+m, formation: "4-4-2",
    tactics: new TacticalInstructions({ defensive_line:0, pressing_intensity:0, default_tempo:0, compactness:0 }),
    eliteCount: 2, rng: new Rng(m * 53 + 201)
  });
  const mx = new MatchEngine(home, away, m * 100 + 777);

  const origStep = mx.step.bind(mx);
  mx.step = function() {
    const result = origStep();
    if (!result) return result;
    totalChoices++;

    // 从当前state获取决策时的实际参数
    const zoneAfter = result.zone || this.ball_zone || 'MID_D_C';
    const v = getZoneV(zoneAfter);
    const carrier = this._getCarrierPlayer();
    const role = carrier ? carrier.role : '?';
    const attrs = carrier ? carrier.attrs || {} : {};
    const press = Math.max(0, Math.min(1, 1 - ((this._ballDefDist ? this._ballDefDist() : 25) - 0.3) / 4.7));
    const d = distMap[v] || 25;
    const angle = (() => { const p = String(zoneAfter).split('_'); const li = { L:0, CL:1, C:2, CR:3, R:4 }[p[2] || 'C']; return (li != null ? li : 2) * 18; })();
    const xg = estimateXG(v, { distance: d, angle, pressure: press });
    const probs = decisionProbs(zoneAfter, role, attrs, press, null, xg, 0, this.minute);
    const conf = attrs['自信'] || 10;
    const tm = attrs['团队'] || 10;

    // 每10条输出一条
    if (totalChoices % 10 === 0) {
      console.log(`[#${String(totalChoices).padStart(4)}] ${v.padEnd(8)} ${zoneAfter.padEnd(14)} ${role.padEnd(6)} conf=${conf} team=${tm} xg=${xg.toFixed(4)} press=${press.toFixed(2)} shootU=${probs._shoot.toFixed(6)} passU=${probs._pass.toFixed(4)} dribU=${probs._dribble.toFixed(6)} → shoot${(probs.pShoot*100).toFixed(1)}% pass${(probs.pPass*100).toFixed(1)}% drib${(probs.pDribble*100).toFixed(1)}% | 选择:${result.type}/${result.subType} ${this.minute}'`);
    }

    // 记录所有MID_D行为
    if (v === 'MID_D') {
      midDShootDetail.push({
        zone: zoneAfter, role, conf, tm, xg: xg.toFixed(4), press: press.toFixed(2),
        pShoot: (probs.pShoot*100).toFixed(1), pPass: (probs.pPass*100).toFixed(1), pDrib: (probs.pDribble*100).toFixed(1),
        shootU: probs._shoot.toFixed(6), passU: probs._pass.toFixed(4), dribU: probs._dribble.toFixed(6),
        chosen: result.type, subType: result.subType, minute: this.minute
      });
    }

    return result;
  };

  mx.runMatch({ maxActions: 400, verbose: false });
}

// 输出MID_D详细分析
console.log("\n\n=== MID_D 决策详情 ===\n");
for (let i = 0; i < Math.min(30, midDShootDetail.length); i++) {
  const e = midDShootDetail[i];
  const flag = e.chosen === 'shoot' ? ' ← 射门!' : '';
  console.log(`${e.zone.padEnd(14)} ${e.role.padEnd(6)} conf=${e.conf} team=${e.tm} xg=${e.xg} press=${e.press} shootU=${e.shootU} passU=${e.passU} dribU=${e.dribU} pShoot=${e.pShoot}% pPass=${e.pPass}% pDrib=${e.pDrib}% → ${e.chosen}/${e.subType} ${e.minute}'${flag}`);
}
if (midDShootDetail.length > 30) console.log(`... 共${midDShootDetail.length}条`);

const midShoots = midDShootDetail.filter(e => e.chosen === 'shoot');
console.log(`\nMID_D 射门: ${midShoots.length}次`);
for (const e of midShoots) {
  console.log(`  ${e.zone} ${e.role} conf=${e.conf} team=${e.tm} xg=${e.xg} pShoot=${e.pShoot}% ${e.minute}'`);
}
