// ============================================================
// 对抗模块 S04 — 物理逻辑推导，非数据拟合
// ============================================================
// 每个对抗类型的公式从物理过程直接推导，不依赖统计数据调参。
// 数据只用于事后验证趋势和量级，不参与公式构造。
//
// 对抗的本质：两个身体在空间中争夺同一物理目标
//
// 四个对抗类型对应的物理模型：
//
// 1. 铲球 (Tackle)：防守方脚速 vs 持球方移球速度
//    防守方脚速 = 铲球准确度 + 爆发逼近 + 时机判断
//    持球方移球速度 = 控球细腻度 + 身体稳定性 + 抗压冷静
//    物理类比：两条曲线拟合到同一点的时间差
//    → winProb = 脚速 / (脚速 + 移球速度)
//    物理事实：防守方有先手选择权 → 同等属性防守方有微弱优势
//
// 2. 拦截 (Interception)：防守方从站位点移动到传球路径上的可行度
//    不涉及持球者对抗。纯取决于：站位距离 + 预判提前量 + 加速移动
//    物理类比：截获一个已知轨迹的移动目标
//    → 成功率取决于 context.距离与属性如何匹配
//
// 3. 卡位 (Shoulder)：两个身体同时向同一点施力
//    物理类比：双质点碰撞模型。各自的有效力 = 肌力 + 稳定性
//    → winProb = 攻击方有效力 / (攻击方有效力 + 防守方有效力)
//    这是真正的 50/50 对抗，无先手优势
//
// 4. 空中争顶 (Aerial)：垂直跳跃 + 空中身体稳定
//    物理类比：两个质点垂直上升竞赛 + 空中碰撞稳定性
//    → 跳跃决定"谁先碰到球"（高度竞赛）
//    → 力量决定"在空中不被打歪"（稳定性竞赛）
//    → 头球技术决定"碰到后的方向"（后处理）
//
// context 物理量：
//   speedDiff  — 防守者速度 - 持球者速度，m/s 粒度，反映相对接近速度
//   fatigue    — 肌肉疲劳度，直接按比例衰减爆发力和力量
//   distance   — 防守者初始位置到球/拦截点的距离（米）
// ============================================================

const DUEL_TYPES = {
  // ── 1. 铲球：脚速竞赛 ──
  tackle: {
    name: "地面铲球",
    // 物理理由：
    //   脚速的三个分量：
    //     tackling (40%)：出脚的准确性——碰到球而不是腿
    //     burst (35%)：逼近阶段的加速度——能不能先到球边
    //     aggression (25%)：判断出脚的时机——早一分铲空，晚一分被过
    //   移球速度的两个分量：
    //     control (55%)：球离身体的距离——越近越难铲
    //     balance (45%)：身体被碰到后是否倾倒——稳的更难被铲翻
    attackerAttrs: { tackling: 0.40, burst: 0.35, aggression: 0.25 },
    targetAttrs: { control: 0.55, balance: 0.45 },
    initiative: 0.93,    // 防守方先手系数（同等属性下防守方略优）
    speedWeight: 0.12,   // 每1单位速度差提升12%（速度快1m/s ≈ 12%优势）
    fatigueScale: 1.0,   // 疲劳对铲球的影响倍数（基础）
  },

  // ── 2. 拦截：截获移动目标 ──
  interception: {
    name: "拦截传球",
    // 物理理由：
    //   拦截成功的三个条件：
    //     positioning (45%)：站位离拦截线多远——物理距离是首要因素
    //     anticipation (35%)：提前预判传球路线——越早启动越容易到位
    //     burst (20%)：加速到拦截点的能力
    //   无对手属性——拦截不与特定球员对抗
    attackerAttrs: { positioning: 0.45, anticipation: 0.35, burst: 0.20 },
    targetAttrs: {},
    initiative: 1.0,
    // 拦截公式特殊：不对比对手，而是判定"能力是否能克服距离"
    // interceptScore / (interceptScore + distancePenalty)
    speedWeight: 0.06,
    fatigueScale: 0.8,  // 拦截对疲劳相对不敏感（预判为主）
  },

  // ── 3. 卡位：双质点碰撞 ──
  shoulder: {
    name: "身体卡位",
    // 物理理由：
    //   有效力 = 施加力 + 抵抗倾覆力矩
    //     strength (55%)：水平方向施加的力，决定谁能推动对方
    //     balance (45%)：垂直稳定性——受力后不倒的能力
    //   这是真正的50/50：谁的力量/稳定性更强谁赢
    //   无先手优势——双方同时发力
    attackerAttrs: { strength: 0.55, balance: 0.45 },
    targetAttrs: { strength: 0.55, balance: 0.45 },
    initiative: 1.0,     // 无先手优势（真正的50/50）
    speedWeight: 0.04,  // 速度差影响小（已贴身对抗）
    fatigueScale: 1.3,  // 疲劳对力量影响大
  },

  // ── 4. 空中争顶：垂直竞赛 + 空中稳定 ──
  aerial: {
    name: "空中争顶",
    // 物理理由：
    //   两阶段竞赛：
    //     阶段1：垂直高度竞赛（谁先碰到球）
    //       jumping (50%)：垂直弹跳能力——每点约对应2-3cm
    //       height隐式因子：身高是弹跳的基底，不单独建模
    //     阶段2：空中稳定性（碰球后不被挤开）
    //       strength (30%)：上肢力量——在空中抵抗挤压
    //       heading (20%)：头球技术——触球后的方向精度
    //   两阶段合成：谁的综合空中能力更强
    attackerAttrs: { jumping: 0.50, strength: 0.30, heading: 0.20 },
    targetAttrs: { jumping: 0.50, strength: 0.30, heading: 0.20 },
    initiative: 1.0,     // 空中竞赛无先手（同时起跳）
    speedWeight: 0.02,  // 速度几乎不影响空中对抗
    fatigueScale: 1.1,  // 疲劳对弹跳有中等影响
  },
};

