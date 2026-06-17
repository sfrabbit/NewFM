// 测试 key 格式
const positions = {
  'home_home_P0': { x: -51.5, y: 0, role: 'GK' },
  'home_home_P4': { x: -23.1, y: 29.8, role: 'FB_R' },
};

console.log('=== Key 格式测试 ===\n');

for (const key of Object.keys(positions)) {
  const usIdx = key.indexOf('_');
  const side = key.substring(0, usIdx);
  const pid = key.substring(usIdx + 1);
  
  console.log(`Key: ${key}`);
  console.log(`  side: ${side}`);
  console.log(`  pid: ${pid}`);
  console.log(`  selector: mp-p-${side}-${pid}`);
  console.log('');
}

// 检查 renderMatchPlayers 创建的 ID
const pid = 'home_P4';
const side = 'home';
const id = `mp-p-${side}-${pid}`;
console.log(`renderMatchPlayers 创建的 ID: ${id}`);

// 检查是否匹配
const key = 'home_home_P4';
const usIdx = key.indexOf('_');
const parsedSide = key.substring(0, usIdx);
const parsedPid = key.substring(usIdx + 1);
const selector = `mp-p-${parsedSide}-${parsedPid}`;
console.log(`renderAllPositions 查找的 selector: ${selector}`);
console.log(`匹配: ${id === selector}`);
