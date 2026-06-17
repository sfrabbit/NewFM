// 调试 step() 返回的数据
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

console.log('=== 调试 step() 返回的数据 ===\n');

for (let i = 0; i < 3 && !match.is_full_time; i++) {
  const ev = match.step();
  console.log(`事件 ${i + 1}:`);
  console.log(`  desc: ${ev?.desc}`);
  console.log(`  type: ${ev?.type}`);
  console.log(`  carrier_pid: ${ev?.carrier_pid}`);
  console.log(`  carrier_x: ${ev?.carrier_x}`);
  console.log(`  carrier_y: ${ev?.carrier_y}`);
  console.log(`  positions存在: ${!!ev?.positions}`);
  console.log('');
}

console.log('=== 检查 match.events ===');
match.events.slice(0, 3).forEach((ev, i) => {
  console.log(`事件 ${i + 1}:`);
  console.log(`  desc: ${ev?.desc}`);
  console.log(`  carrier_x: ${ev?.carrier_x}`);
  console.log('');
});
