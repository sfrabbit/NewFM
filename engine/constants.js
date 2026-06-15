// Constants shared across the engine.
// All Chinese attribute names match the Python source 1:1.

const ATTRS = [
  "触球精度", "控制技巧", "力量输出", "空中能力", "防守技术",
  "足球理解", "队友识别", "对手识别", "集中力", "决断速度",
  "耐力", "爆发", "速度", "对抗", "身高", "体质",
  "瞬间反应", "手感",
  "自私导向", "团队导向", "激进导向", "冷静导向", "坚毅导向",
];

// Player module exposes 21-attribute view; GK swaps two technical/physical attrs.
const ALL_ATTRS = [
  "触球精度", "控制技巧", "力量输出", "空中能力", "防守技术",
  "足球理解", "队友识别", "对手识别", "决断速度", "集中力",
  "耐力", "爆发", "速度", "对抗", "身高", "体质",
  "自信", "纪律性", "情绪稳定性", "团队导向", "职业态度",
];

// For GK: 触球精度↔手感, 力量输出↔瞬间反应 (display labels stay 21 attrs,
// but engine reads 瞬间反应/手感 directly).
const GK_ATTR_MAP = {
  "触球精度": "手感",
  "力量输出": "瞬间反应",
};

const ATTR_TYPE = {
  "触球精度": "技术", "控制技巧": "技术", "力量输出": "技术", "空中能力": "技术",
  "防守技术": "技术",
  "足球理解": "精神", "队友识别": "精神", "对手识别": "精神", "决断速度": "精神",
  "集中力": "精神",
  "耐力": "体能", "爆发": "体能", "速度": "体能", "对抗": "体能", "身高": "体能",
  "体质": "体能",
  "自信": "性格", "纪律性": "性格", "情绪稳定性": "性格", "团队导向": "性格",
  "职业态度": "性格",
};

const QUALITY_TIERS = {
  youth:    { bonus: -3, jitter: 1.0, label: "青训" },
  rotation: { bonus: -1, jitter: 1.0, label: "轮换" },
  starter:  { bonus:  0, jitter: 1.0, label: "主力" },
  star:     { bonus:  2, jitter: 0.8, label: "球星" },
  legend:   { bonus:  4, jitter: 0.5, label: "传奇" },
};

// 21 role positions on the pitch.
const ROLE_POSITION_NAMES = {
  GK:   "门将",
  CB_L: "中后卫(左)", CB_C: "中后卫(中)", CB_R: "中后卫(右)",
  FB_L: "边后卫(左)", FB_R: "边后卫(右)",
  WB_L: "翼卫(左)",   WB_R: "翼卫(右)",
  DM_C: "防守中场",
  CM_L: "中场(左)",   CM_C: "中场(中)",   CM_R: "中场(右)",
  AM_L: "进攻中场(左)", AM_C: "进攻中场(中)", AM_R: "进攻中场(右)",
  W_L:  "边锋(左)",   W_R:  "边锋(右)",
  IF_L: "内锋(左)",   IF_R: "内锋(右)",
  ST_L: "前锋(左)",   ST_C: "中锋",       ST_R: "前锋(右)",
};

module.exports = {
  ATTRS,
  ALL_ATTRS,
  GK_ATTR_MAP,
  ATTR_TYPE,
  QUALITY_TIERS,
  ROLE_POSITION_NAMES,
};
