// ============================================================
// 引擎主入口 — 6核心模块系统（2026年6月重构）
// ============================================================
// 6核心情境模块：
//   pass     → pass.js    (传球)
//   dribble  → dribble.js (盘带)
//   shoot    → shoot.js   (射门)
//   tackle   → tackle.js  (抢断)
//   contest  → contest.js (争顶)
//   save     → save.js    (门将扑救)
//
// 旧模块已删除/备份：
//   actions.js     → backups/old_engine/
//   transitions.js → backups/old_engine/
// ============================================================

module.exports = {
  // 基础工具
  ...require("./constants"),
  ...require("./presets"),
  ...require("./rng"),
  ...require("./player"),
  ...require("./prob"),
  ...require("./zones"),
  ...require("./teams"),
  ...require("./situations"),
  ...require("./match"),
  
  // 6核心情境模块（新系统）
  pass: require("./pass"),
  dribble: require("./dribble"),
  shoot: require("./shoot"),
  tackle: require("./tackle"),
  contest: require("./contest"),
  save: require("./save"),
  
  // 22人移动模块（2026年6月新增）
  movement: require("./movement"),
};