// ── 加权得分工具 ──
function attrScore(attrs, weights) {
  let s = 0;
  for (const [k, w] of Object.entries(weights)) {
    s += (attrs[k] || 10) * w;
  }
  return s;
}

// ── 对抗成功率 ──
// attacker: 发起对抗方（如铲球者），target: 对抗目标方（如持球者）
// 返回 attacker 获胜的概率
function duelWinProb(type, attackerAttrs, targetAttrs, context) {
  const atkScore = attrScore(attackerAttrs, type.attackerAttrs);
  const tgtScore = Object.keys(type.targetAttrs).length > 0
    ? attrScore(targetAttrs, type.targetAttrs)
    : 10;  // 拦截没有对手对抗，用固定阻力值

  // 速度差修正：速度快的一方更接近目标
  //   speedDiff > 0 → attacker更快 → 有利
  const speedDiff = context.speedDiff || 0;
  const speedMod = speedDiff >= 0
    ? 1 + speedDiff * type.speedWeight
    : 1 / (1 - speedDiff * type.speedWeight);

  // 疲劳修正：疲劳按比例衰减爆发力和力量
  const fatigue = context.fatigue || 0;
  const fatigueMod = Math.max(0.6, 1 - fatigue * 0.004 * type.fatigueScale);

  // 基础胜率（物理竞赛公式）
  //   initiative < 1 → 攻击方有先手优势（铲球）
  //   initiative = 1 → 纯能力对比（卡位/空中）
  const baseWin = atkScore / (atkScore + tgtScore * type.initiative);

  return Math.min(0.93, Math.max(0.04, baseWin * speedMod * fatigueMod));
}

// ── 铲球犯规概率 ──
// 物理理由：犯规 = 铲球动作超过了球的时机窗口
//   侵略性越高 → 更容易冲动出脚 → 高犯规
//   铲球技术越高 → 更精确地不碰人 → 低犯规
//   高速冲刺铲球 → 更难控制身体 → 高犯规
function foulProbability(type, attackerAttrs, context) {
  if (type !== DUEL_TYPES.tackle) return 0.03;

  const aggression = attackerAttrs.aggression || 10;
  const tackling = attackerAttrs.tackling || 10;
  // 犯规率反比于技术/侵略比。技术好 = 不犯规；侵略高 = 容易犯规
  const techniqueRatio = tackling / Math.max(1, aggression);
  const baseFoul = 0.25 / (1 + techniqueRatio);
  const speedPenalty = Math.abs(context.speedDiff || 0) * 0.02;

  return Math.min(0.45, baseFoul + speedPenalty);
}

module.exports = { DUEL_TYPES, duelWinProb, foulProbability };
