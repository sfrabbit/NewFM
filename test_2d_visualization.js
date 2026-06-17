// ============================================================
// 2D可视化测试 - 验证前后端坐标传输
// ============================================================

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

// 模拟前端的 realCoordToSVG 函数
function realCoordToSVG(x, y) {
  const W = 60, H = 95;
  const xPct = (x + 52.5) / 105 * 100;
  const yPct = (y + 34) / 68 * 100;
  return [
    (xPct / 100) * W,
    H - (yPct / 100) * H
  ];
}

function test2DVisualization() {
  console.log('='.repeat(80));
  console.log('2D可视化测试 - 验证前后端坐标传输');
  console.log('='.repeat(80));
  
  const home = createTestTeam('home', '4-3-3');
  const away = createTestTeam('away', '4-3-3');
  
  const match = new MatchEngine(home, away, 42);
  match.initMatch('home');
  
  // 运行几步比赛
  for (let i = 0; i < 10 && !match.is_full_time; i++) {
    match.step();
  }
  
  console.log(`\n比赛时间: ${match.minute}分钟`);
  console.log(`事件数: ${match.events.length}`);
  
  // 获取比赛总结
  const summary = match.matchSummary();
  
  console.log('\n--- 后端 _playerCoords (真实坐标) ---');
  console.log('角色 | 后端X | 后端Y | 跑动距离');
  console.log('-'.repeat(50));
  
  for (const [pid, data] of Object.entries(match._playerCoords)) {
    if (data.team === 'home') {
      console.log(`${data.role.padEnd(6)} | ${data.x.toFixed(1).padStart(6)} | ${data.y.toFixed(1).padStart(6)} | ${(data.distanceCovered/1000).toFixed(1)}km`);
    }
  }
  
  console.log('\n--- matchSummary 返回的坐标 ---');
  console.log('角色 | 返回X | 返回Y | 疲劳度');
  console.log('-'.repeat(50));
  
  for (const pos of summary.home_positions) {
    console.log(`${pos.role.padEnd(6)} | ${(pos.x || 0).toFixed(1).padStart(6)} | ${(pos.y || 0).toFixed(1).padStart(6)} | ${((pos.fatigue || 0)*100).toFixed(1)}%`);
  }
  
  console.log('\n--- 前端 SVG 坐标 (模拟 realCoordToSVG) ---');
  console.log('角色 | SVG X | SVG Y | 预期范围');
  console.log('-'.repeat(50));
  
  for (const pos of summary.home_positions) {
    if (pos.x !== undefined && pos.y !== undefined) {
      const [svgX, svgY] = realCoordToSVG(pos.x, pos.y);
      console.log(`${pos.role.padEnd(6)} | ${svgX.toFixed(1).padStart(6)} | ${svgY.toFixed(1).padStart(6)} | X:0-60, Y:0-95`);
    }
  }
  
  // 验证坐标是否正确传输
  console.log('\n--- 坐标传输验证 ---');
  let allCorrect = true;
  for (const pos of summary.home_positions) {
    const backendCoord = match._playerCoords[pos.pid];
    if (backendCoord) {
      const xDiff = Math.abs(pos.x - backendCoord.x);
      const yDiff = Math.abs(pos.y - backendCoord.y);
      if (xDiff > 0.1 || yDiff > 0.1) {
        console.log(`❌ ${pos.role}: 坐标不匹配! 后端(${backendCoord.x.toFixed(1)},${backendCoord.y.toFixed(1)}) vs 返回(${pos.x.toFixed(1)},${pos.y.toFixed(1)})`);
        allCorrect = false;
      }
    }
  }
  
  if (allCorrect) {
    console.log('✅ 所有坐标正确传输到前端');
  }
  
  // 验证SVG坐标范围
  console.log('\n--- SVG坐标范围验证 ---');
  let svgRangeOk = true;
  for (const pos of summary.home_positions) {
    if (pos.x !== undefined && pos.y !== undefined) {
      const [svgX, svgY] = realCoordToSVG(pos.x, pos.y);
      if (svgX < 0 || svgX > 60 || svgY < 0 || svgY > 95) {
        console.log(`❌ ${pos.role}: SVG坐标越界! (${svgX.toFixed(1)}, ${svgY.toFixed(1)})`);
        svgRangeOk = false;
      }
    }
  }
  
  if (svgRangeOk) {
    console.log('✅ 所有SVG坐标在有效范围内 (0-60, 0-95)');
  }
}

test2DVisualization();
