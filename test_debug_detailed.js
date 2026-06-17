// 详细调试移动系统
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

console.log('=== 初始状态 ===');
console.log('所有球员:');
for (const [pid, data] of Object.entries(match._playerCoords)) {
  if (data.team === 'home') {
    console.log(`  ${pid}: role=${data.role}, x=${data.x.toFixed(1)}, y=${data.y.toFixed(1)}`);
  }
}

// 找到 CM_C
const cmPid = Object.entries(match._playerCoords).find(([pid, d]) => d.team === 'home' && d.role === 'CM_C')?.[0];
console.log(`\nCM_C pid: ${cmPid}`);

const cmBefore = match._playerCoords[cmPid];
console.log(`CM_C: x=${cmBefore.x.toFixed(1)}, y=${cmBefore.y.toFixed(1)}, defaultX=${cmBefore.defaultX.toFixed(1)}, defaultY=${cmBefore.defaultY.toFixed(1)}`);
console.log(`球 zone: ${match.ball_zone}`);

// 手动调用 _stepMovementPlayers 并检查
const dt = 50;  // 50秒
console.log(`\n=== 调用 _stepMovementPlayers(dt=${dt}) ===`);

// 在调用前保存状态
const xBefore = cmBefore.x;
const yBefore = cmBefore.y;

match._stepMovementPlayers(dt);

const cmAfter = match._playerCoords[cmPid];
const dx = cmAfter.x - xBefore;
const dy = cmAfter.y - yBefore;
const dist = Math.sqrt(dx*dx + dy*dy);

console.log(`移动前: x=${xBefore.toFixed(1)}, y=${yBefore.toFixed(1)}`);
console.log(`移动后: x=${cmAfter.x.toFixed(1)}, y=${cmAfter.y.toFixed(1)}`);
console.log(`移动距离: ${dist.toFixed(1)}m`);
console.log(`疲劳度: ${(cmAfter.fatigue*100).toFixed(1)}%`);

// 计算理论最大移动距离
const speed = 5.0 + (12 - 10) * 0.6;  // ~6.2 m/s
const maxMove = speed * dt;
console.log(`理论最大移动距离: ${maxMove.toFixed(0)}m`);
