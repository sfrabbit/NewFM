// ============================================================
// 22人位置记录与分析测试
// 记录每个球员的位置，验证是否符合现实逻辑
// ============================================================

const { MatchEngine } = require("./engine/match");
const { Team, TacticalInstructions } = require("./engine/teams");

// 创建测试球队
function createTestTeam(name, formation, style = 'balanced') {
  const tactics = new TacticalInstructions({});
  const players = {};
  
  const roleDefs = {
    '4-3-3': ['GK','FB_L','CB_L','CB_R','FB_R','CM_L','CM_C','CM_R','W_L','ST_C','W_R'],
    '4-4-2': ['GK','FB_L','CB_L','CB_R','FB_R','LM_L','CM_L','CM_R','LM_R','ST_L','ST_R'],
    '3-5-2': ['GK','CB_L','CB_C','CB_R','WB_L','CM_L','CM_C','CM_R','WB_R','ST_L','ST_R'],
    '4-2-3-1': ['GK','FB_L','CB_L','CB_R','FB_R','DM_C','CM_C','W_L','AM_C','W_R','ST_C']
  };
  
  const roles = roleDefs[formation] || roleDefs['4-3-3'];
  
  const playersData = roles.map((role, i) => {
    const pid = `${name}_P${i}`;
    return {
      pid,
      role,
      attrs: generateAttrs(role),
      quality: 'starter'
    };
  });
  
  return new Team({ name, formation, tactics, playersData });
}

function generateAttrs(role) {
  const base = {
    '速度': 12, '爆发': 12, '耐力': 12, '体质': 12,
    '足球理解': 12, '决断速度': 12, '自信': 10, '团队': 10,
    '触球精度': 12, '控制技巧': 12, '防守技术': 12,
    '空中能力': 12, '力量输出': 12, '对抗': 12
  };
  
  const pos = role.split('_')[0];
  if (pos === 'GK') {
    base['足球理解'] = 14;
    base['决断速度'] = 14;
  } else if (pos === 'CB') {
    base['防守技术'] = 14;
    base['空中能力'] = 14;
    base['对抗'] = 14;
  } else if (pos === 'ST') {
    base['力量输出'] = 14;
    base['决断速度'] = 14;
  } else if (pos === 'W' || pos === 'WM') {
    base['速度'] = 14;
    base['爆发'] = 14;
  } else if (pos === 'CM') {
    base['足球理解'] = 14;
    base['控制技巧'] = 14;
  }
  
  return base;
}

// 位置类型分组
const POSITION_GROUPS = {
  GK: ['GK'],
  CB: ['CB_L', 'CB_C', 'CB_R', 'CB'],
  FB: ['FB_L', 'FB_R', 'LB', 'RB'],
  WB: ['WB_L', 'WB_R', 'LWB', 'RWB'],
  DM: ['DM_C', 'DM', 'CDM'],
  CM: ['CM_L', 'CM_C', 'CM_R', 'CM'],
  AM: ['AM_C', 'AM', 'CAM'],
  WM: ['W_L', 'W_R', 'LM_L', 'LM_R', 'W', 'LM', 'RM', 'LW', 'RW'],
  ST: ['ST_L', 'ST_C', 'ST_R', 'ST', 'CF', 'LF', 'RF']
};

function getPositionGroup(role) {
  const prefix = role.split('_')[0];
  for (const [group, roles] of Object.entries(POSITION_GROUPS)) {
    if (roles.includes(role) || roles.includes(prefix)) return group;
  }
  return 'OTHER';
}

