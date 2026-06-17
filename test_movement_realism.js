// ============================================================
// 球员移动现实概率测试
// 验证跑动距离、速度、疲劳累积是否符合现实
// ============================================================

const { MatchEngine } = require("./engine/match");
const { Team, TacticalInstructions } = require("./engine/teams");

function createTestTeam(name, formation) {
  const tactics = new TacticalInstructions({});
  const roleDefs = {
    '4-3-3': ['GK','FB_L','CB_L','CB_R','FB_R','CM_L','CM_C','CM_R','W_L','ST_C','W_R'],
    '4-4-2': ['GK','FB_L','CB_L','CB_R','FB_R','LM_L','CM_L','CM_R','LM_R','ST_L','ST_R'],
    '3-5-2': ['GK','CB_L','CB_C','CB_R','WB_L','CM_L','CM_C','CM_R','WB_R','ST_L','ST_R'],
  };
  const roles = roleDefs[formation];
  const playersData = roles.map((role, i) => ({
    pid: `${name}_P${i}`,
    role,
    attrs: { 
      '速度': 12, '爆发': 12, '耐力': 12, 
      '足球理解': 12, '决断速度': 12 
    },
    quality: 'starter'
  }));
  return new Team({ name, formation, tactics, playersData });
}

// 现实足球参考数据（90分钟比赛）
const REALITY_STATS = {
  // 场均跑动距离 (米)
  distancePerMatch: {
    GK: { min: 2000, avg: 4000, max: 6000 },
    CB: { min: 8000, avg: 10000, max: 11000 },
    FB: { min: 9000, avg: 11000, max: 13000 },
    WB: { min: 10000, avg: 12000, max: 14000 },
    DM: { min: 9000, avg: 11000, max: 13000 },
    CM: { min: 10000, avg: 11500, max: 13000 },
    AM: { min: 9000, avg: 10500, max: 12000 },
    WM: { min: 10000, avg: 11500, max: 13000 },
    ST: { min: 9000, avg: 10500, max: 12000 }
  },
  // 最高速度 (km/h)
  maxSpeed: {
    GK: 20, CB: 28, FB: 32, WB: 33, DM: 30, 
    CM: 31, AM: 32, WM: 34, ST: 35
  },
  // 冲刺次数 (每场)
  sprintsPerMatch: {
    GK: 5, CB: 15, FB: 35, WB: 40, DM: 25,
    CM: 30, AM: 35, WM: 40, ST: 40
  }
};

function getPositionGroup(role) {
  const prefix = role.split('_')[0];
  const groups = {
    GK: ['GK'],
    CB: ['CB'], FB: ['FB'], WB: ['WB'],
    DM: ['DM'], CM: ['CM'], AM: ['AM'],
    WM: ['W', 'LM', 'RM', 'LW', 'RW'],
    ST: ['ST', 'CF']
  };
  for (const [g, roles] of Object.entries(groups)) {
    if (roles.includes(prefix)) return g;
  }
  return prefix;
}

