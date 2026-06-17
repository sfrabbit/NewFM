// ============================================================
// 详细分析测试 - 记录每个细节
// ============================================================

const { MatchEngine } = require("./engine/match");
const { Team, TacticalInstructions } = require("./engine/teams");

function createTestTeam(name, formation, style = 'balanced') {
  const tactics = new TacticalInstructions({});
  const roleDefs = {
    '4-3-3': ['GK','FB_L','CB_L','CB_R','FB_R','CM_L','CM_C','CM_R','W_L','ST_C','W_R'],
    '4-4-2': ['GK','FB_L','CB_L','CB_R','FB_R','LM_L','CM_L','CM_R','LM_R','ST_L','ST_R'],
    '3-5-2': ['GK','CB_L','CB_C','CB_R','WB_L','CM_L','CM_C','CM_R','WB_R','ST_L','ST_R'],
    '4-2-3-1': ['GK','FB_L','CB_L','CB_R','FB_R','DM_C','CM_C','W_L','AM_C','W_R','ST_C']
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

// 现实参考数据
const REALITY_DATA = {
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
  // 位置分布范围（米）
  positionRanges: {
    GK: { xMin: -52, xMax: -45 },
    CB: { xMin: -45, xMax: -15 },
    FB: { xMin: -40, xMax: 0 },
    WB: { xMin: -35, xMax: 10 },
    DM: { xMin: -35, xMax: -5 },
    CM: { xMin: -30, xMax: 10 },
    AM: { xMin: -10, xMax: 30 },
    WM: { xMin: -10, xMax: 30 },
    ST: { xMin: 10, xMax: 52 }
  },
  // 宽度范围（|y|）
  widthRanges: {
    GK: { min: 0, max: 10 },
    CB: { min: 0, max: 15 },
    FB: { min: 20, max: 34 },
    WB: { min: 25, max: 34 },
    DM: { min: 0, max: 15 },
    CM: { min: 0, max: 20 },
    AM: { min: 0, max: 20 },
    WM: { min: 20, max: 34 },
    ST: { min: 0, max: 15 }
  }
};

function analyzeDetailed(match, formation) {
  const results = {
    formation,
    matchDuration: match.minute,
    eventCount: match.events.length,
    home: {},
    away: {},
    ballMovement: [],
    issues: []
  };
  
  // 分析每个球员
  for (const [pid, data] of Object.entries(match._playerCoords)) {
    const group = getPositionGroup(data.role);
    const team = data.team;
    
    if (!results[team][group]) {
      results[team][group] = {
        count: 0,
        players: [],
        stats: {
          x: { sum: 0, min: Infinity, max: -Infinity },
          y: { sum: 0, min: Infinity, max: -Infinity },
          distance: { sum: 0, min: Infinity, max: -Infinity },
          fatigue: { sum: 0, min: Infinity, max: -Infinity }
        }
      };
    }
    
    const g = results[team][group];
    g.count++;
    
    const playerData = {
      pid,
      role: data.role,
      x: data.x,
      y: data.y,
      distance: data.distanceCovered,
      fatigue: data.fatigue,
      defaultX: data.defaultX,
      defaultY: data.defaultY
    };
    g.players.push(playerData);
    
    // 统计
    g.stats.x.sum += data.x;
    g.stats.x.min = Math.min(g.stats.x.min, data.x);
    g.stats.x.max = Math.max(g.stats.x.max, data.x);
    g.stats.y.sum += Math.abs(data.y);  // 使用绝对值统计宽度
    g.stats.y.min = Math.min(g.stats.y.min, Math.abs(data.y));
    g.stats.y.max = Math.max(g.stats.y.max, Math.abs(data.y));
    g.stats.distance.sum += data.distanceCovered;
    g.stats.distance.min = Math.min(g.stats.distance.min, data.distanceCovered);
    g.stats.distance.max = Math.max(g.stats.distance.max, data.distanceCovered);
    g.stats.fatigue.sum += data.fatigue;
    g.stats.fatigue.min = Math.min(g.stats.fatigue.min, data.fatigue);
    g.stats.fatigue.max = Math.max(g.stats.fatigue.max, data.fatigue);
  }
  
  // 计算平均值并验证
  for (const team of ['home', 'away']) {
    for (const [group, data] of Object.entries(results[team])) {
      const avgX = data.stats.x.sum / data.count;
      const avgY = data.stats.y.sum / data.count;
      const avgDist = data.stats.distance.sum / data.count;
      const avgFatigue = data.stats.fatigue.sum / data.count;
      
      data.avg = { x: avgX, y: avgY, distance: avgDist, fatigue: avgFatigue };
      
      // 验证位置分布
      const ranges = REALITY_DATA.positionRanges[group];
      if (ranges) {
        const isHome = team === 'home';
        // 主队和客队的X范围是相反的
        const expectedXMin = isHome ? ranges.xMin : -ranges.xMax;
        const expectedXMax = isHome ? ranges.xMax : -ranges.xMin;
        
        if (avgX < expectedXMin - 5 || avgX > expectedXMax + 5) {
          results.issues.push(`${team} ${group}: 位置异常 x=${avgX.toFixed(1)} (预期${expectedXMin}~${expectedXMax})`);
        }
      }
      
      // 验证宽度
      const widthRange = REALITY_DATA.widthRanges[group];
      if (widthRange && (avgY < widthRange.min || avgY > widthRange.max + 5)) {
        results.issues.push(`${team} ${group}: 宽度异常 y=${avgY.toFixed(1)} (预期${widthRange.min}~${widthRange.max})`);
      }
      
      // 验证跑动距离
      const distRef = REALITY_DATA.distancePerMatch[group];
      if (distRef) {
        const ratio = avgDist / distRef.avg;
        if (ratio < 0.7) {
          results.issues.push(`${team} ${group}: 跑动距离过低 ${(avgDist/1000).toFixed(1)}km (应为${(distRef.avg/1000).toFixed(1)}km)`);
        } else if (ratio > 1.3) {
          results.issues.push(`${team} ${group}: 跑动距离过高 ${(avgDist/1000).toFixed(1)}km (应为${(distRef.avg/1000).toFixed(1)}km)`);
        }
      }
      
      // 验证疲劳度
      if (avgFatigue > 0.5) {
        results.issues.push(`${team} ${group}: 疲劳度过高 ${(avgFatigue*100).toFixed(1)}%`);
      }
    }
  }
  
  return results;
}

function printDetailedReport(results) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`阵型: ${results.formation}`);
  console.log(`比赛时长: ${results.matchDuration}分钟`);
  console.log(`事件数: ${results.eventCount}`);
  console.log('='.repeat(80));
  
  for (const team of ['home', 'away']) {
    console.log(`\n--- ${team === 'home' ? '主队' : '客队'} ---`);
    console.log(`位置 | 人数 | 平均X | X范围 | 平均|Y| | 距离 | 疲劳`);
    console.log('-'.repeat(80));
    
    for (const [group, data] of Object.entries(results[team])) {
      const xRange = `${data.stats.x.min.toFixed(0)}~${data.stats.x.max.toFixed(0)}`;
      const distKm = (data.avg.distance / 1000).toFixed(1);
      const fatiguePct = (data.avg.fatigue * 100).toFixed(1);
      console.log(`${group.padEnd(4)} | ${data.count} | ${data.avg.x.toFixed(1).padStart(6)} | ${xRange.padStart(10)} | ${data.avg.y.toFixed(1).padStart(6)} | ${distKm.padStart(5)}km | ${fatiguePct.padStart(5)}%`);
    }
  }
  
  // 详细球员数据
  console.log(`\n--- 详细球员数据 ---`);
  for (const team of ['home', 'away']) {
    console.log(`\n${team === 'home' ? '主队' : '客队'}:`);
    console.log(`角色 | 当前X | 当前Y | 默认X | 默认Y | 跑动距离 | 疲劳`);
    console.log('-'.repeat(80));
    
    for (const [group, data] of Object.entries(results[team])) {
      for (const p of data.players) {
        console.log(`${p.role.padEnd(6)} | ${p.x.toFixed(1).padStart(6)} | ${p.y.toFixed(1).padStart(6)} | ${p.defaultX.toFixed(1).padStart(6)} | ${p.defaultY.toFixed(1).padStart(6)} | ${(p.distance/1000).toFixed(1).padStart(7)}km | ${(p.fatigue*100).toFixed(1).padStart(5)}%`);
      }
    }
  }
  
  // 问题汇总
  if (results.issues.length > 0) {
    console.log(`\n⚠️ 发现 ${results.issues.length} 个问题:`);
    results.issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  } else {
    console.log(`\n✅ 所有指标符合现实范围`);
  }
}

function runDetailedTest() {
  console.log('='.repeat(80));
  console.log('详细分析测试');
  console.log('='.repeat(80));
  
  const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
  const allResults = [];
  
  for (const fm of formations) {
    const home = createTestTeam('home', fm);
    const away = createTestTeam('away', fm);
    
    const match = new MatchEngine(home, away, 42);
    match.initMatch('home');
    
    // 运行完整比赛
    while (!match.is_full_time) {
      match.step();
    }
    
    const results = analyzeDetailed(match, fm);
    allResults.push(results);
    printDetailedReport(results);
  }
  
  // 汇总
  console.log('\n' + '='.repeat(80));
  console.log('汇总报告');
  console.log('='.repeat(80));
  
  for (const r of allResults) {
    const status = r.issues.length === 0 ? '✅' : `⚠️ ${r.issues.length}个问题`;
    console.log(`${r.formation}: ${status}`);
  }
  
  return allResults;
}

runDetailedTest();