// 分析位置合理性
function analyzePositionRealism(playerCoords, teamName, possession) {
  const analysis = {
    team: teamName,
    possession: possession,
    players: [],
    groupStats: {},
    issues: []
  };
  
  // 确定球队的攻击方向
  // home: 攻击+x方向 ( toward +52.5), away: 攻击-x方向 ( toward -52.5)
  const attackDir = teamName === 'home' ? 1 : -1;
  
  // 按位置类型分组统计
  for (const [pid, data] of Object.entries(playerCoords)) {
    const group = getPositionGroup(data.role);
    const x = data.x; // 米制坐标，负=主队半场，正=客队半场
    const y = data.y;
    
    if (!analysis.groupStats[group]) {
      analysis.groupStats[group] = { count: 0, avgX: 0, avgY: 0, minX: Infinity, maxX: -Infinity, players: [] };
    }
    
    const gs = analysis.groupStats[group];
    gs.count++;
    gs.avgX += x;
    gs.avgY += y;
    gs.minX = Math.min(gs.minX, x);
    gs.maxX = Math.max(gs.maxX, x);
    gs.players.push({ pid, role: data.role, x, y });
    
    analysis.players.push({
      pid, role: data.role, group, x, y,
      fatigue: data.fatigue,
      distanceCovered: data.distanceCovered
    });
  }
  
  // 计算平均值
  for (const gs of Object.values(analysis.groupStats)) {
    gs.avgX /= gs.count;
    gs.avgY /= gs.count;
  }
  
  // 验证位置合理性
  const isAttacking = possession === teamName.toLowerCase();
  
  // GK应该在自己的球门附近
  // home: -52.5附近, away: +52.5附近
  if (analysis.groupStats.GK) {
    const gk = analysis.groupStats.GK;
    const expectedGK = attackDir === 1 ? -48 : 48;  // home: -48, away: +48
    const gkDist = Math.abs(gk.avgX - expectedGK);
    if (gkDist > 10) {
      analysis.issues.push(`GK位置不当: ${gk.avgX.toFixed(1)}m (应在${expectedGK}m附近)`);
    }
  }
  
  // CB应该在自己的后场（范围稍微放宽）
  // home: -45到-15, away: +15到+45
  if (analysis.groupStats.CB) {
    const cb = analysis.groupStats.CB;
    const expectedRange = attackDir === 1 
      ? (isAttacking ? [-35, -5] : [-45, -15])   // home
      : (isAttacking ? [5, 35] : [15, 45]);      // away
    if (cb.avgX < Math.min(...expectedRange) || cb.avgX > Math.max(...expectedRange)) {
      analysis.issues.push(`CB位置不当: ${cb.avgX.toFixed(1)}m (应在${expectedRange[0]}~${expectedRange[1]}m)`);
    }
  }
  
  // CM应该在中场区域（范围稍微放宽）
  if (analysis.groupStats.CM) {
    const cm = analysis.groupStats.CM;
    const cmRange = attackDir === 1 ? [-35, 30] : [-30, 35];
    if (cm.avgX < cmRange[0] || cm.avgX > cmRange[1]) {
      analysis.issues.push(`CM位置不当: ${cm.avgX.toFixed(1)}m (应在${cmRange[0]}~${cmRange[1]}m)`);
    }
  }
  
  // ST应该在对方半场（进攻方向）
  if (analysis.groupStats.ST) {
    const st = analysis.groupStats.ST;
    const minSt = attackDir === 1 ? 10 : -52;  // home: >10, away: <-10 (但away是负值，所以用<)
    if (attackDir === 1 && st.avgX < minSt) {
      analysis.issues.push(`ST位置过后: ${st.avgX.toFixed(1)}m (应≥${minSt}m)`);
    } else if (attackDir === -1 && st.avgX > -minSt) {
      analysis.issues.push(`ST位置过后: ${st.avgX.toFixed(1)}m (应≤${-minSt}m)`);
    }
  }
  
  // 检查宽度分布 (y坐标，与攻击方向无关)
  const widePlayers = analysis.players.filter(p => ['FB', 'WB', 'WM'].includes(p.group));
  for (const wp of widePlayers) {
    if (Math.abs(wp.y) < 10) {
      analysis.issues.push(`${wp.role}(${wp.pid}) 宽度不足: y=${wp.y.toFixed(1)}m (边路应|y|>15m)`);
    }
  }
  
  return analysis;
}