function analyzeMovementRealism(match, durationMinutes = 90) {
  const results = {
    home: {}, away: {},
    issues: [],
    summary: {}
  };
  
  // 注意：_stepMovementPlayers 的 dt 已经乘以了 MOVEMENT_TIME_MULTIPLIER (4.5)
  // 所以 distanceCovered 已经是"等效90分钟"的距离，不需要再推算
  
  for (const [pid, data] of Object.entries(match._playerCoords)) {
    const group = getPositionGroup(data.role);
    const team = data.team;
    
    if (!results[team][group]) {
      results[team][group] = {
        count: 0,
        totalDistance: 0,
        avgDistance: 0,
        maxSpeed: 0,
        avgFatigue: 0,
        players: []
      };
    }
    
    const g = results[team][group];
    g.count++;
    
    // 直接使用 distanceCovered（已经包含时间乘数）
    g.totalDistance += data.distanceCovered;
    g.avgFatigue += data.fatigue;
    
    g.players.push({
      role: data.role,
      distance: data.distanceCovered,
      fatigue: data.fatigue,
      currentX: data.x,
      currentY: data.y
    });
  }
  
  // 计算平均值并与现实对比
  for (const team of ['home', 'away']) {
    for (const [group, stats] of Object.entries(results[team])) {
      stats.avgDistance = stats.totalDistance / stats.count;
      stats.avgFatigue = stats.avgFatigue / stats.count;
      
      const reality = REALITY_STATS.distancePerMatch[group];
      if (reality) {
        const ratio = stats.avgDistance / reality.avg;
        stats.realityRatio = ratio;
        
        // 检查是否合理 (0.7x ~ 1.3x 视为合理)
        if (ratio < 0.7) {
          results.issues.push(`${team} ${group}: 跑动距离过低 ${(stats.avgDistance/1000).toFixed(1)}km (应为${(reality.avg/1000).toFixed(1)}km)`);
        } else if (ratio > 1.3) {
          results.issues.push(`${team} ${group}: 跑动距离过高 ${(stats.avgDistance/1000).toFixed(1)}km (应为${(reality.avg/1000).toFixed(1)}km)`);
        }
      }
    }
  }
  
  return results;
}

function runMovementTest() {
  console.log('='.repeat(80));
  console.log('球员移动现实概率测试');
  console.log('='.repeat(80));
  
  const formations = ['4-3-3', '4-4-2', '3-5-2'];
  
  for (const fm of formations) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`阵型: ${fm}`);
    console.log('='.repeat(40));
    
    const home = createTestTeam('home', fm);
    const away = createTestTeam('away', fm);
    
    const match = new MatchEngine(home, away, 42);
    match.initMatch('home');
    
    // 运行完整比赛模拟
    const maxSteps = 200;
    for (let i = 0; i < maxSteps && !match.is_full_time; i++) {
      match.step();
    }
    
    console.log(`\n比赛时长: ${match.minute}分钟`);
    console.log(`事件数: ${match.events.length}`);
    
    // 分析移动数据
    const analysis = analyzeMovementRealism(match, 90);
    
    // 打印各位置跑动数据
    console.log(`\n--- 跑动距离对比 (推算90分钟) ---`);
    console.log(`位置 | 人数 | 平均距离 | 现实参考 | 比例 | 状态`);
    console.log('-'.repeat(70));
    
    for (const team of ['home', 'away']) {
      console.log(`\n${team === 'home' ? '主队' : '客队'}:`);
      for (const [group, stats] of Object.entries(analysis[team])) {
        const reality = REALITY_STATS.distancePerMatch[group];
        const distKm = (stats.avgDistance / 1000).toFixed(1);
        const refKm = reality ? (reality.avg / 1000).toFixed(1) : '?';
        const ratio = stats.realityRatio ? stats.realityRatio.toFixed(2) : '?';
        const status = stats.realityRatio && stats.realityRatio >= 0.7 && stats.realityRatio <= 1.3 
          ? '✅' 
          : (stats.realityRatio && stats.realityRatio > 1.3 ? '⚠️高' : (stats.realityRatio && stats.realityRatio < 0.7 ? '⚠️低' : '?'));
        console.log(`  ${group.padEnd(4)} | ${stats.count} | ${distKm.padStart(6)}km | ${refKm.padStart(6)}km | ${ratio.padStart(4)}x | ${status}`);
      }
    }
    
    // 打印疲劳度
    console.log(`\n--- 疲劳度 ---`);
    for (const team of ['home', 'away']) {
      console.log(`\n${team === 'home' ? '主队' : '客队'}:`);
      for (const [group, stats] of Object.entries(analysis[team])) {
        const fatiguePct = (stats.avgFatigue * 100).toFixed(1);
        console.log(`  ${group.padEnd(4)}: ${fatiguePct}%`);
      }
    }
    
    // 打印问题
    if (analysis.issues.length > 0) {
      console.log(`\n⚠️ 发现 ${analysis.issues.length} 个问题:`);
      analysis.issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    } else {
      console.log(`\n✅ 所有位置跑动距离符合现实范围`);
    }
  }
}

runMovementTest();
