// 调试移动系统
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

console.log('=== 初始位置 ===');
const cm1 = Object.entries(match._playerCoords).find(([pid, d]) => d.role === 'CM_C');
console.log(`CM_C: x=${cm1[1].x.toFixed(1)}, y=${cm1[1].y.toFixed(1)}, distance=${cm1[1].distanceCovered.toFixed(0)}`);

console.log('\n=== 运行10步 ===');
for (let i = 0; i < 10; i++) {
  match.step();
  const cm = Object.entries(match._playerCoords).find(([pid, d]) => d.role === 'CM_C');
  console.log(`Step ${i+1}: x=${cm[1].x.toFixed(1)}, y=${cm[1].y.toFixed(1)}, distance=${cm[1].distanceCovered.toFixed(0)}`);
}

console.log('\n=== 最终统计 ===');
for (const [pid, data] of Object.entries(match._playerCoords)) {
  if (data.team === 'home') {
    console.log(`${data.role}: distance=${data.distanceCovered.toFixed(0)}m, fatigue=${(data.fatigue*100).toFixed(1)}%`);
  }
}
