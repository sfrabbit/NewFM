// 调试测试 - 检查初始化位置
const { MatchEngine } = require("./engine/match");
const { Team, TacticalInstructions } = require("./engine/teams");

function createTestTeam(name, formation) {
  const tactics = new TacticalInstructions({});
  const roleDefs = {
    '4-3-3': ['GK','FB_L','CB_L','CB_R','FB_R','CM_L','CM_C','CM_R','W_L','ST_C','W_R'],
  };
  const roles = roleDefs[formation];
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

console.log('=== 初始化位置 ===');
console.log('\n主队:');
for (const [pid, data] of Object.entries(match._playerCoords)) {
  if (data.team === 'home') {
    console.log(`  ${data.role}: defaultX=${data.defaultX.toFixed(1)}, defaultY=${data.defaultY.toFixed(1)}`);
  }
}

console.log('\n客队:');
for (const [pid, data] of Object.entries(match._playerCoords)) {
  if (data.team === 'away') {
    console.log(`  ${data.role}: defaultX=${data.defaultX.toFixed(1)}, defaultY=${data.defaultY.toFixed(1)}`);
  }
}
