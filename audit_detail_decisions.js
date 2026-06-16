/**
 * 具体决策抽样审计 — 提取并展示每一次决策的原始参数
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { estimateXG, decisionProbs } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };

// ── 拦截decisionProbs — 记录每一次调用的输入和输出 ──
const situ = require("./engine/situations");
const _origDP = situ.decisionProbs;
const _origDet = situ.determineSituation;

// decisionLog 记录每一次决策
const decisionLog = [];
const MAX_LOG = 200;

situ.decisionProbs = function(ballZone, role, attrs, pressure, tacticPos, xgValue, shootWillingness, matchMinute) {
  const v = getZoneV(ballZone);
  const result = _origDP.apply(this, arguments);
  
  if (decisionLog.length < MAX_LOG) {
    const d = distMap[v] || 25;
    const angle = ballZone ? ballZone.split('_')[2] || 'C' : 'C';
    const angleDeg = { L: 0, CL: 1, C: 2, CR: 3, R: 4 }[angle] || 2;
    const xg = xgValue !== undefined ? xgValue : estimateXG(v, { distance: d, angle: angleDeg * 18, pressure });
    decisionLog.push({
      zone: ballZone, v, d, angle: angleDeg * 18, pressure,
      role, conf: attrs['自信'] || 10, team: attrs['团队'] || 10,
      xg: xg.toFixed(4), shootU: result._shoot.toFixed(4), passU: result._pass.toFixed(4), dribU: result._dribble.toFixed(4),
      pShoot: (result.pShoot * 100).toFixed(1), pPass: (result.pPass * 100).toFixed(1), pDrib: (result.pDribble * 100).toFixed(1),
      minute: matchMinute || 0,
    });
  }
  return result;
};

// 记录实际选择的action
const actionLog = [];
situ.determineSituation = function() {
  const [rng, ballZone, carrierRole, carrierAttrs, posTeam, oppZones, tactics, setPiece, matchContext, defTact] = arguments;
  const result = _origDet.apply(this, arguments);
  
  if (actionLog.length < 300 && result.type) {
    const v = getZoneV(ballZone);
    const d = distMap[v] || 25;
    const pressure = matchContext.realPressure || 0;
    const angle = ballZone ? ballZone.split('_')[2] || 'C' : 'C';
    const angleDeg = { L: 0, CL: 1, C: 2, CR: 3, R: 4 }[angle] || 2;
    const xg = estimateXG(v, { distance: d, angle: angleDeg * 18, pressure });
    const probs = _origDP(ballZone, carrierRole, carrierAttrs, pressure, undefined, xg, 0, matchContext.match_minute || 0);
    
    actionLog.push({
      v, zone: ballZone, role: carrierRole,
      conf: carrierAttrs['自信'] || 10,
      team: carrierAttrs['团队'] || 10,
      xg: xg.toFixed(4),
      pShoot: (probs.pShoot * 100).toFixed(1),
      pPass: (probs.pPass * 100).toFixed(1),
      pDrib: (probs.pDribble * 100).toFixed(1),
      shootU: probs._shoot.toFixed(6),
      passU: probs._pass.toFixed(4),
      dribU: probs._dribble.toFixed(4),
      minute: matchContext.match_minute || 0,
      pressure: pressure.toFixed(2),
      chosen: result.type,
      subType: result.subType,
      setPiece,
    });
  }
  return result;
};

// ── 跑100场 ──
const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2"];
for (let i = 0; i < 100; i++) {
  const fm = formations[i % 5];
  const home = new Team({
    name: "H" + i, formation: fm,
    tactics: new TacticalInstructions({ defensive_line: (i % 3) - 1, pressing_intensity: (i % 3) - 1, default_tempo: (i % 3) - 1, compactness: (i % 3) - 1 }),
    eliteCount: (i % 4), rng: new Rng(i * 31 + 99)
  });
  const away = new Team({
    name: "A" + i, formation: formations[(i + 3) % 5],
    tactics: new TacticalInstructions({ defensive_line: (i % 3) - 1, pressing_intensity: (i % 3) - 1, default_tempo: (i % 3) - 1, compactness: (i % 3) - 1 }),
    eliteCount: (i % 4) + 1, rng: new Rng(i * 53 + 201)
  });
  const mx = new MatchEngine(home, away, i * 100 + 777);
  mx.runMatch({ maxActions: 400, verbose: false });
}

// ── 输出 ──
console.log("=".repeat(110));
console.log("A. decisionProbs 抽样（每次决策的数学过程）");
console.log("=".repeat(110));
console.log(
  "zone".padEnd(14) + "role".padEnd(6) + "d".padStart(3) + "°".padStart(3) + "press".padStart(5) +
  "conf".padStart(4) + "team".padStart(4) + "xg".padStart(7) +
  "shootU".padStart(8) + "passU".padStart(7) + "dribU".padStart(7) +
  "shoot%".padStart(7) + "pass%".padStart(7) + "drib%".padStart(7) +
  "".padEnd(3) + "min"
);
for (const e of decisionLog.slice(0, 100)) {
  console.log(
    e.zone.padEnd(14) + e.role.padEnd(6) + String(e.d).padStart(3) + String(e.angle).padStart(3) + e.pressure.toFixed(2).padStart(5) +
    String(e.conf).padStart(4) + String(e.team).padStart(4) + String(e.xg).padStart(7) +
    String(e.shootU).padStart(8) + String(e.passU).padStart(7) + String(e.dribU).padStart(7) +
    String(e.pShoot).padStart(7) + String(e.pPass).padStart(7) + String(e.pDrib).padStart(7) +
    "".padEnd(3) + (e.minute + "'")
  );
}

console.log("\n" + "=".repeat(120));
console.log("B. 实际选择 vs 可用概率（determineSituation 的最终决策）");
console.log("=".repeat(120));
console.log(
  "zone".padEnd(14) + "role".padEnd(6) + "conf".padStart(4) + "team".padStart(4) + "press".padStart(5) +
  "xg".padStart(7) + "shootU".padStart(9) + "passU".padStart(7) + "dribU".padStart(7) +
  "shoot%".padStart(7) + "pass%".padStart(7) + "drib%".padStart(7) +
  "".padEnd(3) + "选择".padEnd(9) + "subType".padEnd(18) + "min"
);
for (const e of actionLog.slice(0, 150)) {
  console.log(
    e.zone.padEnd(14) + e.role.padEnd(6) + String(e.conf).padStart(4) + String(e.team).padStart(4) + String(e.pressure).padStart(5) +
    String(e.xg).padStart(7) + String(e.shootU).padStart(9) + String(e.passU).padStart(7) + String(e.dribU).padStart(7) +
    String(e.pShoot).padStart(7) + String(e.pPass).padStart(7) + String(e.pDrib).padStart(7) +
    "".padEnd(3) + e.chosen.padEnd(9) + e.subType.padEnd(18) + (e.minute + "'")
  );
}

// 具体分析异常: MID_D选择了shoot的
const midDShoots = actionLog.filter(e => e.v === 'MID_D' && e.chosen === 'shoot');
console.log("\n" + "=".repeat(120));
console.log(`C. MID_D 射门决策详情 (${midDShoots.length}条)`);
console.log("=".repeat(120));
if (midDShoots.length === 0) {
  console.log("  (无)");
} else {
  console.log("  zone".padEnd(20) + "role".padEnd(8) + "conf".padStart(4) + "team".padStart(4) + "xg".padStart(8) + "pShoot".padStart(8) + "min");
  for (const e of midDShoots) {
    console.log(
      "  " + e.zone.padEnd(18) + e.role.padEnd(8) + String(e.conf).padStart(4) + String(e.team).padStart(4) +
      String(e.xg).padStart(8) + String(e.pShoot).padStart(8) + (e.minute + "'")
    );
  }
}

// DEEP_A选择了dribble的
const deepADribbles = actionLog.filter(e => e.v === 'DEEP_A' && e.chosen === 'dribble');
console.log("\n" + "=".repeat(120));
console.log(`D. DEEP_A 盘带决策详情 (${deepADribbles.length}条)`);
console.log("=".repeat(120));
let dShow = 0;
for (const e of deepADribbles) {
  if (dShow++ >= 15) { console.log(`  ... 共${deepADribbles.length}条`); break; }
  console.log(
    `  ${e.zone.padEnd(14)} ${e.role.padEnd(6)} conf=${e.conf} team=${e.team} xg=${e.xg} pShoot=${e.pShoot}% pPass=${e.pPass}% pDrib=${e.pDrib}% press=${e.pressure} | ${e.chosen}/${e.subType} ${e.minute}'`
  );
}

// BOX_A选择了dribble的
const boxADribbles = actionLog.filter(e => e.v === 'BOX_A' && e.chosen === 'dribble');
console.log("\n" + "=".repeat(120));
console.log(`E. BOX_A 盘带决策详情 (${boxADribbles.length}条)`);
console.log("=".repeat(120));
let bShow = 0;
for (const e of boxADribbles) {
  if (bShow++ >= 15) { console.log(`  ... 共${boxADribbles.length}条`); break; }
  console.log(
    `  ${e.zone.padEnd(14)} ${e.role.padEnd(6)} conf=${e.conf} team=${e.team} xg=${e.xg} pShoot=${e.pShoot}% pPass=${e.pPass}% pDrib=${e.pDrib}% press=${e.pressure} | ${e.chosen}/${e.subType} ${e.minute}'`
  );
}
