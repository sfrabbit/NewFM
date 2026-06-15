// ============================================================
// 门将扑救模块 S06 — 物理逻辑推导 + 意图预判（第二轮修改）
// ============================================================
// 现实依据：
//   - 专家门将67%时间注视射门者非踢球腿（眼动追踪研究）
//   - 预判成功时扑救率大幅提升，预判错误时大幅下降
//   - 点球是博弈论问题：门将预判方向 vs 射门者选择方向
//
// 核心结构：
//   1. 意图判断层：读取射门者线索 → 预判射门方向
//   2. 物理执行层：反应时间 + 移动时间 + 覆盖概率
//   3. 结果合成：预判正确性 × 物理执行成功率
//
// 使用的属性（组合方式）：
//   - 对手识别：读取射门者线索（非踢球腿、重心、眼神）
//   - 足球理解：站位选择、角度判断
//   - 瞬间反应：纯反应速度（GK专属）
//   - 爆发：侧扑速度
//   - 空中能力：高空球处理
//   - 决断速度：预判时机选择
// ============================================================

// 物理常数（基于真实数据）
const REACTION_BASE = 0.25;      // 基础反应时间（秒）
const REACTION_ELITE = 0.18;     // 精英反应时间（秒）
const BALL_SPEED_BASE = 25;      // 基础球速（m/s）= 90 km/h
const BALL_SPEED_MAX = 30;       // 最大球速（m/s）= 108 km/h
const GK_DIVE_SPEED = 4.5;       // 侧扑速度（m/s）
const BODY_COVERAGE_WIDTH = 2.2; // 展开后身体覆盖宽度（米）

// 扑救方向
const DIRECTIONS = {
  left: '左',
  center: '中', 
  right: '右'
};

// ── 意图判断层：读取射门者线索 ──
// 现实：专家门将观察非踢球腿、重心、眼神预判方向
function readShooterClues(gkAttrs, shotContext) {
  const opponentRecognition = gkAttrs.对手识别 || gkAttrs.opponentRecognition || 10;
  const footballUnderstanding = gkAttrs.足球理解 || gkAttrs.footballUnderstanding || 10;
  
  // 线索读取成功率（基于对手识别）
  // 现实：专家门将67%时间看非踢球腿，说明线索读取是核心能力
  const clueReading = opponentRecognition / 20;  // 0.5 - 1.0
  
  // 线索可信度（基于足球理解判断哪些线索可靠）
  const clueReliability = 0.4 + (footballUnderstanding / 20) * 0.4;  // 0.6 - 0.8
  
  // 综合线索质量
  const clueQuality = clueReading * clueReliability;
  
  return {
    clueQuality,  // 0.25 - 0.8
    clueReading,
    clueReliability
  };
}

// ── 意图判断层：预判射门方向 ──
// 返回门将预判的方向和信心度
function anticipateDirection(gkAttrs, shotContext, actualDirection) {
  const { clueQuality } = readShooterClues(gkAttrs, shotContext);
  
  // 预判成功率（基于线索质量）
  // 线索质量高 → 预判成功率高
  const baseAnticipation = 0.3;  // 基础预判率30%（随机猜测）
  const maxAnticipation = 0.7;   // 最高预判率70%（不可能100%）
  const anticipationRate = baseAnticipation + clueQuality * (maxAnticipation - baseAnticipation);
  
  // 是否预判正确
  const isCorrect = Math.random() < anticipationRate;
  
  // 门将选择的方向
  let guessedDirection;
  if (isCorrect) {
    guessedDirection = actualDirection;
  } else {
    // 预判错误：随机选择其他方向
    const wrongDirections = Object.keys(DIRECTIONS).filter(d => d !== actualDirection);
    guessedDirection = wrongDirections[Math.floor(Math.random() * wrongDirections.length)];
  }
  
  return {
    guessedDirection,
    isCorrect,
    anticipationRate,
    confidence: clueQuality  // 信心度基于线索质量
  };
}

