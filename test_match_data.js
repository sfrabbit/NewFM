// 比赛数据收集脚本 - 运行大量比赛并收集统计数据
const { MatchEngine } = require('./engine/match');
const { Team, TacticalInstructions } = require('./engine/teams');

function runTest(matches = 100) {
  const results = {
    totalMatches: matches,
    homeWins: 0,
    awayWins: 0,
    draws: 0,
    totalGoals: 0,
    totalShots: 0,
    totalShotsOnTarget: 0,
    totalPasses: 0,
    totalTackles: 0,
    totalFouls: 0,
    avgPossession: 0,
    eventTypes: {},
    scores: []
  };

  for (let i = 0; i < matches; i++) {
    const tactics = new TacticalInstructions({ tempo: 0, pressing_intensity: 0 });
    const home = new Team({ name: '主队', formation: '4-4-2', tactics });
    const away = new Team({ name: '客队', formation: '4-4-2', tactics });
    
    const engine = new MatchEngine(home, away, i);
    const result = engine.runMatch({ maxActions: 300, verbose: false });
    
    // 解析比分
    const [homeGoals, awayGoals] = result.score.split('-').map(Number);
    results.scores.push({ home: homeGoals, away: awayGoals });
    
    // 统计胜负
    if (homeGoals > awayGoals) results.homeWins++;
    else if (awayGoals > homeGoals) results.awayWins++;
    else results.draws++;
    
    // 统计数据
    results.totalGoals += homeGoals + awayGoals;
    
    const [homeShots, awayShots] = result.shots.split('-').map(Number);
    results.totalShots += homeShots + awayShots;
    
    const [homeSOT, awaySOT] = result.shots_on_target.split('-').map(Number);
    results.totalShotsOnTarget += homeSOT + awaySOT;
    
    const [homePasses, awayPasses] = result.passes.split('-').map(Number);
    results.totalPasses += homePasses + awayPasses;
    
    const [homeTackles, awayTackles] = result.tackles.split('-').map(Number);
    results.totalTackles += homeTackles + awayTackles;
    
    const [homeFouls, awayFouls] = result.fouls.split('-').map(Number);
    results.totalFouls += homeFouls + awayFouls;
    
    results.avgPossession += result.possession_home_pct;
    
    // 统计事件类型
    result.events.forEach(e => {
      results.eventTypes[e.type] = (results.eventTypes[e.type] || 0) + 1;
    });
  }
  
  // 计算平均值
  results.avgGoals = (results.totalGoals / matches).toFixed(2);
  results.avgShots = (results.totalShots / matches).toFixed(2);
  results.avgShotsOnTarget = (results.totalShotsOnTarget / matches).toFixed(2);
  results.avgPasses = (results.totalPasses / matches).toFixed(2);
  results.avgTackles = (results.totalTackles / matches).toFixed(2);
  results.avgFouls = (results.totalFouls / matches).toFixed(2);
  results.avgPossession = (results.avgPossession / matches).toFixed(1);
  
  return results;
}

// 运行测试
console.log('开始收集比赛数据...');
const results = runTest(100);

console.log('\n=== 比赛统计结果（100场）===');
console.log(`胜负平: 主胜${results.homeWins} 客胜${results.awayWins} 平局${results.draws}`);
console.log(`场均进球: ${results.avgGoals}`);
console.log(`场均射门: ${results.avgShots}`);
console.log(`场均射正: ${results.avgShotsOnTarget}`);
console.log(`场均传球: ${results.avgPasses}`);
console.log(`场均抢断: ${results.avgTackles}`);
console.log(`场均犯规: ${results.avgFouls}`);
console.log(`平均控球率: ${results.avgPossession}%`);

console.log('\n=== 事件类型分布 ===');
const totalEvents = Object.values(results.eventTypes).reduce((a, b) => a + b, 0);
for (const [type, count] of Object.entries(results.eventTypes).sort((a, b) => b[1] - a[1])) {
  const pct = ((count / totalEvents) * 100).toFixed(1);
  console.log(`${type}: ${count} (${pct}%)`);
}

console.log('\n=== 比分分布 ===');
const scoreDist = {};
results.scores.forEach(s => {
  const key = `${s.home}-${s.away}`;
  scoreDist[key] = (scoreDist[key] || 0) + 1;
});
const sortedScores = Object.entries(scoreDist).sort((a, b) => b[1] - a[1]).slice(0, 10);
sortedScores.forEach(([score, count]) => {
  console.log(`${score}: ${count}场`);
});
