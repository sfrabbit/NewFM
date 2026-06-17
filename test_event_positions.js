// 测试事件中的positions数据
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

// 运行几步
for (let i = 0; i < 3 && !match.is_full_time; i++) {
  match.step();
}

console.log('=== 检查事件中的positions数据 ===');
console.log(`事件数量: ${match.events.length}`);

for (let i = 0; i < Math.min(3, match.events.length); i++) {
  const ev = match.events[i];
  console.log(`\n事件 ${i + 1}:`);
  console.log(`  类型: ${ev.type}`);
  console.log(`  时间: ${ev.minute}'`);
  console.log(`  持球者: ${ev.carrier_pid}`);
  console.log(`  positions存在: ${!!ev.positions}`);
  
  if (ev.positions) {
    const keys = Object.keys(ev.positions);
    console.log(`  positions数量: ${keys.length}`);
    console.log(`  示例key: ${keys[0]}`);
    const sample = ev.positions[keys[0]];
    console.log(`  示例数据: x=${sample.x}, y=${sample.y}, role=${sample.role}`);
  }
}
