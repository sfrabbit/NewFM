// ============================================================
// 解围模块 S05 — 物理逻辑推导，非数据拟合
// ============================================================
// 物理模型：防守者主动将球清出危险区。不是对抗——没有对手直接争抢。
// 解围 = 压力下的破坏性长传。类似于"把球踢得又高又远"。
//
// 分两步：
//   1. 到位率：防守者能否及时到达球的落点
//      → 取决于 positioning + anticipation + burst
//   2. 解围质量：到达后能否成功将球清出
//      → 取决于各解围方式的技术
//
// 解围方式：
//   aerialHeader — 头球解围（高空球）
//   groundClear   — 地面解围（脚下球或半高球）
//   slidingClear  — 滑铲解围（极限情况下、球速快时）
//
// 解围结果分为：
//   成功 — 球走出危险区且未直接落到对手脚下
//   勉强 — 球被顶/踢走，但仍在半危险区
//   失败 — 球被挡回、踢到对手身上（直接造成门前威胁）
//
// context:
//   pressure    — 对手逼近程度 0-1
//   fatigue     — 疲劳度 0-100
//   ballHeight  — 球的高度 0=地面, 0.5=半高, 1=高空
//
// 现实参考：
//   场均解围15-30次，失败率低（失败=直接射门机会）
//   顶级防守者解围成功率接近90%+（物理上，因为失败即失球）
// ============================================================

const CLEAR_TYPES = {
  // ── 头球解围：跳跃+头球技术 ──
  aerialHeader: {
    name: "头球解围",
    // 物理：垂直跳起，用头顶将球顶远
    //   heading (45%)：头球触球的准确度和力量
    //   jumping (40%)：弹跳高度——决定能否碰到球
    //   strength (15%)：空中对抗中保持稳定的能力
    attrs: { heading: 0.45, jumping: 0.40, strength: 0.15 },
    idealBallHeight: 0.8,   // 最适合高空球
    pressureSens: 0.25,     // 对压力敏感度（头球受贴身干扰大）
  },

  // ── 地面解围：大脚开出 ──
  groundClear: {
    name: "地面解围",
    // 物理：用脚大力将球踢出——类似长传但不需要精准落点
    //   tackling (40%)：准确踢到球而不是踢空
    //   strength (35%)：踢球力量——决定球飞多远
    //   composure (25%)：压力下不慌乱
    attrs: { tackling: 0.40, strength: 0.35, composure: 0.25 },
    idealBallHeight: 0.2,   // 最适合地面/低空球
    pressureSens: 0.35,     // 对压力敏感（脚下球容易被断）
  },

  // ── 滑铲解围：高速滑动中伸脚 ──
  slidingClear: {
    name: "滑铲解围",
    // 物理：身体水平滑动，用脚在极限距离够到球
    //   burst (45%)：滑铲的速度和距离
    //   tackling (35%)：脚碰到球的准确度
    //   aggression (20%)：敢于做滑铲的决断力
    attrs: { burst: 0.45, tackling: 0.35, aggression: 0.20 },
    idealBallHeight: 0.3,   // 适合低空球
    pressureSens: 0.15,     // 对压力不太敏感（本就是极限动作）
  },
};

// ── 加权得分 ──
function attrScore(attrs, weights) {
  let s = 0;
  for (const [k, w] of Object.entries(weights)) {
    s += (attrs[k] || 10) * w;
  }
  return s;
}

// ── 解围成功率 ──
// 返回 { successProb, partialProb, failProb }
function clearSuccess(type, defenderAttrs, context) {
  // 1. 技术水平得分
  const techScore = attrScore(defenderAttrs, type.attrs);

  // 2. 球高匹配（越接近理想高度越好）
  const ballH = context.ballHeight !== undefined ? context.ballHeight : 0.5;
  const heightMatch = 1 - Math.abs(ballH - type.idealBallHeight) * 1.2;
  const heightFactor = Math.max(0.4, heightMatch);

  // 3. 压力衰减
  const pressure = context.pressure || 0;
  const pressureFactor = Math.max(0.5, 1 - pressure * type.pressureSens);

  // 4. 疲劳衰减
  const fatigue = context.fatigue || 0;
  const fatigueFactor = Math.max(0.7, 1 - fatigue * 0.004);

  // 5. 基础成功率（物理推导：技术/基本阻力）
  //    解围没有对手直接争抢（不同于铲球），阻力是固定的物理难度
  const baseClear = techScore / (techScore + 4.0);

  const successProb = Math.min(0.95, baseClear * heightFactor * pressureFactor * fatigueFactor);

  // 失败概率 = 剩下的部分主要转为失败（直接送对手）
  const rawFail = (1 - successProb) * 0.7;
  const failProb = Math.min(0.35, Math.max(0.01, rawFail));

  // 勉强解围（中间态）
  const partialProb = Math.max(0, 1 - successProb - failProb);

  return {
    success: Math.min(0.95, Math.max(0.35, successProb)),
    partial: partialProb,
    fail: failProb,
  };
}

module.exports = { CLEAR_TYPES, clearSuccess };
