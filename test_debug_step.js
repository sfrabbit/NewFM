// 调试 _stepMovementPlayers 调用
const { MatchEngine } = require("./engine/match");
const { Team, TacticalInstructions } = require("./engine/teams");

function createTestTeam(name, formation) {
  const tactics = new TacticalInstructions({});
  const roles = ['GK','FB_L','CB_L','CB_R','FB_R','CM_L','CM_C','CM_R','W_L','ST_C','W_R'];
  const playersData = roles.map((role, i) => ({
    pid: `${name}_P${i}`,
    role,
    attrs: { '速度': 12, '爆发': 12, '耐力': 12, '足球理解': 12 },
    quality: 'starter'
  }));
  return new Team({ name, formation, tactics, playersData });
}

const home = createTestTeam('home', '4-3-3');
const away = createTestTeam('away', '4-3-3');

const match = new MatchEngine(home, away, 42);
match.initMatch('home');

// 找到 CM_C
const cmPid = Object.entries(match._playerCoords).find(([pid, d]) => d.team === 'home' && d.role === 'CM_C')?.[0];

console.log('=== 跟踪 CM_C 的移动 ===');
console.log(`初始: x=${match._playerCoords[cmPid].x.toFixed(1)}, distance=${match._playerCoords[cmPid].distanceCovered.toFixed(0)}`);

let totalSteps = 0;
for (let i = 0; i < 50 && !match.is_full_time; i++) {
  const distBefore = match._playerCoords[cmPid].distanceCovered;
  match.step();
  const distAfter = match._playerCoords[cmPid].distanceCovered;
  const stepDist = distAfter - distBefore;
  totalSteps++;
  
  if (i < 10 || stepDist > 20) {
    console.log(`Step ${i+1}: x=${match._playerCoords[cmPid].x.toFixed(1)}, stepDist=${stepDist.toFixed(1)}m, total=${distAfter.toFixed(0)}m`);
  }
}

console.log(`\n总步数: ${totalSteps}`);
console.log(`最终距离: ${match._playerCoords[cmPid].distanceCovered.toFixed(0)}m`);
console.log(`平均每步: ${(match._playerCoords[cmPid].distanceCovered / totalSteps).toFixed(1)}m`);
