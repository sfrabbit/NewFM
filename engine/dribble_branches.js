// 盘带情境分支定义（基于决策，非位置）
// 原则：连续逻辑、无分类、物理现实
// 数据校准：2026年6月，基于五大联赛/国家队/青训现实数据

const DRIBBLE_BRANCHES = {
  // D1: 无压力推进（开阔空间）
  // 触发：周围3米无防守者，有向前空间
  // 决策：速度 vs 控制
  // 现实参考：无压力盘带成功率55-65%（克罗斯62.5%、巴莱巴58%）
  D1: {
    name: "无压力推进",
    trigger: "space > 3m, no pressure",
    spaceSensitivity: 0.08, // 空间敏感度：每少1m降低8%
    branches: [
      { id: "D1A1", name: "爆发冲刺", attrs: { burst: 0.6, speed: 0.4 }, risk: 0.3 },
      { id: "D1A2", name: "控制推进", attrs: { control: 0.6, burst: 0.4 }, risk: 0.25 },
    ]
  },

  // D2: 单对单突破（一个防守者）
  // 触发：1v1情况，有突破空间
  // 决策：速度突破 vs 技巧过人 vs 护球
  // 现实参考：联赛平均约50%，顶级55-63%（贝林厄姆63.8%），弱队38%
  D2: {
    name: "单对单突破",
    trigger: "1v1, space to beat",
    spaceSensitivity: 0.06, // 边线空间影响较小（1v1主要看能力差）
    branches: [
      { id: "D2A1", name: "速度生吃", attrs: { speed: 0.5, burst: 0.5 }, risk: 0.55 },
      { id: "D2A2", name: "技巧过人", attrs: { control: 0.6, burst: 0.4 }, risk: 0.5 },
      { id: "D2A3", name: "护球等待", attrs: { control: 0.5, strength: 0.5 }, risk: 0.15 },
    ]
  },

  // D3: 高压下摆脱（多人压迫）
  // 触发：2+防守者逼近，空间狭小
  // 决策：强行突破 vs 护球等支援 vs 回传
  // 现实参考：护球成功率50-65%（意甲前锋平均52%、哲科72%），围抢出球降至30%
  D3: {
    name: "高压摆脱",
    trigger: "pressure >= 2, tight space",
    spaceSensitivity: 0.03, // 护球/回传几乎不需要空间，空间影响极小
    branches: [
      { id: "D3A1", name: "强行突破", attrs: { control: 0.4, burst: 0.4, luck: 0.2 }, risk: 0.8 },
      { id: "D3A2", name: "护球牵制", attrs: { control: 0.5, strength: 0.5 }, risk: 0.25 },
      { id: "D3A3", name: "回传安全", attrs: { control: 0.6, vision: 0.4 }, risk: 0.05 },
    ]
  },

  // D4: 边线/底线突破（空间受限）
  // 触发：靠近边线/底线，横向空间小
  // 决策：内切 vs 下底 vs 回传
  // 现实参考：顶级边锋60-72%（王钰栋72%、布鲁马65%），普通39-55%
  D4: {
    name: "边线突破",
    trigger: "near touchline/baseline",
    spaceSensitivity: 0.05, // 边线空间有限但突破主要看能力
    branches: [
      { id: "D4A1", name: "内切", attrs: { control: 0.5, burst: 0.5 }, risk: 0.45 },
      { id: "D4A2", name: "强行下底", attrs: { speed: 0.6, control: 0.4 }, risk: 0.55 },
      { id: "D4A3", name: "护球回传", attrs: { control: 0.6, strength: 0.4 }, risk: 0.1 },
    ]
  },

  // D5: 反击推进（大空间高速）
  // 触发：获得球权后，前方大空间，防守者未落位
  // 决策：最快速度推进 vs 控制节奏等支援
  // 现实参考：有核心40-42%，无核心17-28%，核心球员影响差值20%+
  D5: {
    name: "反击推进",
    trigger: "transition, space > 10m",
    spaceSensitivity: 0.02, // 反击本身空间大，空间变化影响小
    branches: [
      { id: "D5A1", name: "全速冲刺", attrs: { speed: 0.7, burst: 0.3 }, risk: 0.5 },
      { id: "D5A2", name: "控制等支援", attrs: { control: 0.5, vision: 0.5 }, risk: 0.15 },
      { id: "D5A3", name: "直传前锋", attrs: { vision: 0.5, power: 0.5 }, risk: 0.45 },
    ]
  },
};

// 成功率公式（连续逻辑）
// 核心改动：
// 1. spaceFactor 改为 1 - sensitivity * max(0, 5 - space)
//    - space >= 5m 时 factor = 1.0（满空间）
//    - space = 0m 时 factor = 1 - sensitivity * 5
//    - 每个分支有自己的 spaceSensitivity，护球/回传对空间不敏感
// 2. pressureFactor 改为线性衰减，不再用乘法放大
// 3. 基础公式保持 playerScore / (playerScore + risk * defenderScore)
function dribbleSuccessRate(branch, playerAttrs, defenderAttrs, context, spaceSensitivity) {
  // 基础得分 = 球员相关属性加权
  let playerScore = 0;
  for (const [attr, weight] of Object.entries(branch.attrs)) {
    playerScore += (playerAttrs[attr] || 10) * weight;
  }
  
  // 防守得分 = 防守者相关属性
  const defenderScore = (defenderAttrs.defense || 10) * 0.4 + 
                        (defenderAttrs.burst || 10) * 0.3 +
                        (defenderAttrs.strength || 10) * 0.3;
  
  // 情境修正（连续变量，非分类）
  // 空间因子：由调用方传入该分支所属情境的空间敏感度
  // space >= 5m → factor = 1.0
  // space = 0m → factor = 1 - sensitivity * 5
  const sensitivity = spaceSensitivity || 0.05;
  const spaceDeficit = Math.max(0, 5 - (context.space || 0));
  const spaceFactor = Math.max(0.3, 1 - sensitivity * spaceDeficit);
  
  // 压力因子：线性衰减，每个压力等级降8%
  // pressureLevel=0 → 1.0, =1 → 0.92, =2 → 0.84, =3 → 0.76
  const pressureFactor = Math.max(0.5, 1 - (context.pressureLevel || 0) * 0.08);
  
  // 疲劳因子：连续衰减
  const fatigueFactor = Math.max(0.7, 1 - (context.fatigue || 0) * 0.005);
  
  // 基础成功率（能力对比）
  const baseSuccess = playerScore / (playerScore + branch.risk * defenderScore);
  
  // 应用修正
  return Math.min(0.95, Math.max(0.05, baseSuccess * spaceFactor * pressureFactor * fatigueFactor));
}

// 测试输出
console.log("=== 盘带情境分支定义 ===\n");
for (const [key, val] of Object.entries(DRIBBLE_BRANCHES)) {
  console.log(`${key}: ${val.name}`);
  console.log(`  触发: ${val.trigger}`);
  console.log(`  分支:`);
  for (const b of val.branches) {
    console.log(`    ${b.id}: ${b.name} (风险系数: ${b.risk})`);
  }
  console.log();
}

module.exports = { DRIBBLE_BRANCHES, dribbleSuccessRate };
