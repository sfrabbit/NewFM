// 实际比赛测试 - 验证球和球员位置
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

console.log('=== 比赛开始 ===');

// 运行10步
for (let i = 0; i < 10 && !match.is_full_time; i++) {
  const ev = match.step();
  
  console.log(`\n事件 ${i + 1}:`);
  console.log(`  描述: ${ev.desc}`);
  console.log(`  持球者: ${ev.carrier_pid}`);
  console.log(`  球 zone: ${ev.zone}`);
  
  if (ev.carrier_pid && ev.positions) {
    const carrierPos = ev.positions[`home_${ev.carrier_pid}`] || ev.positions[`away_${ev.carrier_pid}`];
    if (carrierPos) {
      console.log(`  持球者位置: x=${carrierPos.x.toFixed(1)}, y=${carrierPos.y.toFixed(1)}`);
      console.log(`  球应该在: x=${ev.carrier_x?.toFixed(1)}, y=${ev.carrier_y?.toFixed(1)}`);
      
      // 检查是否匹配
      if (ev.carrier_x !== undefined && ev.carrier_y !== undefined) {
        const dx = Math.abs(carrierPos.x - ev.carrier_x);
        const dy = Math.abs(carrierPos.y - ev.carrier_y);
        if (dx < 1 && dy < 1) {
          console.log(`  ✅ 球和持球者位置匹配`);
        } else {
          console.log(`  ❌ 球和持球者位置不匹配! 差值: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
        }
      }
    }
  }
}