// 主测试
function runPositionTest() {
  console.log('='.repeat(80));
  console.log('22人位置记录与现实逻辑分析');
  console.log('='.repeat(80));
  
  const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
  const allResults = [];
  
  for (const fm of formations) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`阵型: ${fm}`);
    console.log('='.repeat(40));
    
    const home = createTestTeam('home', fm, 'balanced');
    const away = createTestTeam('away', fm, 'balanced');
    
    const match = new MatchEngine(home, away, 42);
    match.initMatch('home');
    
    // 运行比赛并记录位置
    const snapshots = [];
    const maxSteps = 50;
    
    for (let i = 0; i < maxSteps && !match.is_full_time; i++) {
      const event = match.step();
      
      // 记录当前22人位置
      const snapshot = {
        step: i,
        minute: match.minute,
        possession: match.possession,
        ballZone: match.ball_zone,
        ballCoord: { ...match._ballCoord },
        homePlayers: {},
        awayPlayers: {}
      };
      
      for (const [pid, data] of Object.entries(match._playerCoords)) {
        const playerData = {
          role: data.role,
          x: data.x,
          y: data.y,
          fatigue: data.fatigue,
          distanceCovered: data.distanceCovered,
          team: data.team
        };
        
        if (data.team === 'home') {
          snapshot.homePlayers[pid] = playerData;
        } else {
          snapshot.awayPlayers[pid] = playerData;
        }
      }
      
      snapshots.push(snapshot);
    }
    
    // 分析最后一步的位置
    const finalSnapshot = snapshots[snapshots.length - 1];
    
    console.log(`\n[比赛数据] 步数: ${snapshots.length}, 最终时间: ${finalSnapshot.minute}分钟`);
    console.log(`[球位置] Zone: ${finalSnapshot.ballZone}, 坐标: (${finalSnapshot.ballCoord.x.toFixed(1)}, ${finalSnapshot.ballCoord.y.toFixed(1)})`);
    console.log(`[控球方] ${finalSnapshot.possession}`);
    
    // 分析主队位置
    const homeAnalysis = analyzePositionRealism(finalSnapshot.homePlayers, 'home', finalSnapshot.possession);
    console.log(`\n--- 主队位置分析 ---`);
    printPositionAnalysis(homeAnalysis);
    
    // 分析客队位置
    const awayAnalysis = analyzePositionRealism(finalSnapshot.awayPlayers, 'away', finalSnapshot.possession);
    console.log(`\n--- 客队位置分析 ---`);
    printPositionAnalysis(awayAnalysis);
    
    // 记录详细球员位置
    console.log(`\n--- 详细球员位置 (主队) ---`);
    printPlayerPositions(homeAnalysis.players);
    
    console.log(`\n--- 详细球员位置 (客队) ---`);
    printPlayerPositions(awayAnalysis.players);
    
    allResults.push({
      formation: fm,
      homeAnalysis,
      awayAnalysis,
      snapshots: snapshots.slice(0, 10) // 只保存前10个快照
    });
  }
  
  // 汇总报告
  console.log('\n' + '='.repeat(80));
  console.log('汇总报告');
  console.log('='.repeat(80));
  
  for (const r of allResults) {
    const homeIssues = r.homeAnalysis.issues.length;
    const awayIssues = r.awayAnalysis.issues.length;
    const status = (homeIssues === 0 && awayIssues === 0) ? '✅ 通过' : `⚠️ ${homeIssues + awayIssues}个问题`;
    console.log(`${r.formation}: ${status}`);
  }
  
  return allResults;
}

function printPositionAnalysis(analysis) {
  console.log(`控球状态: ${analysis.possession === analysis.team ? '进攻' : '防守'}`);
  console.log(`\n各位置类型平均位置:`);
  console.log(`类型 | 人数 | 平均X | 平均Y | X范围`);
  console.log('-'.repeat(50));
  
  for (const [group, stats] of Object.entries(analysis.groupStats)) {
    console.log(`${group.padEnd(4)} | ${stats.count} | ${stats.avgX.toFixed(1).padStart(5)} | ${stats.avgY.toFixed(1).padStart(5)} | ${stats.minX.toFixed(0)}~${stats.maxX.toFixed(0)}`);
  }
  
  if (analysis.issues.length > 0) {
    console.log(`\n⚠️ 发现 ${analysis.issues.length} 个问题:`);
    analysis.issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  } else {
    console.log(`\n✅ 位置分布符合现实逻辑`);
  }
}

function printPlayerPositions(players) {
  console.log(`角色 | 位置组 | X(米) | Y(米) | 疲劳 | 跑动距离`);
  console.log('-'.repeat(60));
  
  // 按位置组排序
  const sorted = [...players].sort((a, b) => {
    const groupOrder = ['GK', 'CB', 'FB', 'WB', 'DM', 'CM', 'AM', 'WM', 'ST'];
    const aIdx = groupOrder.indexOf(a.group);
    const bIdx = groupOrder.indexOf(b.group);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.x - b.x;
  });
  
  for (const p of sorted) {
    const roleShort = p.role.padEnd(6);
    const groupShort = p.group.padEnd(4);
    const xStr = p.x.toFixed(1).padStart(6);
    const yStr = p.y.toFixed(1).padStart(6);
    const fatigueStr = ((p.fatigue || 0) * 100).toFixed(0).padStart(3);
    const distStr = (p.distanceCovered || 0).toFixed(0).padStart(5);
    console.log(`${roleShort} | ${groupShort} | ${xStr} | ${yStr} | ${fatigueStr}% | ${distStr}m`);
  }
}

// 运行测试
runPositionTest();
