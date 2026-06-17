// 测试坐标映射
function realCoordToSVG(x, y, side) {
  const W = 60, H = 95;
  const xPct = (x + 52.5) / 105 * 100;
  const yPct = (y + 34) / 68 * 100;
  return [
    (xPct / 100) * W,
    H - (yPct / 100) * H
  ];
}

// 测试数据
const testCases = [
  { x: -52.5, y: 0, desc: '主队球门' },
  { x: 0, y: 0, desc: '中场' },
  { x: 52.5, y: 0, desc: '客队球门' },
  { x: -23.1, y: 29.8, desc: '事件1持球者' },
  { x: 27.6, y: 0, desc: '前锋默认位置' }
];

console.log('=== 坐标映射测试 ===\n');
console.log('SVG viewBox: 0 0 60 95');
console.log('');

for (const tc of testCases) {
  const [svgX, svgY] = realCoordToSVG(tc.x, tc.y, 'home');
  console.log(`${tc.desc}:`);
  console.log(`  后端: x=${tc.x.toFixed(1)}, y=${tc.y.toFixed(1)}`);
  console.log(`  SVG:  x=${svgX.toFixed(1)}, y=${svgY.toFixed(1)}`);
  console.log('');
}

// 验证事件1的映射
console.log('=== 事件1验证 ===');
const carrierX = -23.1, carrierY = 29.8;
const [ballSvgX, ballSvgY] = realCoordToSVG(carrierX, carrierY, 'home');
const [playerSvgX, playerSvgY] = realCoordToSVG(carrierX, carrierY, 'home');
console.log(`球 SVG:   (${ballSvgX.toFixed(1)}, ${ballSvgY.toFixed(1)})`);
console.log(`球员 SVG: (${playerSvgX.toFixed(1)}, ${playerSvgY.toFixed(1)})`);
console.log(`差值: (${Math.abs(ballSvgX - playerSvgX).toFixed(2)}, ${Math.abs(ballSvgY - playerSvgY).toFixed(2)})`);