// ── 物理执行层：反应时间 ──
function reactionTime(gkAttrs, context) {
  // GK使用"瞬间反应"属性（替换力量输出）
  const reflexes = gkAttrs.瞬间反应 || gkAttrs.reflexes || 10;
  const decisionSpeed = gkAttrs.决断速度 || gkAttrs.decisionSpeed || 10;
  
  // 基础反应时间
  const baseTime = REACTION_BASE - (reflexes - 10) * 0.00875;
  
  // 决断速度影响预判启动时间
  const decisionMod = Math.max(0.7, 1 - (decisionSpeed - 10) * 0.025);
  
  // 近距离惩罚
  const closePenalty = context.isFromClose ? 1.3 : 1.0;
  
  return Math.max(REACTION_ELITE, baseTime * decisionMod * closePenalty);
}

// ── 物理执行层：移动时间 ──
function moveTime(gkAttrs, context, directionGap) {
  const burst = gkAttrs.爆发 || gkAttrs.burst || 10;
  const fatigue = context.fatigue || 0;
  const fatigueMod = Math.max(0.7, 1 - fatigue * 0.003);
  
  // 需要覆盖的距离（基于方向差距）
  const distanceToCover = Math.abs(directionGap) * 1.5;  // 每单位方向差距约1.5米
  
  // 有效速度
  const effectiveSpeed = GK_DIVE_SPEED * (burst / 12) * fatigueMod;
  
  return distanceToCover / effectiveSpeed;
}

// ── 物理执行层：球飞行时间 ──
function ballFlightTime(context) {
  const distance = context.shotDistance || 12;
  const power = context.shotPower || 0.5;
  const ballSpeed = BALL_SPEED_BASE + power * (BALL_SPEED_MAX - BALL_SPEED_BASE);
  return distance / ballSpeed;
}

// ── 物理执行层：覆盖概率 ──
function coverProbability(gkAttrs, context, directionGap) {
  const height = context.shotHeight || 0.5;
  const jumping = gkAttrs.空中能力 || gkAttrs.jumping || 10;
  
  // 方向差距影响覆盖概率
  // directionGap = 0: 完全覆盖
  // directionGap = 1: 部分覆盖
  // directionGap >= 2: 很难覆盖
  let coverProb;
  if (Math.abs(directionGap) <= 0.5) {
    coverProb = 0.95;
  } else if (Math.abs(directionGap) <= 1.0) {
    coverProb = 0.75;
  } else if (Math.abs(directionGap) <= 1.5) {
    coverProb = 0.50;
  } else {
    coverProb = 0.25;
  }
  
  // 高空球需要空中能力
  if (height > 0.6) {
    coverProb *= Math.min(1.1, jumping / 12);
  }
  
  return Math.min(0.95, Math.max(0.10, coverProb));
}

// ── 物理扑救率（方向已知） ──
function physicalSaveProb(gkAttrs, context, directionGap) {
  const reactTime = reactionTime(gkAttrs, context);
  const moveT = moveTime(gkAttrs, context, directionGap);
  const flightT = ballFlightTime(context);
  
  const totalPrep = reactTime + moveT;
  const timeRatio = flightT / totalPrep;
  
  // 时间足够概率
  let timeProb;
  if (timeRatio >= 2.0) {
    timeProb = 0.95;
  } else if (timeRatio >= 1.0) {
    timeProb = 0.70 + (timeRatio - 1.0) * 0.25;
  } else if (timeRatio >= 0.5) {
    timeProb = 0.40 + (timeRatio - 0.5) * 0.60;
  } else {
    timeProb = 0.15 + timeRatio * 0.50;
  }
  
  const coverProb = coverProbability(gkAttrs, context, directionGap);
  
  return Math.min(0.95, Math.max(0.05, timeProb * coverProb));
}

