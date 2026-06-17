// API 测试 - 检查后端数据
const http = require('http');

const postData = JSON.stringify({
  home: { players: [], formation: '4-3-3' },
  away: { players: [], formation: '4-3-3' }
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/match/simulate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('=== API 测试结果 ===\n');
    console.log(`事件总数: ${result.events.length}`);
    console.log(`主队: ${result.home}`);
    console.log(`客队: ${result.away}`);
    console.log(`比分: ${result.score}\n`);
    
    console.log('=== 前5个事件 ===\n');
    result.events.slice(0, 5).forEach((ev, i) => {
      console.log(`事件 ${i + 1} (${ev.time}'): ${ev.desc}`);
      console.log(`  类型: ${ev.type}`);
      console.log(`  持球者: ${ev.carrier_pid}`);
      console.log(`  球位置: x=${ev.carrier_x?.toFixed(2)}, y=${ev.carrier_y?.toFixed(2)}`);
      
      if (ev.positions && ev.carrier_pid) {
        const carrierKey = Object.keys(ev.positions).find(k => k.includes(ev.carrier_pid));
        if (carrierKey) {
          const pos = ev.positions[carrierKey];
          console.log(`  球员位置: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}`);
          const dx = Math.abs(ev.carrier_x - pos.x);
          const dy = Math.abs(ev.carrier_y - pos.y);
          const dist = Math.sqrt(dx*dx + dy*dy);
          console.log(`  距离差: ${dist.toFixed(2)}米 ${dist < 1 ? '✅' : '❌'}`);
        }
      }
      console.log('');
    });
    
    // 统计所有事件的匹配率
    let matchCount = 0;
    let mismatchCount = 0;
    result.events.forEach(ev => {
      if (ev.positions && ev.carrier_pid && ev.carrier_x !== undefined) {
        const carrierKey = Object.keys(ev.positions).find(k => k.includes(ev.carrier_pid));
        if (carrierKey) {
          const pos = ev.positions[carrierKey];
          const dx = Math.abs(ev.carrier_x - pos.x);
          const dy = Math.abs(ev.carrier_y - pos.y);
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 1) matchCount++;
          else mismatchCount++;
        }
      }
    });
    
    console.log('=== 统计 ===');
    console.log(`匹配: ${matchCount}`);
    console.log(`不匹配: ${mismatchCount}`);
    console.log(`匹配率: ${(matchCount / (matchCount + mismatchCount) * 100).toFixed(1)}%`);
  });
});

req.on('error', (e) => console.error(`请求错误: ${e.message}`));
req.write(postData);
req.end();
