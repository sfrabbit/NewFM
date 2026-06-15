// 无防守传球质量公式 - 最终参数
console.log('=== 最终参数测试 ===\n');

const players = {
  elite: { touch: 18, power: 17 },
  good: { touch: 14, power: 13 },
  average: { touch: 10, power: 10 },
  poor: { touch: 7, power: 7 },
  powerType: { touch: 8, power: 16 },
  precisionType: { touch: 16, power: 8 }
};

// 公式M: 最终版本
// 目标：avg5m>85%, avg40m<50%, elite40m>70%
function passQualityM(touch, power, d) {
  // 精度基础（提高短传质量）
  // touch=10 → 90%, touch=18 → 98%, touch=7 → 82%
  const touchBase = 0.82 + touch * 0.011;
  
  // 力量门槛（精英长传更容易）
  const powerThreshold = 1 + d * 0.25;
  const powerFactor = power >= powerThreshold ? 1 : Math.max(0.5, power / powerThreshold);
  
  // 精英衰减更慢（能力越高，衰减越慢）
  const ability = (touch + power) / 40; // 0.35-0.88
  const decayRate = 0.01 - ability * 0.003; // 精英衰减率更低
  const decay = Math.max(0.35, 1 - d * decayRate);
  
  return Math.min(1, touchBase * powerFactor * decay);
}

// 公式N: 更直接
function passQualityN(touch, power, d) {
  // 短传基础高（任何人都能短传）
  const base = 0.90 - d * 0.005;
  
  // 精度加成
  const touchBonus = (touch - 10) * 0.008;
  
  // 力量修正（长距离）
  const powerNeed = Math.max(5, d * 0.3);
  const powerFactor = d <= 10 ? 1 : Math.min(1, power / powerNeed);
  
  // 精英衰减慢
  const ability = (touch + power) / 40;
  const eliteDecay = Math.max(0.4, 1 - d * (0.01 - ability * 0.004));
  
  return Math.min(1, (base + touchBonus) * powerFactor * eliteDecay);
}

// 公式O: 简化版
function passQualityO(touch, power, d) {
  // 基础成功率（距离衰减）
  const baseSuccess = Math.max(0.4, 0.95 - d * 0.008);
  
  // 精度修正
  const touchMod = (touch - 10) * 0.01;
  
  // 力量修正（长距离）
  const powerNeed = Math.max(3, d * 0.25);
  const powerMod = d <= 15 ? 0 : (power - powerNeed) * 0.005;
  
  // 精英衰减慢
  const ability = (touch + power) / 40;
  const eliteBonus = ability * 0.1;
  
  return Math.min(1, Math.max(0.1, baseSuccess + touchMod + powerMod + eliteBonus));
}

const formulas = [
  { name: '最终M', fn: passQualityM },
  { name: '直接N', fn: passQualityN },
  { name: '简化O', fn: passQualityO }
];

for (const formula of formulas) {
  console.log(`\n━━━ ${formula.name} ━━━`);
  console.log('距离(m) | elite | good | avg  | poor | 力量型 | 精度型');
  console.log('-'.repeat(60));
  
  for (const d of [5, 10, 20, 40, 60]) {
    const elite = formula.fn(players.elite.touch, players.elite.power, d);
    const good = formula.fn(players.good.touch, players.good.power, d);
    const avg = formula.fn(players.average.touch, players.average.power, d);
    const poor = formula.fn(players.poor.touch, players.poor.power, d);
    const powerT = formula.fn(players.powerType.touch, players.powerType.power, d);
    const precT = formula.fn(players.precisionType.touch, players.precisionType.power, d);
    
    console.log(
      `${d.toString().padStart(3)}    | ${(elite*100).toFixed(0)}%  | ${(good*100).toFixed(0)}%  | ${(avg*100).toFixed(0)}%  | ${(poor*100).toFixed(0)}%  | ${(powerT*100).toFixed(0)}%   | ${(precT*100).toFixed(0)}%`
    );
  }
  
  // 关键指标
  const avg5 = formula.fn(10, 10, 5);
  const avg40 = formula.fn(10, 10, 40);
  const elite40 = formula.fn(18, 17, 40);
  const pw40 = formula.fn(8, 16, 40);
  const pr40 = formula.fn(16, 8, 40);
  const pw5 = formula.fn(8, 16, 5);
  const pr5 = formula.fn(16, 8, 5);
  const e5 = formula.fn(18, 17, 5);
  const p5 = formula.fn(7, 7, 5);
  
  console.log(`\n关键指标:`);
  console.log(`  avg5m: ${(avg5*100).toFixed(0)}% ${avg5 > 0.85 ? '✓' : '✗'} (应>85%)`);
  console.log(`  avg40m: ${(avg40*100).toFixed(0)}% ${avg40 < 0.5 ? '✓' : '✗'} (应<50%)`);
  console.log(`  elite40m: ${(elite40*100).toFixed(0)}% ${elite40 > 0.7 ? '✓' : '✗'} (应>70%)`);
  console.log(`  力量型40m>精度型: ${pw40 > pr40 ? '✓' : '✗'} (${(pw40*100).toFixed(0)}% vs ${(pr40*100).toFixed(0)}%)`);
  console.log(`  精度型5m>力量型: ${pr5 > pw5 ? '✓' : '✗'} (${(pr5*100).toFixed(0)}% vs ${(pw5*100).toFixed(0)}%)`);
  console.log(`  elite5m>poor5m: ${e5 > p5 + 0.1 ? '✓' : '✗'} (${(e5*100).toFixed(0)}% vs ${(p5*100).toFixed(0)}%)`);
}

console.log('\n=== 测试完成 ===');