// ── 综合扑救成功率 ──
function saveSuccessProb(gkAttrs, context) {
  // 点球特殊处理
  if (context.isPenalty) {
    return penaltySaveProb(gkAttrs, context);
  }
  
  // 射门实际方向（由射门模块提供）
  const actualDirection = context.shotDirection || 'center';
  
  // 意图判断：预判方向
  const anticipation = anticipateDirection(gkAttrs, context, actualDirection);
  
  // 计算方向差距（预判方向 vs 实际方向）
  const directionMap = { left: -1, center: 0, right: 1 };
  const guessedIdx = directionMap[anticipation.guessedDirection];
  const actualIdx = directionMap[actualDirection];
  const directionGap = actualIdx - guessedIdx;  // 0 = 正确，±1 = 相邻，±2 = 相反
  
  // 物理扑救率（基于方向差距）
  const physicalProb = physicalSaveProb(gkAttrs, context, directionGap);
  
  // 预判正确性修正
  // 预判正确：物理扑救率 × 1.0（正常发挥）
  // 预判错误：物理扑救率 × 0.5（很难扑救）
  const anticipationMod = anticipation.isCorrect ? 1.0 : 0.5;
  
  return {
    saveProb: Math.min(0.95, Math.max(0.05, physicalProb * anticipationMod)),
    anticipation,  // 预判详情
    physicalProb,
    directionGap
  };
}

// ── 点球扑救 ──
function penaltySaveProb(gkAttrs, context) {
  const opponentRecognition = gkAttrs.对手识别 || gkAttrs.opponentRecognition || 10;
  const footballUnderstanding = gkAttrs.足球理解 || gkAttrs.footballUnderstanding || 10;
  const reflexes = gkAttrs.瞬间反应 || gkAttrs.reflexes || 10;
  
  // 点球时门将有更多时间观察，预判率更高
  const baseAnticipation = 0.35;
  const clueQuality = (opponentRecognition / 20) * (footballUnderstanding / 20);
  const anticipationRate = Math.min(0.75, baseAnticipation + clueQuality * 0.5);
  
  // 预判正确时的扑救率
  const saveWhenCorrect = 0.65 + (reflexes - 10) * 0.025;
  
  // 预判错误时的扑救率（靠运气/身体本能）
  const saveWhenWrong = 0.08;
  
  const saveProb = anticipationRate * saveWhenCorrect + (1 - anticipationRate) * saveWhenWrong;
  
  return {
    saveProb: Math.min(0.30, Math.max(0.15, saveProb)),
    anticipationRate,
    saveWhenCorrect,
    saveWhenWrong,
    isPenalty: true
  };
}

// ── 扑救方式选择 ──
function chooseSaveType(gkAttrs, context) {
  const power = context.shotPower || 0.5;
  const height = context.shotHeight || 0.5;
  
  // 基于物理条件选择
  if (height > 0.7 && power < 0.7) return 'tipOver';
  if (power > 0.8) return 'parry';
  return 'catch';
}

// ── 统一接口 ──
function save(gkAttrs, shotContext) {
  const result = saveSuccessProb(gkAttrs, shotContext);
  const saveType = chooseSaveType(gkAttrs, shotContext);
  
  // 如果是点球，result已经是对象
  if (result.isPenalty) {
    return {
      ...result,
      saveType,
      breakdown: {
        anticipationRate: result.anticipationRate,
        saveWhenCorrect: result.saveWhenCorrect,
        saveWhenWrong: result.saveWhenWrong
      }
    };
  }
  
  return {
    saveProb: result.saveProb,
    saveType,
    anticipation: result.anticipation,
    physicalProb: result.physicalProb,
    directionGap: result.directionGap,
    breakdown: {
      clueQuality: readShooterClues(gkAttrs, shotContext).clueQuality,
      reactionTime: reactionTime(gkAttrs, shotContext),
      moveTime: moveTime(gkAttrs, shotContext, result.directionGap),
      flightTime: ballFlightTime(shotContext),
      coverProb: coverProbability(gkAttrs, shotContext, result.directionGap)
    }
  };
}

module.exports = {
  save,
  saveSuccessProb,
  penaltySaveProb,
  chooseSaveType,
  readShooterClues,
  anticipateDirection,
  // 物理层导出
  reactionTime,
  moveTime,
  ballFlightTime,
  coverProbability,
  physicalSaveProb,
  DIRECTIONS
};
