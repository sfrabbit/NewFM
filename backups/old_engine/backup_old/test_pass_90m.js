// 无防守传球质量公式 - 去掉精英分类，测试到90米
console.log('=== 传球质量测试（无分类，1-90米） ===\n');

// 球员属性（无分类标签）
const players = {
  high: { touch: 18, power: 17 },      // 高属性
  mediumHigh: { touch: 14, power: 13 }, // 中高属性
  medium: { touch: 10, power: 10 },     // 中等属性
  low: { touch: 7, power: 7 },          // 低属性
  powerFocus: { touch: 8, power: 16 },  // 力量倾向
  touchFocus: { touch: 16, power: 8 }   // 精度倾向
};

// 距离范围（1-90米）
const distances = [];
for (let d = 1; d <= 90; d += 5) {
  distances.push(d);
}

// 传球质量公式（无分类）
function passQuality(touch, power, distance) {
  // 精度基础（连续）
  const touchBase = 0.82 + touch * 0.011;
  
  // 力量门槛（连续）
  const powerThreshold = 1 + distance * 0.25;
  const powerFactor = power >= powerThreshold ? 1 : Math.max(0.3, power / powerThreshold);
  
  // 衰减率由属性连续决定（无分类）
  const decayRate = 0.01 - (touch + power) * 0.00015;
  const decay = Math.max(0.2, 1 - distance * decayRate);
  
  return Math.min(1, touchBase * powerFactor * decay);
}

// 测试输出
console.log('距离(m) | 高属性 | 中高 | 中等 | 低属性 | 力量倾向 | 精度倾向');
console.log('-'.repeat(70));

for (const d of distances) {
  const high = passQuality(players.high.touch, players.high.power, d);
  const medHigh = passQuality(players.mediumHigh.touch, players.mediumHigh.power, d);
  const med = passQuality(players.medium.touch, players.medium.power, d);
  const low = passQuality(players.low.touch, players.low.power, d);
  const powerF = passQuality(players.powerFocus.touch, players.powerFocus.power, d);
  const touchF = passQuality(players.touchFocus.touch, players.touchFocus.power, d);
  
  console.log(
    `${d.toString().padStart(3)}    | ${(high*100).toFixed(0)}%   | ${(medHigh*100).toFixed(0)}%  | ${(med*100).toFixed(0)}%  | ${(low*100).toFixed(0)}%   | ${(powerF*100).toFixed(0)}%    | ${(touchF*100).toFixed(0)}%`
  );
}

// 关键指标验证
console.log('\n\n━━━ 关键指标验证 ━━━\n');

// 短传（5m）
console.log('短传5m:');
console.log(`  高属性(18/17): ${(passQuality(18,17,5)*100).toFixed(0)}%`);
console.log(`  中等(10/10): ${(passQuality(10,10,5)*100).toFixed(0)}%`);
console.log(`  低属性(7/7): ${(passQuality(7,7,5)*100).toFixed(0)}%`);
console.log(`  精度倾向(16/8): ${(passQuality(16,8,5)*100).toFixed(0)}%`);
console.log(`  力量倾向(8/16): ${(passQuality(8,16,5)*100).toFixed(0)}%`);

// 中传（20m）
console.log('\n中传20m:');
console.log(`  高属性(18/17): ${(passQuality(18,17,20)*100).toFixed(0)}%`);
console.log(`  中等(10/10): ${(passQuality(10,10,20)*100).toFixed(0)}%`);
console.log(`  低属性(7/7): ${(passQuality(7,7,20)*100).toFixed(0)}%`);

// 长传（40m）
console.log('\n长传40m:');
console.log(`  高属性(18/17): ${(passQuality(18,17,40)*100).toFixed(0)}%`);
console.log(`  中等(10/10): ${(passQuality(10,10,40)*100).toFixed(0)}%`);
console.log(`  低属性(7/7): ${(passQuality(7,7,40)*100).toFixed(0)}%`);
console.log(`  精度倾向(16/8): ${(passQuality(16,8,40)*100).toFixed(0)}%`);
console.log(`  力量倾向(8/16): ${(passQuality(8,16,40)*100).toFixed(0)}%`);

// 超长传（60m, 75m, 90m）
console.log('\n超长传:');
for (const d of [60, 75, 90]) {
  const high = passQuality(18, 17, d);
  const med = passQuality(10, 10, d);
  const low = passQuality(7, 7, d);
  const powerF = passQuality(8, 16, d);
  const touchF = passQuality(16, 8, d);
  console.log(`  ${d}m: 高=${(high*100).toFixed(0)}% 中=${(med*100).toFixed(0)}% 低=${(low*100).toFixed(0)}% 力量倾向=${(powerF*100).toFixed(0)}% 精度倾向=${(touchF*100).toFixed(0)}%`);
}

// 力量倾向 vs 精度倾向
console.log('\n力量倾向 vs 精度倾向（长距离）:');
for (const d of [40, 60, 75, 90]) {
  const pw = passQuality(8, 16, d);
  const tc = passQuality(16, 8, d);
  console.log(`  ${d}m: 力量倾向=${(pw*100).toFixed(0)}% 精度倾向=${(tc*100).toFixed(0)}% ${pw > tc ? '力量倾向更好' : '精度倾向更好'}`);
}

// 衰减验证
console.log('\n衰减验证（中等属性）:');
let prev = passQuality(10, 10, 1);
for (const d of [5, 10, 20, 40, 60, 75, 90]) {
  const curr = passQuality(10, 10, d);
  const drop = prev - curr;
  console.log(`  ${d}m: ${(curr*100).toFixed(0)}% (衰减${(drop*100).toFixed(1)}%)`);
  prev = curr;
}

console.log('\n=== 测试完成 ===');