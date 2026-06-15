// ============================================================
// 传球模块 S01 — 物理逻辑推导 + 意图预判（第二轮修改）
// ============================================================
// 现实依据：
//   - 持球前就开始扫描周围环境（眼动追踪研究）
//   - 犹豫不决是常见错误（训练教案）
//   - 识别防守漏洞（战术理解）
//   - 预判队友跑位（配合默契）
//   - 预判防守者拦截意图（对手阅读）
//
// 核心结构：
//   1. 意图判断层：扫描环境 → 识别漏洞 → 预判跑位/拦截
//   2. 决策层：选择传球时机和路线
//   3. 物理执行层：触球精度 × 力量 × 距离衰减
//
// 使用的属性（组合方式）：
//   - 足球理解：比赛阅读、识别防守漏洞、扫描能力
//   - 队友识别：预判队友跑位
//   - 对手识别：预判防守者拦截意图
//   - 决断速度：决策时机（犹豫惩罚）
//   - 集中力：视野疲劳、精神专注
//   - 触球精度：传球技术执行
//   - 力量输出：长传能力
// ============================================================

// ── 传球参数（连续插值端点）──
// riskLevel: 0(safe 4m) ~ 1(long 45m)
// 不再使用离散类型，参数从连续 riskLevel 插值
const PASS_PARAMS = {
  riskMult:     { min: 0.7, max: 1.8 },   // 失败时的惩罚系数
  distDecayMult:{ min: 0.4, max: 1.3 },   // 距离衰减系数
  pressureMult: { min: 0.3, max: 1.0 },   // 压力敏感系数
};

function interpolateParams(riskLevel) {
  const r = Math.max(0, Math.min(1, riskLevel));
  const out = {};
  for (const [k, v] of Object.entries(PASS_PARAMS)) {
    out[k] = v.min + r * (v.max - v.min);
  }
  return out;
}

// 用连续 riskLevel 推导传球物理距离(米)和侧偏(米)
function passDistance(riskLevel, power, zoneV) {
  const r = Math.max(0, Math.min(1, riskLevel));
  const pFactor = Math.max(0.3, power / 15);
  // safe(r=0)→4-10m, normal(r=0.4)→10-20m, risky(r=0.7)→18-32m, long(r=1)→30-55m
  const minD = 3 + r * 12;
  const maxD = 8 + r * 42;
  return (minD + Math.random() * (maxD - minD)) * pFactor;
}

// ── 意图判断层：环境扫描 ──
// 现实：持球前就开始扫描，不是只看球
function scanEnvironment(passerAttrs, context) {
  const footballUnderstanding = passerAttrs.足球理解 || passerAttrs.footballUnderstanding || 10;
  const concentration = passerAttrs.集中力 || passerAttrs.concentration || 10;
  
  // 扫描质量（基于足球理解）
  // 比赛阅读能力强 = 扫描更全面、信息提取更准确
  const scanQuality = 0.4 + (footballUnderstanding / 20) * 0.5;  // 0.4 - 0.9
  
  // 视野疲劳（基于集中力）
  // 集中力低 = 视野疲劳 = 扫描质量下降
  const fatigue = context.fatigue || 0;
  const concentrationMod = Math.max(0.6, concentration / 20 - fatigue * 0.003);
  
  // 综合扫描效果
  const effectiveScan = scanQuality * concentrationMod;
  
  return {
    scanQuality,
    concentrationMod,
    effectiveScan  // 0.24 - 0.9
  };
}

// ── 意图判断层：识别防守漏洞 ──
function identifyDefensiveGap(passerAttrs, context, scan) {
  const footballUnderstanding = passerAttrs.足球理解 || passerAttrs.footballUnderstanding || 10;
  const opponentRecognition = passerAttrs.对手识别 || passerAttrs.opponentRecognition || 10;
  
  // 防守漏洞识别（基于扫描质量 + 足球理解）
  const gapRecognition = scan.effectiveScan * (0.5 + footballUnderstanding / 40);  // 0.12 - 0.675
  
  // 防守者意图预判（基于对手识别）
  // 预判防守者移动方向，找到传球窗口
  const defenderAnticipation = opponentRecognition / 20;  // 0.5 - 1.0
  
  // 传球窗口质量
  const windowQuality = gapRecognition * 0.6 + defenderAnticipation * 0.4;
  
  return {
    gapRecognition,
    defenderAnticipation,
    windowQuality  // 0.31 - 0.84
  };
}

// ── 意图判断层：预判队友跑位 ──
function anticipateTeammateRun(passerAttrs, context) {
  const teammateRecognition = passerAttrs.队友识别 || passerAttrs.teammateRecognition || 10;
  const footballUnderstanding = passerAttrs.足球理解 || passerAttrs.footballUnderstanding || 10;
  
  // 跑位预判（基于队友识别）
  const runAnticipation = teammateRecognition / 20;  // 0.5 - 1.0
  
  // 配合默契度影响预判准确性
  const chemistry = context.chemistry || 0.5;  // 0-1，与特定队友的默契
  const effectiveAnticipation = runAnticipation * 0.7 + chemistry * 0.3;
  
  // 传球时机选择（基于足球理解）
  // 早传 vs 晚传
  const timing = footballUnderstanding > 14 ? 'early' : 'normal';
  
  return {
    runAnticipation,
    effectiveAnticipation,
    timing
  };
}

