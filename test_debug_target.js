// 调试目标位置计算
const { calculateTargetPositionEx } = require("./engine/movement");

// 模拟一个CM球员
const player = {
  role: 'CM_C',
  x: -9.2,
  y: 0,
  defaultX: -9.2,
  defaultY: 0,
  attrs: { '速度': 12, '爆发': 12, '耐力': 12, '足球理解': 12 },
  fatigue: 0,
  team: 'home',
  teamRole: 'attacking'
};

const context = {
  ballPosition: { x: 20, y: 0 },  // 球在前场
  tacticalStyle: 'medium_block',
  pitchLength: 105,
  pitchWidth: 68
};

console.log('=== 测试目标位置计算 ===');
console.log(`球员: ${player.role}`);
console.log(`当前位置: x=${player.x}, y=${player.y}`);
console.log(`球位置: x=${context.ballPosition.x}, y=${context.ballPosition.y}`);

const target = calculateTargetPositionEx(player, context);
console.log(`\n目标位置: x=${target.x.toFixed(1)}, y=${target.y.toFixed(1)}`);

const dx = target.x - player.x;
const dy = target.y - player.y;
const dist = Math.sqrt(dx*dx + dy*dy);
console.log(`距离: ${dist.toFixed(1)}m`);

// 计算速度
const speed = 5.0 + (12 - 10) * 0.6;  // pace=12
console.log(`速度: ${speed.toFixed(1)} m/s`);

// 计算移动时间（假设stepDT=50秒）
const stepDT = 50;
const maxMove = speed * stepDT;
console.log(`最大移动距离 (${stepDT}秒): ${maxMove.toFixed(0)}m`);
