// 检查比赛事件的时间间隔
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

console.log('=== 比赛时间间隔分析 ===\n');

let lastMinute = 0;
let intervals = [];

// 运行完整比赛
for (let i = 0; i < 200 && !match.is_full_time; i++) {
  const ev = match.step();
  if (!ev) continue;
  
  const interval = ev.minute - lastMinute;
  intervals.push(interval);
  
  if (i < 20) {
    console.log(`事件 ${i + 1}: ${ev.desc}`);
    console.log(`  时间: ${ev.minute}' (间隔: +${interval}分钟)`);
    console.log('');
  }
  
  lastMinute = ev.minute;
}

// 统计
const totalEvents = intervals.length;
const avgInterval = intervals.reduce((a, b) => a + b, 0) / totalEvents;
const maxInterval = Math.max(...intervals);
const minInterval = Math.min(...intervals.filter(i => i > 0));

console.log('=== 统计 ===');
console.log(`总事件数: ${totalEvents}`);
console.log(`平均间隔: ${avgInterval.toFixed(1)} 分钟`);
console.log(`最大间隔: ${maxInterval} 分钟`);
console.log(`最小间隔: ${minInterval} 分钟`);
console.log(`比赛总时长: ${lastMinute} 分钟`);

// 换算成现实秒数（假设90分钟比赛）
const realSecondsPerGameMinute = 90 * 60 / lastMinute;
console.log(`\n换算: 1游戏分钟 = ${realSecondsPerGameMinute.toFixed(1)} 现实秒`);
console.log(`平均事件间隔: ${(avgInterval * realSecondsPerGameMinute).toFixed(1)} 现实秒`);