// ── 决策层：选择传球时机 ──
function choosePassTiming(passerAttrs, context, scan) {
  const decisionSpeed = passerAttrs.决断速度 || passerAttrs.decisionSpeed || 10;
  const concentration = passerAttrs.集中力 || passerAttrs.concentration || 10;
  
  // 决策速度影响时机
  // 决断快 = 快速决策 = 不犹豫
  const decisionTime = Math.max(0.2, 1.0 - (decisionSpeed - 10) * 0.04);  // 0.68 - 1.0秒
  
  // 犹豫惩罚（决断低 + 压力高）
  const pressure = context.pressure || 0;
  const hesitation = pressure > 0.6 && decisionSpeed < 12 ? 0.15 : 0;
  
  // 集中力影响决策质量
  const concentrationMod = Math.max(0.7, concentration / 20);
  
  return {
    decisionTime,
    hesitation,
    concentrationMod,
    timingQuality: Math.max(0.5, 1 - hesitation) * concentrationMod
  };
}

// ── 物理执行层：传球质量 ──
// 触球精度是第一决定因素：脚法好坏直接决定传球能不能到位
// 近距离短传和远距离长传都依赖脚法精度
function passQuality(passerAttrs, riskLevel, context, intent) {
  const params = interpolateParams(riskLevel);
  const touch = passerAttrs.触球精度 || passerAttrs.touch || 10;
  const power = passerAttrs.力量输出 || passerAttrs.power || 10;
  const d = context.distance || 5;
  
  // 1. 触球精度主导基础质量
  const touchBase = 0.30 + touch * 0.035;
  
  // 2. 力量门槛
  const powerThreshold = d * 0.30;
  let powerFactor = power >= powerThreshold ? 1 : Math.max(0.4, power / Math.max(1, powerThreshold));
  
  // 3. 距离衰减
  const distFactor = Math.max(0.35, 1 - d * 0.006 * params.distDecayMult);
  
  // 4. 压力衰减
  const pressure = context.pressure || 0;
  const pressureDecay = Math.max(0.5, 1 - pressure * params.pressureMult * 0.5);
  
  // 5. 疲劳衰减
  const fatigueFactor = Math.max(0.75, 1 - (context.fatigue || 0) * 0.003);
  
  // 6. 意图判断层修正
  const visionBonus = intent.scan.effectiveScan * 0.05;
  const gapBonus = intent.gap.windowQuality * 0.05;
  const runBonus = intent.run.effectiveAnticipation * 0.03;
  const timingBonus = intent.timing.timingQuality * 0.05;
  const intentMod = 1 + visionBonus + gapBonus + runBonus + timingBonus;
  
  return Math.min(0.99, Math.max(0.05,
    touchBase * powerFactor * distFactor * pressureDecay * fatigueFactor * intentMod
  ));
}

// ── 抢断概率 ──
function interceptProbability(riskLevel, passerAttrs, defenderAttrs, context, intent) {
  const params = interpolateParams(riskLevel);
  const d = context.distance || 5;
  const pressure = context.pressure || 0;
  
  const distRisk = Math.min(1, d / 40);
  
  const defMarking = defenderAttrs ? (defenderAttrs.防守技术 || defenderAttrs.marking || 10) : 10;
  const defBurst = defenderAttrs ? (defenderAttrs.爆发 || defenderAttrs.burst || 10) : 10;
  const defPositioning = defenderAttrs ? (defenderAttrs.足球理解 || defenderAttrs.positioning || 10) : 10;
  
  const defScore = defMarking * 0.4 + defBurst * 0.3 + defPositioning * 0.3;
  
  const vision = intent.scan.effectiveScan;
  const visionFactor = 1 - vision * 0.2;
  
  const gapFactor = 1 - intent.gap.windowQuality * 0.15;
  
  const baseRisk = defScore / (defScore + 12);
  const interceptProb = baseRisk * distRisk * pressure * params.riskMult * visionFactor * gapFactor;
  
  return Math.min(0.60, Math.max(0.01, interceptProb));
}

// ── 完整传球结果 ──
function pass(passerAttrs, riskLevel, context, defenderAttrs) {
  const params = interpolateParams(riskLevel);
  
  // 意图判断层
  const scan = scanEnvironment(passerAttrs, context);
  const gap = identifyDefensiveGap(passerAttrs, context, scan);
  const run = anticipateTeammateRun(passerAttrs, context);
  const timing = choosePassTiming(passerAttrs, context, scan);
  
  const intent = { scan, gap, run, timing };
  
  // 物理执行层
  const quality = passQuality(passerAttrs, riskLevel, context, intent);
  const interceptProb = defenderAttrs
    ? interceptProbability(riskLevel, passerAttrs, defenderAttrs, context, intent)
    : 0;
  const successProb = quality * (1 - interceptProb);
  
  return {
    quality,
    interceptProb,
    successProb,
    intent,
    breakdown: {
      scanQuality: scan.effectiveScan,
      windowQuality: gap.windowQuality,
      runAnticipation: run.effectiveAnticipation,
      timingQuality: timing.timingQuality
    }
  };
}

module.exports = {
  pass,
  passDistance,
  passQuality,
  interceptProbability,
  interpolateParams,
  scanEnvironment,
  identifyDefensiveGap,
  anticipateTeammateRun,
  choosePassTiming
};
