// 测试球和持球者位置是否匹配
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

console.log('=== 测试球和持球者位置匹配 ===\n');

let matchCount = 0;
let mismatchCount = 0;

// 运行完整比赛
for (let i = 0; i < 100 && !match.is_full_time; i++) {
  const ev = match.step();
  if (!ev) continue;
  
  if (ev.carrier_pid && ev.positions && ev.carrier_x !== undefined && ev.carrier_y !== undefined) {
    // 查找持球者位置
    const carrierKeyHome = `home_${ev.carrier_pid}`;
    const carrierKeyAway = `away_${ev.carrier_pid}`;
    const carrierPos = ev.positions[carrierKeyHome] || ev.positions[carrierKeyAway];
    
    if (carrierPos) {
      const dx = Math.abs(ev.carrier_x - carrierPos.x);
      const dy = Math.abs(ev.carrier_y - carrierPos.y);
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      if (distance < 1) {
        matchCount++;
      } else {
        mismatchCount++;
        console.log(`❌ 事件 ${i + 1} (${ev.time}'): ${ev.desc}`);
        console.log(`   持球者: ${ev.carrier_pid}`);
        console.log(`   球位置: x=${ev.carrier_x.toFixed(2)}, y=${ev.carrier_y.toFixed(2)}`);
        console.log(`   人位置: x=${carrierPos.x.toFixed(2)}, y=${carrierPos.y.toFixed(2)}`);
        console.log(`   距离差: ${distance.toFixed(2)}米\n`);
      }
    }
  }
}

console.log(`\n=== 测试结果 ===`);
console.log(`匹配: ${matchCount}`);
console.log(`不匹配: ${mismatchCount}`);
console.log(`匹配率: ${(matchCount / (matchCount + mismatchCount) * 100).toFixed(1)}%`);

if (mismatchCount === 0) {
  console.log('\n✅ 所有事件中球和持球者位置完全匹配！');
} else {
  console.log('\n⚠️ 发现位置不匹配的事件！');
}
