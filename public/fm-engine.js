// ⚽ Football Tactical Engine — browser bundle
// Auto-generated from engine/ modules (2026-06-17T09:40:25.142Z)
(function(global) {
  const _mod = {};


  // ── constants.js ──
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

const _exp = {
  ATTRS,
  ALL_ATTRS,
  GK_ATTR_MAP,
  ATTR_TYPE,
  QUALITY_TIERS,
  ROLE_POSITION_NAMES,
};


  // ── rng.js ──
// Seeded pseudo-random number generator (Mulberry32) + Gaussian via Box-Muller.
// Matches semantics of Python's `random.Random(seed)`: deterministic stream.

class Rng {
  constructor(seed) {
    if (seed === undefined || seed === null) {
      seed = (Math.random() * 2 ** 32) >>> 0;
    }
    this.state = seed >>> 0;
    this._spare = null; // for Box-Muller
  }

  // Uniform [0, 1).
  random() {
    let t = (this.state += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Integer in [lo, hi] inclusive (matches Python's randint).
  randint(lo, hi) {
    return lo + Math.floor(this.random() * (hi - lo + 1));
  }

  // Float in [lo, hi).
  uniform(lo, hi) {
    return lo + this.random() * (hi - lo);
  }

  // Gaussian with mean mu and std sigma.
  gauss(mu, sigma) {
    if (this._spare !== null) {
      const v = this._spare;
      this._spare = null;
      return mu + sigma * v;
    }
    let u1, u2;
    do {
      u1 = this.random();
    } while (u1 <= Number.EPSILON);
    u2 = this.random();
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2.0 * Math.PI * u2);
    const z1 = mag * Math.sin(2.0 * Math.PI * u2);
    this._spare = z1;
    return mu + sigma * z0;
  }

  // Weighted choice: items=[{value, weight}, ...]. Returns value.
  weighted(items) {
    const total = items.reduce((s, it) => s + it.weight, 0);
    if (total <= 0) return items[0].value;
    let r = this.random() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0) return it.value;
    }
    return items[items.length - 1].value;
  }

  choice(arr) {
    return arr[Math.floor(this.random() * arr.length)];
  }
}

const _exp = { Rng };


  // ── presets.js ──
// Position templates, role→template map, squad composition.
// All values mirror /workspace/output/player_module.py.

// Each entry: { 属性: [mean, std] }
const POSITION_TEMPLATES = {
  GK: {
    "触球精度": [12, 3], "控制技巧": [9, 2],  "力量输出": [15, 3],
    "空中能力": [13, 3], "防守技术": [7, 2],
    "足球理解": [12, 3], "队友识别": [10, 2], "对手识别": [10, 2],
    "决断速度": [13, 3], "集中力": [12, 3],
    "耐力": [10, 2],   "爆发": [12, 3],  "速度": [10, 2],
    "对抗": [10, 2],   "身高": [14, 2],  "体质": [12, 3],
    "自信": [11, 3],   "纪律性": [13, 2], "情绪稳定性": [13, 3],
    "团队导向": [12, 3], "职业态度": [12, 3],
  },
  CB: {
    "触球精度": [9, 2],  "控制技巧": [8, 2],  "力量输出": [12, 3],
    "空中能力": [14, 3], "防守技术": [14, 3],
    "足球理解": [11, 3], "队友识别": [10, 2], "对手识别": [11, 2],
    "决断速度": [10, 2], "集中力": [11, 3],
    "耐力": [12, 2],  "爆发": [10, 3], "速度": [10, 3],
    "对抗": [14, 3],  "身高": [14, 2], "体质": [13, 3],
    "自信": [11, 3],  "纪律性": [13, 2], "情绪稳定性": [11, 3],
    "团队导向": [13, 2], "职业态度": [12, 3],
  },
  FB: {
    "触球精度": [10, 2], "控制技巧": [9, 2],  "力量输出": [11, 3],
    "空中能力": [10, 2], "防守技术": [12, 3],
    "足球理解": [10, 2], "队友识别": [10, 2], "对手识别": [10, 2],
    "决断速度": [11, 2], "集中力": [10, 2],
    "耐力": [14, 3],  "爆发": [13, 3], "速度": [13, 3],
    "对抗": [10, 2],  "身高": [10, 2], "体质": [12, 3],
    "自信": [10, 3],  "纪律性": [13, 2], "情绪稳定性": [10, 3],
    "团队导向": [12, 2], "职业态度": [12, 3],
  },
  DM: {
    "触球精度": [11, 2], "控制技巧": [10, 2], "力量输出": [11, 3],
    "空中能力": [9, 2],  "防守技术": [13, 3],
    "足球理解": [13, 3], "队友识别": [11, 2], "对手识别": [12, 2],
    "决断速度": [12, 2], "集中力": [12, 3],
    "耐力": [14, 3],  "爆发": [11, 2], "速度": [10, 2],
    "对抗": [12, 3],  "身高": [10, 2], "体质": [12, 3],
    "自信": [10, 3],  "纪律性": [14, 2], "情绪稳定性": [12, 3],
    "团队导向": [14, 2], "职业态度": [13, 3],
  },
  CM: {
    "触球精度": [13, 3], "控制技巧": [12, 3], "力量输出": [10, 3],
    "空中能力": [9, 2],  "防守技术": [10, 2],
    "足球理解": [13, 3], "队友识别": [12, 3], "对手识别": [10, 2],
    "决断速度": [12, 2], "集中力": [11, 3],
    "耐力": [14, 3],  "爆发": [11, 2], "速度": [10, 2],
    "对抗": [9, 3],   "身高": [10, 2], "体质": [12, 3],
    "自信": [12, 3],  "纪律性": [12, 2], "情绪稳定性": [11, 3],
    "团队导向": [14, 2], "职业态度": [12, 3],
  },
  AM: {
    "触球精度": [14, 3], "控制技巧": [14, 3], "力量输出": [10, 3],
    "空中能力": [8, 2],  "防守技术": [6, 2],
    "足球理解": [14, 3], "队友识别": [13, 3], "对手识别": [11, 2],
    "决断速度": [13, 3], "集中力": [10, 2],
    "耐力": [12, 3],  "爆发": [12, 3], "速度": [11, 2],
    "对抗": [8, 2],   "身高": [9, 2],  "体质": [11, 3],
    "自信": [14, 3],  "纪律性": [10, 2], "情绪稳定性": [10, 3],
    "团队导向": [11, 2], "职业态度": [11, 3],
  },
  WING: {
    "触球精度": [12, 3], "控制技巧": [14, 3], "力量输出": [9, 3],
    "空中能力": [7, 2],  "防守技术": [6, 2],
    "足球理解": [10, 2], "队友识别": [10, 2], "对手识别": [8, 2],
    "决断速度": [11, 2], "集中力": [9, 2],
    "耐力": [13, 3],  "爆发": [15, 3], "速度": [16, 3],
    "对抗": [7, 2],   "身高": [8, 2],  "体质": [11, 3],
    "自信": [13, 3],  "纪律性": [10, 2], "情绪稳定性": [9, 3],
    "团队导向": [10, 2], "职业态度": [10, 3],
  },
  ST: {
    "触球精度": [12, 3], "控制技巧": [11, 3], "力量输出": [11, 3],
    "空中能力": [10, 3], "防守技术": [4, 1],
    "足球理解": [11, 3], "队友识别": [10, 2], "对手识别": [9, 2],
    "决断速度": [13, 3], "集中力": [10, 2],
    "耐力": [11, 2],  "爆发": [14, 3], "速度": [13, 3],
    "对抗": [11, 3],  "身高": [10, 3], "体质": [11, 3],
    "自信": [14, 3],  "纪律性": [9, 2],  "情绪稳定性": [10, 3],
    "团队导向": [9, 2],  "职业态度": [10, 3],
  },
};

const ROLE_TEMPLATE_MAP = {
  GK:   "GK",
  CB_L: "CB", CB_C: "CB", CB_R: "CB",
  FB_L: "FB", FB_R: "FB",
  WB_L: "FB", WB_R: "FB",
  DM_C: "DM",
  CM_L: "CM", CM_C: "CM", CM_R: "CM",
  AM_L: "AM", AM_C: "AM", AM_R: "AM",
  W_L:  "WING", W_R: "WING",
  IF_L: "WING", IF_R: "WING",
  ST_C: "ST", ST_L: "ST", ST_R: "ST",
};

// (role, count) — total = 23
const SQUAD_TEMPLATE = [
  ["GK", 2],
  ["CB_L", 2], ["CB_R", 2],
  ["FB_L", 2], ["FB_R", 2],
  ["CM_C", 2], ["CM_L", 1], ["CM_R", 1],
  ["W_L", 2], ["W_R", 2],
  ["ST_C", 2], ["ST_L", 1], ["ST_R", 1],
  ["DM_C", 1],
];

const _exp = { POSITION_TEMPLATES, ROLE_TEMPLATE_MAP, SQUAD_TEMPLATE };


  // ── zones.js ──
// Pitch zones, formations, role positions. Mirrors match_engine_v2_1.py §1.

const V_BANDS = {
  BOX_D:  [0, 15],     DEEP_D: [15, 32.5],  MID_D: [32.5, 50],
  MID_A:  [50, 67.5],  DEEP_A: [67.5, 85],  BOX_A: [85, 100],
};
const H_LANES = {
  L: [0, 30], CL: [22, 45], C: [38, 62], CR: [55, 78], R: [70, 100],
};

const V_BAND_ORDER = ["BOX_D", "DEEP_D", "MID_D", "MID_A", "DEEP_A", "BOX_A"];
const H_LANE_ORDER = ["L", "CL", "C", "CR", "R"];

const ZONES = {};
{
  const zNameMap = {
    BOX_D:  "本方禁区",
    DEEP_D: "本方深区",
    MID_D:  "中场(己方)",
    MID_A:  "中场(对方)",
    DEEP_A: "对方深区",
    BOX_A:  "对方禁区",
  };
  const lNameMap = { L: "左边路", CL: "左半空间", C: "中路", CR: "右半空间", R: "右边路" };
  // 30-zone model: 5 lanes × 6 bands (Tenga 2010, Sarmento 2014; Juego de Posición)
  for (const vk of V_BAND_ORDER) {
    const [vy1, vy2] = V_BANDS[vk];
    for (const hk of H_LANE_ORDER) {
      const [hy1, hy2] = H_LANES[hk];
      ZONES[`${vk}_${hk}`] = {
        v: vk, h: hk, vy1, vy2, hy1, hy2,
        name: `${zNameMap[vk] || vk} ${lNameMap[hk] || hk}`,
      };
    }
  }
}

const ZONE_PHASE = {};
for (const [zid, info] of Object.entries(ZONES)) {
  const v = info.v;
  if (v === "BOX_D" || v === "DEEP_D") ZONE_PHASE[zid] = "防守三区";
  else if (v === "MID_D") ZONE_PHASE[zid] = "中场防守";
  else if (v === "MID_A") ZONE_PHASE[zid] = "中场进攻";
  else ZONE_PHASE[zid] = "进攻三区";
}

const ROLE_POSITIONS = {
  GK:   ["BOX_D", "ALL", "门将"],
  CB_L: ["DEEP_D", "CL", "左中卫"],  CB_R: ["DEEP_D", "CR", "右中卫"],
  FB_L: ["DEEP_D", "L",  "左边卫"],  FB_R: ["DEEP_D", "R",  "右边卫"],
  WB_L: ["MID_D",  "L",  "左翼卫"],  WB_R: ["MID_D",  "R",  "右翼卫"],
  DM_C: ["MID_D",  "C",  "防守中场"],
  CM_L: ["MID_D",  "CL", "左中场"], CM_C: ["MID_D",  "C",  "中中场"], CM_R: ["MID_D",  "CR", "右中场"],
  AM_L: ["MID_A",  "CL", "左攻击中场"], AM_C: ["MID_A", "C", "攻击中场"], AM_R: ["MID_A", "CR", "右攻击中场"],
  W_L:  ["MID_A",  "L",  "左边锋"], W_R:  ["MID_A",  "R",  "右边锋"],
  IF_L: ["DEEP_A", "CL", "左内锋"], IF_R: ["DEEP_A", "CR", "右内锋"],
  ST_C: ["DEEP_A", "C",  "中锋"],
  ST_L: ["DEEP_A", "CL", "左前锋"], ST_R: ["DEEP_A", "CR", "右前锋"],
};

const FORMATIONS = {
  "4-4-2":   ["GK","FB_L","CB_L","CB_R","FB_R","W_L","CM_L","CM_R","W_R","ST_L","ST_R"],
  "4-3-3":   ["GK","FB_L","CB_L","CB_R","FB_R","CM_L","CM_C","CM_R","W_L","ST_C","W_R"],
  "4-2-3-1": ["GK","FB_L","CB_L","CB_R","FB_R","DM_C","CM_C","W_L","AM_C","W_R","ST_C"],
  "3-5-2":   ["GK","CB_L","CB_R","CB_L","WB_L","CM_L","CM_C","CM_R","WB_R","ST_L","ST_R"],
  "5-3-2":   ["GK","FB_L","CB_L","CB_R","CB_R","FB_R","CM_L","CM_C","CM_R","ST_L","ST_R"],
  "4-1-4-1": ["GK","FB_L","CB_L","CB_R","FB_R","DM_C","W_L","CM_L","CM_R","W_R","ST_C"],
};

// Pressure radius (zone-center distance, scale 0-100). Empirically the nearest-opponent
// distance ranges 15~30 during open play. Threshold = PRESSURE_THRESHOLD + pressing*3
// → range [14, 26] for pressing in [-2, +2]. High-press team (+2) catches more
// situations as "high pressure"; low-press team (-2) lets the ball be played more freely.
const PRESSURE_THRESHOLD = 20;

function getZoneCenter(zoneId) {
  const info = ZONES[zoneId];
  return [(info.vy1 + info.vy2) / 2, (info.hy1 + info.hy2) / 2];
}

function zoneDistance(z1, z2) {
  const c1 = getZoneCenter(z1), c2 = getZoneCenter(z2);
  return Math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2);
}

function getZoneV(zoneId) { return ZONES[zoneId].v; }
function getZoneH(zoneId) { return ZONES[zoneId].h; }
function zoneInSameVBand(z1, z2) { return getZoneV(z1) === getZoneV(z2); }

function clampIdx(i, lo, hi) { return Math.max(lo, Math.min(hi, i)); }

function getPlayerZone(role, tactics) {
  const [vBand0, hLane0] = ROLE_POSITIONS[role];
  let vIdx = V_BAND_ORDER.indexOf(vBand0);
  vIdx = clampIdx(vIdx + Math.round(tactics.getVShift(role)), 0, 5);

  // ALL legacy lane → default to center for box positions (GK etc.)
  let hLane = hLane0 === "ALL" ? "C" : hLane0;
  let hIdx = H_LANE_ORDER.indexOf(hLane);
  hIdx = clampIdx(hIdx + Math.round(tactics.getHShift(role)), 0, 4);
  hLane = H_LANE_ORDER[hIdx];

  const vBand = V_BAND_ORDER[vIdx];
  return `${vBand}_${hLane}`;
}

// Mirror a zone from own-perspective to shared-pitch perspective.
// Used by the away team so all 22 players share the same coordinate grid.
// Away team attacks DOWN (toward y=95), so their "left" = shared RIGHT.
// Both V_BANDS and H_LANES must be flipped.
const V_MIRROR = { BOX_D:'BOX_A', DEEP_D:'DEEP_A', MID_D:'MID_A', MID_A:'MID_D', DEEP_A:'DEEP_D', BOX_A:'BOX_D' };
const H_MIRROR = { L:'R', CL:'CR', C:'C', CR:'CL', R:'L' };
function mirrorZone(zoneId) {
  const parts = zoneId.split('_');
  const lane = parts.pop();
  const vBand = parts.join('_');
  const vMirrored = V_MIRROR[vBand] || vBand;
  const hMirrored = H_MIRROR[lane] || lane;
  return `${vMirrored}_${hMirrored}`;
}

// ============================================================
// Zone ↔ 真实坐标 互转（供movement模块使用）
// ============================================================
// 球场: 105m × 68m, 中心为原点, X=进攻方向(正=对方半场), Y=宽度
const PITCH_LENGTH = 105;
const PITCH_WIDTH = 68;
const HALF_LENGTH = PITCH_LENGTH / 2;
const HALF_WIDTH = PITCH_WIDTH / 2;

/**
 * zone中心 → 真实坐标(m)
 * 0-100的百分比映射到半场[-52.5, 52.5]范围
 */
function zoneToCoord(zoneId) {
  const [v, h] = getZoneCenter(zoneId);  // 0-100
  const x = (v / 100) * PITCH_LENGTH - HALF_LENGTH;
  const y = (h / 100) * PITCH_WIDTH - HALF_WIDTH;
  return { x, y };
}

/**
 * 真实坐标 → 最近zone ID
 */
function coordToZone(x, y) {
  const vPct = ((x + HALF_LENGTH) / PITCH_LENGTH) * 100;
  const hPct = ((y + HALF_WIDTH) / PITCH_WIDTH) * 100;
  const vPctC = Math.max(0, Math.min(100, vPct));
  const hPctC = Math.max(0, Math.min(100, hPct));

  let bestV = 'MID_D', bestH = 'C', bestDist = Infinity;
  for (const [vk, [vy1, vy2]] of Object.entries(V_BANDS)) {
    const vMid = (vy1 + vy2) / 2;
    const dv = Math.abs(vPctC - vMid);
    for (const [hk, [hy1, hy2]] of Object.entries(H_LANES)) {
      const hMid = (hy1 + hy2) / 2;
      const dh = Math.abs(hPctC - hMid);
      const dist = dv * dv + dh * dh;
      if (dist < bestDist) { bestDist = dist; bestV = vk; bestH = hk; }
    }
  }
  return `${bestV}_${bestH}`;
}

const _exp = {
  V_BANDS, H_LANES, ZONES, ZONE_PHASE, ROLE_POSITIONS, FORMATIONS,
  V_BAND_ORDER, H_LANE_ORDER, PRESSURE_THRESHOLD,
  getZoneCenter, zoneDistance, getZoneV, getZoneH, zoneInSameVBand,
  getPlayerZone, mirrorZone,
  zoneToCoord, coordToZone, PITCH_LENGTH, PITCH_WIDTH, HALF_LENGTH, HALF_WIDTH,
};


  // ── player.js ──
// Player profile + squad generation. Mirrors player_module.py.
class PlayerProfile {
  constructor({ name, role, attrs, quality = "starter", pid = null }) {
    this.name = name;
    this.role = role;
    this.role_name = ROLE_POSITION_NAMES[role] || role;
    this.attrs = attrs;
    this.quality = quality;
    this.pid = pid || name;
  }

  get(attr, def = 10) {
    const v = this.attrs[attr];
    return v === undefined ? def : v;
  }

  get is_gk() {
    return this.role === "GK";
  }

  displayAttr(attr) {
    const val = this.attrs[attr];
    if (val === undefined) return "-";
    if (this.is_gk && GK_ATTR_MAP[attr]) {
      return `${val} (${GK_ATTR_MAP[attr]})`;
    }
    return String(val);
  }

  summary() {
    const techAttrs = ["触球精度","控制技巧","力量输出","空中能力","防守技术"];
    const mentalAttrs = ["足球理解","队友识别","对手识别","决断速度","集中力"];
    const physAttrs = ["耐力","爆发","速度","对抗","身高","体质"];
    const avg = (lst) => lst.reduce((s, a) => s + (this.attrs[a] || 10), 0) / lst.length;
    const tech = Math.round(avg(techAttrs) * 10) / 10;
    const mental = Math.round(avg(mentalAttrs) * 10) / 10;
    const phys = Math.round(avg(physAttrs) * 10) / 10;
    return `${this.name}(${this.role_name}) 质${this.quality} 技${tech} 精${mental} 体${phys}`;
  }

  toJSON() {
    return {
      pid: this.pid,
      name: this.name,
      role: this.role,
      role_name: this.role_name,
      quality: this.quality,
      attrs: this.attrs,
    };
  }
}

function generatePlayerAttrs(role, quality = "starter", seed = null) {
  const rng = new Rng(seed === null ? undefined : seed);
  const tKey = ROLE_TEMPLATE_MAP[role] || "CM";
  const template = POSITION_TEMPLATES[tKey] || POSITION_TEMPLATES.CM;
  const tier = QUALITY_TIERS[quality] || QUALITY_TIERS.starter;
  const attrs = {};
  for (const attr of ALL_ATTRS) {
    const md = template[attr];
    if (!md) continue;
    const [mean, std] = md;
    const base = mean + tier.bonus;
    const noise = rng.gauss(0, std * tier.jitter);
    const raw = base + noise;
    attrs[attr] = Math.max(1, Math.min(20, Math.round(raw)));
  }
  return attrs;
}

function createPlayer(name, role, quality = "starter", seed = null) {
  const attrs = generatePlayerAttrs(role, quality, seed);
  return new PlayerProfile({ name, role, attrs, quality });
}

function downgradeQuality(q) {
  const order = ["legend", "star", "starter", "rotation", "youth"];
  const idx = order.indexOf(q);
  if (idx < 0) return "rotation";
  return order[Math.min(idx + 1, order.length - 1)];
}

class SquadBuilder {
  constructor(teamName, seed = null) {
    this.teamName = teamName;
    this.rng = new Rng(seed === null ? undefined : seed);
    this.players = [];
  }

  generateFullSquad(avgQuality = "starter", starCount = 2) {
    this.players = [];
    for (const [role, count] of SQUAD_TEMPLATE) {
      for (let i = 0; i < count; i++) {
        let pq;
        if (this.players.length < starCount && role !== "GK") {
          pq = "star";
        } else if (count > 1 && i === 0) {
          pq = avgQuality;
        } else if (role === "GK" && i === 0) {
          pq = avgQuality;
        } else {
          pq = downgradeQuality(avgQuality);
        }
        const name = `${this.teamName}_${role}_${i + 1}`;
        const seed = this.rng.randint(1, 999999);
        const p = createPlayer(name, role, pq, seed);
        p.pid = name;
        this.players.push(p);
      }
    }
    return this.players;
  }

  getStarting11() {
    const seen = new Set();
    const starters = [];
    let gk = null;
    for (const p of this.players) {
      const base = p.role.split("_")[0];
      if (base === "GK" && !gk) {
        gk = p;
      } else if (!seen.has(p.role) && base !== "GK") {
        seen.add(p.role);
        starters.push(p);
        if (starters.length >= 10) break;
      }
    }
    if (gk && starters.length === 10) return [gk, ...starters];
    return this.players.slice(0, 11);
  }

  getSubs(count = 5) {
    const starting = new Set(this.getStarting11().map(p => p.pid));
    return this.players.filter(p => !starting.has(p.pid)).slice(0, count);
  }
}

const _exp = {
  PlayerProfile,
  generatePlayerAttrs,
  createPlayer,
  downgradeQuality,
  SquadBuilder,
};


  // ── prob.js ──
// Probability calculation: P = A / (A + w*B). Mirrors simulation_engine_v2.calc_prob.
// Adds optional mental_mods parameter (see match_engine_v2_1.calc_prob caller).

function getAttr(attrs, name, def = 10) {
  const v = attrs[name];
  return v === undefined ? def : v;
}

// "属性(权重)+属性(权重)" → Σ attr*weight, -1 if blank/dash.
function weightedScore(attrs, weightsStr) {
  if (!weightsStr || weightsStr === "-") return -1;
  let score = 0;
  for (const part of weightsStr.split("+")) {
    const t = part.trim();
    const lp = t.indexOf("(");
    if (lp < 0) continue;
    const attr = t.slice(0, lp);
    const w = parseFloat(t.slice(lp + 1).replace(")", ""));
    score += getAttr(attrs, attr) * w;
  }
  return score;
}

// mental_mods (optional): { my_factor: number, opp_factor: number }
//   my_factor scales attacker score, opp_factor scales defender score (after w).
function calcProb(myAttrs, oppAttrs, action, mentalMods = null) {
  const ftype = action[5];
  const w = action.length > 6 ? action[6] : 1.0;
  const extra = action.length > 7 ? action[7] : null;

  let myScore = weightedScore(myAttrs, action[3]);
  if (mentalMods && mentalMods.my_factor) myScore *= mentalMods.my_factor;

  if (ftype === "纯己方") {
    const baseline = extra || 10;
    const p = 0.78 + (10 - baseline) * 0.025 + (myScore - 10) / 30;
    return Math.max(0.45, Math.min(0.98, p));
  }

  if (ftype === "对抗" || ftype === "两段_射正" || ftype === "两段_射正_扑救") {
    let oppScore = weightedScore(oppAttrs || {}, action[4]);
    if (mentalMods && mentalMods.opp_factor) oppScore *= mentalMods.opp_factor;
    if (oppScore <= 0 || myScore <= 0) return 0.50;
    return myScore / (myScore + w * oppScore);
  }

  if (ftype === "扑救") {
    const wSave = extra || 0.50;
    const shotQuality = 12;
    if (myScore <= 0) return 0.50;
    return myScore / (myScore + wSave * shotQuality);
  }

  return 0.50;
}

// Two-phase resolution helper for "两段_射正_扑救" actions.
// Returns { sotHit, goal, save } booleans.
function resolveTwoPhase(rng, myAttrs, oppAttrs, gkAttrs, action, mentalMods = null) {
  const wSave = action.length > 7 ? action[7] : 0.50;
  const pSot = calcProb(myAttrs, oppAttrs, action, mentalMods);
  const sotHit = rng.random() < pSot;
  if (!sotHit) return { sotHit: false, goal: false, save: false };

  // Save phase: GK 瞬间反应+手感 vs shot quality (= my_w_str raw score).
  const gkScore = weightedScore(gkAttrs, "瞬间反应(0.6)+手感(0.4)");
  const shotQuality = weightedScore(myAttrs, action[3]);
  const pSave = gkScore / (gkScore + wSave * shotQuality);
  const saved = rng.random() < pSave;
  return { sotHit: true, goal: !saved, save: saved };
}

const _exp = { weightedScore, calcProb, resolveTwoPhase };


  // ── teams.js ──
// Tactical instructions + Player + Team. Mirrors match_engine_v2_1.py §2-3.
// TEAM TENDENCIES (球队倾向): passive, always-on background state that defines
// where players stand and how they default-react. Patterns (套路, not yet
// implemented) will sit on top of this layer and OVERRIDE tendencies when
// triggered, dictating specific player actions in 2-4 player coordination plays.
//
// 5 tendency axes (was 5 "tactics", renamed for clarity):
//   defensive_line   — back-line V_BAND position
//   attacking_width  — wide-role H_LANE spread
//   pressing_intensity — tackle/foul aggression
//   default_tempo    — action-weight bias when no pattern is active
//   compactness      — inter-player vertical distance (forwards drop / defenders push up)
//
// REMOVED: attacking_directness. Direct/clear/cross preference will emerge from
// the pattern library composition rather than a preset slider.
class TacticalInstructions {
  constructor(opts = {}) {
    this.defensive_line     = opts.defensive_line     || 0;
    this.attacking_width    = opts.attacking_width    || 0;
    this.pressing_intensity = opts.pressing_intensity || 0;
    // accept both new (default_tempo) and legacy (tempo) names
    this.default_tempo      = (opts.default_tempo !== undefined) ? opts.default_tempo
                            : (opts.tempo !== undefined) ? opts.tempo : 0;
    this.compactness        = opts.compactness        || 0;
  }

  // Backward-compat accessor: callers reading `.tempo` keep working.
  get tempo() { return this.default_tempo; }

  getVShift(role) {
    if (role === "GK") return 0;
    let shift = 0;
    // defensive_line: back line + holding mids move forward/back together
    if (/^(CB_|FB_|WB_)/.test(role)) shift += this.defensive_line * 0.5;
    if (/^DM_/.test(role))            shift += this.defensive_line * 0.3;
    // compactness: pull extremes toward midfield (forwards drop, defenders push up)
    if (/^(CB_|FB_|WB_)/.test(role)) shift += this.compactness *  0.3;  // up toward mid
    if (/^(ST_|IF_|W_)/.test(role))  shift += this.compactness * -0.3;  // back toward mid
    return shift;
  }

  getHShift(role) {
    if (/^(FB_|WB_|W_|IF_)/.test(role)) return this.attacking_width * 1.0;
    return 0;
  }

  getPressingMod()    { return this.pressing_intensity; }
  getTempoMod()       { return this.default_tempo; }
  getCompactnessMod() { return this.compactness; }
  // Kept as a no-op for any stale caller; always returns 0 now that
  // directness is no longer a tendency axis.
  getDirectnessMod()  { return 0; }
}

class Player {
  constructor({ pid, role, quality = "starter", attrs = null, rng = null }) {
    this.pid = pid;
    this.role = role;
    this.role_name = (ROLE_POSITIONS[role] || ["", "", role])[2];
    this.quality = quality;
    if (attrs) {
      this.attrs = attrs;
    } else {
      const seed = rng ? rng.randint(1, 999999) : null;
      this.attrs = generatePlayerAttrs(role, quality, seed);
    }
  }

  get(attr, def = 10) {
    const v = this.attrs[attr];
    return v === undefined ? def : v;
  }

  get is_gk() { return this.role === "GK"; }
}

class Team {
  // playersData (optional): [{pid, role, attrs, quality}] for actual game players.
  // Falls back to generating from formation if absent.
  constructor({ name, formation, tactics = null, eliteCount = 0, playersData = null, rng = null }) {
    this.name = name;
    this.formation = formation;
    this.tactics = tactics || new TacticalInstructions();
    this.roles = FORMATIONS[formation] || FORMATIONS["4-4-2"];
    this.players = {}; // pid → Player
    const _rng = rng || new Rng();

    if (playersData && playersData.length > 0) {
      // Use provided real players, role order taken from formation
      const used = new Set();
      const byRole = {};
      for (const pd of playersData) {
        if (!byRole[pd.role]) byRole[pd.role] = [];
        byRole[pd.role].push(pd);
      }
      // Fill formation slots
      for (let i = 0; i < this.roles.length; i++) {
        const role = this.roles[i];
        let pick = null;
        if (byRole[role] && byRole[role].length > 0) {
          pick = byRole[role].shift();
        } else {
          // Find any unused player whose role-base matches
          for (const pd of playersData) {
            if (used.has(pd.pid)) continue;
            pick = pd;
            break;
          }
        }
        if (!pick) continue;
        used.add(pick.pid);
        const fakePid = `${name}_${i}`;
        const p = new Player({
          pid: fakePid,
          role,
          quality: pick.quality || "starter",
          attrs: pick.attrs,
        });
        p.original_pid = pick.pid;
        p.original_name = pick.name;
        this.players[fakePid] = p;
      }
    } else {
      // Generate fresh players from formation
      const eliteIdx = new Set();
      while (eliteIdx.size < Math.min(eliteCount, 11)) {
        eliteIdx.add(_rng.randint(0, 10));
      }
      for (let i = 0; i < this.roles.length; i++) {
        const role = this.roles[i];
        const pid = `${name}_${i}`;
        const quality = eliteIdx.has(i) ? "star" : "starter";
        this.players[pid] = new Player({ pid, role, quality, rng: _rng });
      }
    }
  }

  getPlayerZones() {
    const z = {};
    for (const [pid, p] of Object.entries(this.players)) {
      z[pid] = [getPlayerZone(p.role, this.tactics), p.role];
    }
    return z;
  }

  // Phase 1 dumb prototype: a flat list of all 11 players with their current
  // tactical-default zone. Used by the front-end to render 22 dots on the
  // live in-match pitch. Static for now (no per-tick movement yet); Step 3+
  // of the tick-based engine will replace this with real per-tick coords.
  getPositionSnapshot({ mirror = false } = {}) {
    const out = [];
    for (const [pid, p] of Object.entries(this.players)) {
      const rawZone = getPlayerZone(p.role, this.tactics);
      out.push({
        pid,
        role: p.role,
        role_name: p.role_name,
        zone: mirror ? mirrorZone(rawZone) : rawZone,
        is_gk: p.is_gk,
        elite: (p.quality === "star" || p.quality === "legend"),
      });
    }
    return out;
  }

  findPlayerInZone(zoneId, playerZones) {
    for (const [pid, [z, role]] of Object.entries(playerZones)) {
      if (z === zoneId) return [pid, role];
    }
    return [null, null];
  }

  findNearestTeammate(zoneId, playerZones, excludePid = null, preferForward = true) {
    let bestPid = null, bestRole = null, bestAdj = 999;
    const tgtV = V_BAND_ORDER.indexOf(getZoneV(zoneId));
    for (const [pid, [z, role]] of Object.entries(playerZones)) {
      if (pid === excludePid) continue;
      const d = zoneDistance(zoneId, z);
      const zv = V_BAND_ORDER.indexOf(getZoneV(z));
      const fwdBonus = preferForward ? Math.max(0, zv - tgtV) * 5 : 0;
      const adj = d - fwdBonus;
      if (adj < bestAdj) {
        bestAdj = adj; bestPid = pid; bestRole = role;
      }
    }
    const dist = bestPid ? zoneDistance(zoneId, playerZones[bestPid][0]) : 999;
    return [bestPid, bestRole, dist];
  }
}

function findNearestOpponent(ballZone, opponentZones, skipCount = 0) {
  let distances = [];
  for (const [pid, [z]] of Object.entries(opponentZones)) {
    distances.push({ pid, d: zoneDistance(ballZone, z) });
  }
  distances.sort((a, b) => a.d - b.d);
  const idx = Math.min(skipCount, distances.length - 1);
  if (distances.length === 0) return [null, 999];
  return [distances[idx].pid, distances[idx].d];
}

const _exp = {
  TacticalInstructions, Player, Team, findNearestOpponent,
};


  // ── situations.js ──
// ============================================================
// 情境判断模块 — 新6核心系统（2026年6月重构）
// ============================================================
// 完全使用新的6个核心模块：
//   pass, dribble, shoot, tackle, contest, save
//
// 每个情境返回：
//   { type: 'pass'|'dribble'|'shoot'|'tackle'|'contest'|'save',
//     context: { ...物理和意图上下文 }
//   }
// ============================================================

// 引入6个核心模块
// ── 构建物理上下文 ──
function buildContext(ballZone, opponentZones, matchContext = {}) {
  const pressure = matchContext.realPressure !== undefined ? matchContext.realPressure : 0;
  const minDist = matchContext.realDefDist || 25;
  const v = getZoneV(ballZone);
  const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };
  const distance = distMap[v] || 25;
  const defInLane = Object.values(opponentZones).filter(([z]) =>
    Math.abs(z[0] - ballZone[0]) <= 1 && Math.abs(z[1] - ballZone[1]) <= 1
  ).length;

  return {
    distance,
    pressure,
    defDist: minDist,
    defInLane,
    fatigue: matchContext.fatigue || 0,
    speedDiff: matchContext.speedDiff || 0,
    // zone格式: "V_BAND_LANE", 如 "MID_D_L", "BOX_A_CR"
    // 从zone string提取lane: L=0, CL=1, C=2, CR=3, R=4 → 乘以18得角度
    angle: (() => {
      const parts = String(ballZone).split('_');
      const laneCode = parts[2] || 'C';
      const laneIdx = { L: 0, CL: 1, C: 2, CR: 3, R: 4 }[laneCode];
      return (laneIdx != null ? laneIdx : 2) * 18;
    })(),
    setPiece: matchContext.setPiece || 'none',
    ballHeight: Math.random() * 0.7 + 0.15,
    isFromClose: v === 'BOX_D' || v === 'BOX_A',
    space: matchContext.space || 10,
    chemistry: matchContext.chemistry || 0.5,
    gkPosition: matchContext.gkPosition || 'center',
    shotDistance: matchContext.shotDistance || 12,
    shotPower: matchContext.shotPower || 0.5,
    shotHeight: matchContext.shotHeight || 0.5,
    shotDirection: matchContext.shotDirection || 'center',
    isPenalty: matchContext.isPenalty || false,
    carrierAction: matchContext.carrierAction || 'dribbleForward',
  };
}

// ── 决策模型：物理条件决定机会，战术位置做微调，属性决定执行 ──
// 基于xT/VAEP等足球分析研究：
//   主导因子：距离球门 > 防守压力 > 射门角度
//   球员属性和角色不在机会评估中出现（xG模型也不包含）
// "角色"不是固定标签——同一球员可踢边锋/翼卫/边前卫，取决于战术部署
// 战术位置（formation中的部署位置，如LR/AM/FC等）提供微量偏好
// 预留"套路"层——未来可让战术模式override正常决策

// ── 决策模型 ──
// 射门/传球/盘带各自独立计算效用值，不互加减，用 softmax 比较
// 物理条件决定机会基线，球员属性 + 战术做个人化加权

// ── 射门效用 = f(xG, personalModifier) ──
// xG 编码了距离+角度+压力 → 机会越好，射门效用越高
// personalModifier 综合以下因素：
//   + shootWillingness   (战术预留，默认0，将来可正可负)
//   + timePressureBonus  (比赛最后10分钟，0 → 0.3)
//   + (自信-10)*0.04     (自信高 → 更敢射；极端值≈±0.4，可与战术值同级)
//   + (10-团队)*0.04     (团队低 → 更爱单干；极端值≈±0.4，可大致抵消战术)
function shootUtility(xgValue, personalModifier = 0) {
  return xgValue * Math.exp(personalModifier);
}

// ── 传球效用 = f(zone, pressure, passTendency) ──
// passTendency: 战术预留（默认0，将来可正可负。正=更倾向传球，负=更倾向不传）
function passUtility(v, pressure, passTendency = 0) {
  const tacticalMod = Math.exp(passTendency);
  if (v === 'BOX_A')      return 0.18 * tacticalMod;
  if (v === 'DEEP_A')     return (0.20 + pressure * 0.05) * tacticalMod;
  if (v === 'MID_A')      return (0.25 + pressure * 0.05) * tacticalMod;
  if (v === 'MID_D')      return 0.25 * tacticalMod;
  if (v === 'DEEP_D')     return 0.20 * tacticalMod;
  if (v === 'BOX_D')      return 0.18 * tacticalMod;
  return 0.20 * tacticalMod;
}

// ── 盘带效用 = f(distance→risk, pressure, xg, dribbleTendency) ──
// 不是按zone分档，而是用离球门距离驱动的连续丢球风险模型：
//   越靠近对方球门(d小) → 丢球后果轻 → 敢带
//   越靠近本方球门(d大) → 丢球后果重 → 不敢带
// dribbleTendency: 战术预留（默认0，将来可正可负）
function dribbleUtility(v, pressure, xgValue, dribbleTendency = 0) {
  const distMap = { BOX_A: 8, DEEP_A: 14, MID_A: 22, MID_D: 35, DEEP_D: 45, BOX_D: 55 };
  const d = distMap[v] || 25;

  // riskFactor: 连续物理量 — 离球门越远，丢球风险成本越高
  // d=8m(BOX_A)→0.85, d=35m(MID_D)→0.36, d=55m(BOX_D)→0.00(自然归零)
  const riskFactor = Math.max(0, 1 - d / 55);

  const xgBlock = Math.max(0, 1 - xgValue / 0.20);
  const pressBlock = 1 - pressure;

  // baseWillingness: 行为校准常数（单一标量，非zone分档魔数）
  const baseWillingness = 0.12;

  return baseWillingness * riskFactor * xgBlock * pressBlock * Math.exp(dribbleTendency);
}

// ── xG 快速估算 ──
// logistic 模型, 校准到英超 xG 分布
// d=6m→0.32, d=11m→0.17, d=16m→0.09, d=22m→0.03
function estimateXG(v, ctx) {
  if (v === 'BOX_D' || v === 'DEEP_D') return 0;
  const d = ctx.distance || 25;
  // 注意：angle=0 是合法值（边线窄角度），不能用 || 短路
  const angle = (ctx.angle != null) ? ctx.angle : 45;
  const pressure = ctx.pressure || 0;
  const aRad = angle * Math.PI / 180;
  const z = 0.2 - d * 0.16 + aRad * 0.7 - pressure * 1.0;
  return 1 / (1 + Math.exp(-z));
}

// ── 综合决策 ──
// shootWillingness: 战术预留（默认0，将来可正可负）
// passTendency:      战术预留（默认0，将来可正可负）
// dribbleTendency:   战术预留（默认0，将来可正可负）
// matchMinute: 比赛分钟数（用于时间压力计算）
// attrs: 球员属性 { 自信, 团队, ... }
function decisionProbs(ballZone, role, attrs, pressure, tacticPos, xgValue, shootWillingness = 0, matchMinute = 0, passTendency = 0, dribbleTendency = 0) {
  const v = getZoneV(ballZone);
  const xg = xgValue !== undefined ? xgValue : 0.1;

  // ── 个人因素加权 ──
  // shootWillingness: 战术预留（将来由战术系统/个性系统填入）
  // timePressure: 最后10分钟+ 迫近射门倾向
  const timePressureBonus = (matchMinute >= 80) ? Math.min(0.3, (matchMinute - 80) / 10 * 0.3) : 0;
  // 球员个性：自信↑ → 更敢射；团队↓ → 更爱单干
  const confidence = (attrs['自信'] != null) ? attrs['自信'] : 10;
  const teamwork = (attrs['团队'] != null) ? attrs['团队'] : 10;
  const personalityBonus = (confidence - 10) * 0.04 + (10 - teamwork) * 0.04;

  const personalModifier = shootWillingness + timePressureBonus + personalityBonus;

  const shootU  = shootUtility(xg, personalModifier);
  const passU   = passUtility(v, pressure, passTendency);
  const dribbleU = dribbleUtility(v, pressure, xg, dribbleTendency);

  const total = shootU + passU + dribbleU;
  return {
    pShoot: shootU / total,
    pPass: passU / total,
    pDribble: dribbleU / total,
    _shoot: shootU, _pass: passU, _dribble: dribbleU,
  };
}

// ── 情境判断主函数 ──
function determineSituation(rng, ballZone, carrierRole, carrierAttrs, possessionTeam,
                            opponentZones, tactics, setPiece, matchContext, defenderTactics) {
  // 定位球处理
  if (setPiece === "penalty") {
    return {
      type: 'shoot',
      subType: 'penalty',
      context: { ...buildContext(ballZone, opponentZones, matchContext), isPenalty: true, setPiece: 'penalty' }
    };
  }
  if (setPiece === "corner") {
    return {
      type: 'contest',
      subType: 'aerialContest',
      context: { ...buildContext(ballZone, opponentZones, matchContext), ballHeight: 0.8 }
    };
  }
  if (setPiece === "throw_in") {
    return {
      type: 'pass',
      subType: 'throwIn',
      context: buildContext(ballZone, opponentZones, matchContext)
    };
  }
  if (setPiece === "goal_kick") {
    return {
      type: 'pass',
      subType: 'gkDistribution',
      context: buildContext(ballZone, opponentZones, matchContext)
    };
  }
  if (setPiece === "free_kick") {
    const v = getZoneV(ballZone);
    if (v === 'BOX_A' || v === 'DEEP_A') {
      return {
        type: 'shoot',
        subType: 'freeKick',
        context: { ...buildContext(ballZone, opponentZones, matchContext), setPiece: 'freeKick' }
      };
    }
    return {
      type: 'pass',
      subType: 'freeKickPass',
      context: buildContext(ballZone, opponentZones, matchContext)
    };
  }

  // 门将持球
  if (carrierRole === "GK") {
    return {
      type: 'pass',
      subType: 'gkDistribution',
      context: buildContext(ballZone, opponentZones, matchContext)
    };
  }

  const ctx = buildContext(ballZone, opponentZones, matchContext);
  const v = getZoneV(ballZone);

  // ── 抢断判断 ──
  // 抢断是防守方决策：最近防守者越近 + 防守能力越强 → 抢断概率越高
  // TODO: 将来由防守球员的角色/职能 + 战术指令（压迫强度）驱动
  const tackleCheck = () => {
    const defDist = ctx.defDist;
    if (defDist > 6) return false;
    const chance = defDist < 1.5 ? 0.30 : defDist < 3 ? 0.15 : defDist < 6 ? 0.08 : 0;
    return rng.random() < chance;
  };

  // ── 争顶判断 ──
  // TODO: 将来用22人真实坐标，球附近≥2人在0.5-1m内自动触发
  const contestCheck = () => {
    return rng.random() < 0.03; // 临时保底3%
  };

  // ── 禁区防守 ──
  if (v === "BOX_D") {
    if (/^(CB_|FB_|WB_|DM_)/.test(carrierRole)) {
      if (ctx.pressure > 0.6) {
        return { type: 'contest', subType: 'boxClearance', context: { ...ctx, intent: 'clearance' } };
      }
      return { type: 'pass', subType: 'buildUp', context: ctx };
    }
    // 进攻球员在禁区也有被抢断的可能
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'boxPress', context: ctx };
    }
    // 禁区持球：决策
    if (/^(ST_|W_|IF_|AM_)/.test(carrierRole)) {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      const r = rng.random();
      if (r < pShoot) {
        return { type: 'shoot', subType: 'boxShot', context: ctx };
      }
      if (r < pShoot + pPass) return { type: 'pass', subType: 'boxPass', context: ctx };
      return { type: 'dribble', subType: 'boxDribble', context: ctx };
    }
    return ctx.pressure > 0.5
      ? { type: 'contest', subType: 'defClearance', context: { ...ctx, intent: 'clearance' } }
      : { type: 'pass', subType: 'defPass', context: ctx };
  }

  // ── 后场 ──
  if (v === "DEEP_D") {
    if (/^(CB_|FB_|WB_|DM_)/.test(carrierRole)) {
      if (tackleCheck()) {
        return { type: 'tackle', subType: 'deepPress', context: ctx };
      }
      return ctx.pressure > 0.6
        ? { type: 'contest', subType: 'deepClearance', context: { ...ctx, intent: 'clearance' } }
        : { type: 'pass', subType: 'buildUp', context: ctx };
    }
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'deepPress', context: ctx };
    }
  }

  // ── 前场 ──
  if (v === "BOX_A" || v === "DEEP_A") {
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'defPress', context: ctx };
    }
    if (/^(ST_|W_|IF_|AM_)/.test(carrierRole)) {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      const r = rng.random();
      if (r < pShoot) {
        return { type: 'shoot', subType: 'attackShot', context: ctx };
      }
      if (r < pShoot + pPass) return { type: 'pass', subType: 'finalThirdPass', context: ctx };
      return { type: 'dribble', subType: 'finalThirdDribble', context: ctx };
    }
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'defPress', context: ctx };
    }
    return { type: 'pass', subType: 'finalThirdPass', context: ctx };
  }

  // ── 中场 ──
  if (v === "MID_D" || v === "MID_A") {
    if (tackleCheck()) {
      return { type: 'tackle', subType: 'midfieldTackle', context: ctx };
    }

    // 反击场景
    if (matchContext.is_transition) {
      if (tackleCheck()) {
        return { type: 'tackle', subType: 'counterPress', context: ctx };
      }
      const xg = estimateXG(v, ctx);
      const { pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      if (rng.random() < pDribble / (pDribble + pPass)) {
        return { type: 'dribble', subType: 'counter', context: ctx };
      }
      return { type: 'pass', subType: 'transitionPass', context: ctx };
    }

    // 进攻球员在中场前区：决策
    if (/^(ST_|W_|IF_|AM_)/.test(carrierRole)) {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      const r = rng.random();
      if (r < pShoot) {
        return { type: 'shoot', subType: 'longShot', context: ctx };
      }
      if (r < pShoot + pPass) return { type: 'pass', subType: 'attackPass', context: ctx };
      return { type: 'dribble', subType: 'attackDribble', context: ctx };
    }

    // 中场控制：决策 + 争顶
    {
      const xg = estimateXG(v, ctx);
      const { pShoot, pPass, pDribble } = decisionProbs(ballZone, carrierRole, carrierAttrs, ctx.pressure, undefined, xg, 0, matchContext.match_minute || 0, 0, 0);
      if (contestCheck()) {
        return { type: 'contest', subType: 'midfieldContest', context: { ...ctx, intent: 'possession' } };
      }
      const r = rng.random();
      if (r < pShoot) {
        return { type: 'shoot', subType: 'longShot', context: ctx };
      }
      if (r < pShoot + pPass) return { type: 'pass', subType: 'midfieldPass', context: ctx };
      return { type: 'dribble', subType: 'midfieldCarry', context: ctx };
    }
  }

  // 默认：传球
  return { type: 'pass', subType: 'normal', context: ctx };
}

// ── 选择动作（基于球员属性+情境+战术）──
function selectAction(rng, situation, tactics, playerAttrs) {
  const { type, subType, context } = situation;

  switch (type) {
    case 'pass': {
      // 传球是连续梯度 — 球员根据自身能力和情境决定传多远、多冒险
      // riskLevel: 0=完全安全(5m) ~ 1=长传冒险(45m)
      const power      = playerAttrs['力量输出'] || 10;
      const understand = playerAttrs['足球理解'] || 10;
      const confidence = playerAttrs['自信'] || 10;
      const teammate   = playerAttrs['队友识别'] || 10;
      const tempo      = tactics.getTempoMod();
      const d = context.distance || 25;
      const p = context.pressure || 0;

      let riskLevel = 0.10 + (d - 10) * 0.006 + (understand - 10) * 0.015 + (confidence - 10) * 0.008;
      if (p > 0.5) riskLevel -= 0.08;
      if (tempo > 0.3) riskLevel += 0.06;
      if (teammate > 12) riskLevel -= 0.04;
      riskLevel = Math.max(0, Math.min(1, riskLevel));
      return riskLevel;
    }

    case 'dribble': {
      // 盘带风格是连续：0=护球 → 0.5=控球/假动作 → 1=冲刺突破
      // 物理条件+属性决定风格，不再有离散类型
      const burst  = playerAttrs['爆发'] || 10;
      const speed  = playerAttrs['速度'] || 10;
      const control = playerAttrs['控制技巧'] || 10;
      const conf   = playerAttrs['自信'] || 10;
      const space  = context.space || 10;
      const pressure = context.pressure || 0;

      // 基础倾向：爆发高→偏冲刺，控球好→偏控制，自信高→偏冒险
      let dribbleStyle = 0.4 + (burst - 10) * 0.03 + (speed - 10) * 0.02 - (control - 10) * 0.03 + (conf - 10) * 0.02;
      // 空间大→冲刺，紧逼→护球/假动作
      if (space > 20) dribbleStyle += 0.15;
      if (pressure > 0.4) dribbleStyle -= 0.10;
      dribbleStyle = Math.max(0, Math.min(1, dribbleStyle));

      // 连续值映射到物理行为
      if (dribbleStyle < 0.15) return 'shield';
      if (dribbleStyle < 0.35) return 'control';
      if (dribbleStyle < 0.55) return 'feint';
      if (dribbleStyle < 0.75) return 'force';
      return 'burst';
    }

    case 'shoot': {
      const power   = playerAttrs['力量输出'] || 10;
      const touch   = playerAttrs['触球精度'] || 10;
      const aerial  = playerAttrs['空中能力'] || 10;
      const conf    = playerAttrs['自信'] || 10;
      const ballH   = context.ballHeight || 0.3;

      // 物理强制：高空球→凌空或头球
      if (ballH > 0.6) return (aerial > touch) ? 'header' : 'volley';
      if (ballH > 0.4 && rng.random() < 0.3) return (aerial > touch) ? 'header' : 'volley';

      // 地面球：力量型 vs 技术型，连续谱
      // 0=完全推射(placed) → 1=完全抽射(power)
      let shootStyle = 0.4 + (power - 10) * 0.03 - (touch - 10) * 0.03 + (conf - 10) * 0.02;
      shootStyle = Math.max(0, Math.min(1, shootStyle));
      return shootStyle < 0.5 ? 'placed' : 'power';
    }

    case 'tackle':
      return 'tackle'; // 抢断方式由模块内部决定

    case 'contest': {
      if (context.ballHeight > 0.5) return 'aerial';
      return 'shoulder';
    }

    case 'save':
      return 'save';

    default:
      return 'normal';
  }
}

// ── 执行动作（调用新模块）──
function executeAction(type, actionType, playerAttrs, context, opponentAttrs, gkAttrs) {
  switch (type) {
    case 'pass':
      // actionType 现在是连续的 riskLevel (0-1)
      return pass.pass(playerAttrs, typeof actionType === 'number' ? actionType : 0.4, context, opponentAttrs);

    case 'dribble':
      return dribble.dribble(playerAttrs, actionType, context, opponentAttrs);

    case 'shoot':
      return shoot.shoot(playerAttrs, actionType, context, gkAttrs, opponentAttrs);

    case 'tackle':
      return tackle.tackle(playerAttrs, opponentAttrs, context);

    case 'contest':
      const contestType = actionType || 'aerial';
      return contest.contest(contestType, playerAttrs, opponentAttrs, context);

    case 'save':
      return save.save(playerAttrs, context);

    default:
      return { successProb: 0.5 };
  }
}

const _exp = {
  determineSituation,
  selectAction,
  executeAction,
  buildContext,
  // 决策函数导出（用于诊断）
  decisionProbs,
  estimateXG,
  // 导出6个模块供外部使用
  modules: { pass, dribble, shoot, tackle, contest, save }
};


  // ── match.js ──
// ============================================================
// 比赛引擎 — 新6核心模块系统（2026年6月重构）
// ============================================================
// 完全使用新的6个核心模块：
//   pass, dribble, shoot, tackle, contest, save
//
// 每个事件都经过：
//   1. 情境判断（determineSituation）
//   2. 动作选择（selectAction）
//   3. 模块执行（executeAction）
//   4. 结果处理（球权转移/射门处理）
// ============================================================

class MatchEngine {
  constructor(home, away, seed = null) {
    this.rng = new Rng(seed === null ? undefined : seed);
    this.home = home;
    this.away = away;

    this.minute = 0;
    this.second = 0;
    this.stoppage_time = 0;
    this.is_half_time = false;
    this.is_full_time = false;
    this.halftime_reached = false;

    this.score_home = 0;
    this.score_away = 0;

    this.ball_zone = "MID_D_C";
    this._ballCoord = { x: 0, y: 0 };  // 球的真实坐标(米)，从zone中心推导
    this.possession = "home";
    this.ball_carrier = null;

    this.set_piece = null;
    this.is_transition = false;
    this.is_scramble = false;
    this.is_breaking_away = false;
    this.last_event_follow_up = null;
    this._scramble_chain = 0;
    this._collapse_timer = 0;

    this.events = [];
    this.stats = {
      home: { shots: 0, shots_on_target: 0, possession: 0, passes: 0, tackles: 0, fouls: 0, corners: 0, saves: 0 },
      away: { shots: 0, shots_on_target: 0, possession: 0, passes: 0, tackles: 0, fouls: 0, corners: 0, saves: 0 },
    };
    this.possession_counter = 0;
    this.possession_home = 0;

    this._zones_home = null;
    this._zones_away = null;

    // ===== 22人移动系统 =====
    this._playerCoords = {};  // pid → { x, y } 真实坐标(米)
    this._tickCount = 0;
    this._movementHistory = []; // 每N步记录一次位置快照
  }

  _getZones(team) {
    if (team === "home") {
      if (!this._zones_home) this._zones_home = this.home.getPlayerZones();
      return this._zones_home;
    }
    if (!this._zones_away) this._zones_away = this.away.getPlayerZones();
    return this._zones_away;
  }

  _invalidateZones() { this._zones_home = null; this._zones_away = null; }
  _attTeam() { return this.possession === "home" ? this.home : this.away; }
  _defTeam() { return this.possession === "home" ? this.away : this.home; }
  _attZones() { return this._getZones(this.possession); }
  _defZones() { return this._getZones(this.possession === "home" ? "away" : "home"); }

  /** 球zone更新后同步真实坐标 */
  _syncBallCoord() {
    if (this.ball_zone) {
      try { this._ballCoord = zoneToCoord(this.ball_zone); }
      catch(e) { this._ballCoord = { x: 0, y: 0 }; }
    }
  }

  _getCarrierPlayer() {
    if (!this.ball_carrier) return null;
    return this._attTeam().players[this.ball_carrier] || null;
  }

  _getOpponentPlayer() {
    // 用球的真实坐标 + 防守方真实坐标找最近对手（不再用zone距离）
    const defTeam = this._defTeam();
    const ballC = this._ballCoord;
    let bestPid = null, bestDist = Infinity;
    for (const [pid, c] of Object.entries(this._playerCoords)) {
      if (c.team === this.possession) continue; // 跳过己方
      const dx = ballC.x - c.x, dy = ballC.y - c.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < bestDist) { bestDist = d; bestPid = pid; }
    }
    if (!bestPid) return null;
    return defTeam.players[bestPid] || null;
  }

  /** 计算球到最近防守者的真实距离(米) */
  _ballDefDist() {
    const ballC = this._ballCoord;
    let minD = Infinity;
    for (const [, c] of Object.entries(this._playerCoords)) {
      if (c.team === this.possession) continue;
      const dx = ballC.x - c.x, dy = ballC.y - c.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < minD) minD = d;
    }
    return minD === Infinity ? 25 : minD;
  }

  _getGkPlayer(teamId = null) {
    const t = teamId ? (teamId === "home" ? this.home : this.away) : this._defTeam();
    for (const p of Object.values(t.players)) {
      if (p.role === "GK") return p;
    }
    return null;
  }

  /** 从当前进攻方选择一个非门将球员作为持球者(加权随机) */
  _pickNonGkCarrier() {
    const attZ = this._attZones();
    const attTeam = this._attTeam();
    const entries = Object.entries(attZ).filter(([pid, [, role]]) => {
      const p = attTeam.players[pid];
      return p && role !== 'GK';  // 排除门将
    });

    if (entries.length === 0) return;

    // 根据球的区域调整接球者权重：禁区找前锋，中场找组织者，后场找后卫
    const v = getZoneV(this.ball_zone);
    const weights = entries.map(([pid, [, role]]) => {
      // 进攻区域：前锋和边锋是第一选择
      if (v === 'BOX_A' || v === 'DEEP_A') {
        if (/^(ST_)/.test(role)) return 50;
        if (/^(W_|IF_|AM_)/.test(role)) return 35;
        if (/^(CM_)/.test(role)) return 20;
        return 10;
      }
      // 中场：组织核心
      if (v === 'MID_A' || v === 'MID_D') {
        if (/^(CM_|AM_)/.test(role)) return 40;
        if (/^(ST_|W_|IF_)/.test(role)) return 30;
        if (/^(DM_)/.test(role)) return 20;
        return 15;
      }
      // 后场：后卫和防守中场
      if (/^(DM_|CB_)/.test(role)) return 40;
      if (/^(FB_|WB_)/.test(role)) return 30;
      if (/^(CM_)/.test(role)) return 25;
      return 15;
    });

    // 加权随机选择
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.rng.random() * total;
    for (let i = 0; i < entries.length; i++) {
      r -= weights[i];
      if (r <= 0 || i === entries.length - 1) {
        this.ball_carrier = entries[i][0];
        this.ball_zone = entries[i][1][0];
        return;
      }
    }
  }

  _pickGkCarrier() {
    const attZ = this._attZones();
    const attTeam = this._attTeam();
    for (const [pid, [, role]] of Object.entries(attZ)) {
      if (role === 'GK') {
        this.ball_carrier = pid;
        return;
      }
    }
    // 找不到GK时fallback到非GK
    this._pickNonGkCarrier();
  }

  // 传球落点：连续 riskLevel(0-1) → 连续距离
  // riskLevel 0 = 5-12m 完全安全, 0.5 = 12-25m 标准推进, 1 = 30-55m 长传
  _advanceBallByPass(riskLevel) {
    const coord = zoneToCoord(this.ball_zone);
    if (!coord) return;

    const r = typeof riskLevel === 'number' ? Math.max(0, Math.min(1, riskLevel)) : 0.4;
    // 连续映射：前进距离和平移距离都随 riskLevel 线性增长
    const minF = 3 + r * 12,   maxF = 10 + r * 40;
    const maxLat = 3 + r * 20;

    const forwardM = minF + this.rng.random() * (maxF - minF);
    const lateralM = (this.rng.random() - 0.5) * maxLat * 2;

    const newX = coord.x + forwardM;
    const newY = coord.y + lateralM;
    this.ball_zone = coordToZone(newX, newY);
  }

  // 盘带推进：用真实米制距离
  _advanceBallByDribble(dribbleType) {
    const coord = zoneToCoord(this.ball_zone);
    if (!coord) return;

    let forwardM, lateralM;
    switch (dribbleType) {
      case 'burst':
        forwardM = 8 + this.rng.random() * 7;            // 8-15m 冲刺
        lateralM = (this.rng.random() - 0.5) * 6;        // ±3m
        break;
      case 'control':
        forwardM = 3 + this.rng.random() * 5;             // 3-8m 稳步
        lateralM = (this.rng.random() - 0.5) * 4;
        break;
      case 'force':
        forwardM = 3 + this.rng.random() * 7;             // 3-10m 强突
        lateralM = (this.rng.random() - 0.5) * 4;
        break;
      case 'feint':
        forwardM = 3 + this.rng.random() * 7;             // 3-10m
        lateralM = (this.rng.random() - 0.5) * 10;        // ±5m 晃开角度
        break;
      case 'shield':
        forwardM = this.rng.random() * 3;                 // 0-3m 护球
        lateralM = 0;
        break;
      default:
        forwardM = 5; lateralM = 0;
    }

    const newX = coord.x + forwardM;
    const newY = coord.y + lateralM;
    this.ball_zone = coordToZone(newX, newY);
  }

  // ============================================================
  // 22人移动系统
  // ============================================================

  /** 初始化所有22名球员的真实坐标(从zone推导)
   * 共享坐标系: x ∈ [-52.5, 52.5], 负=主队球门方向, 正=客队球门方向
   * 主队攻击方向: +x, 客队攻击方向: -x
   */
  _initPlayerCoords() {
    this._playerCoords = {};
    // 主场: 直接使用zone坐标 (主队攻击+x方向)
    for (const [pid, p] of Object.entries(this.home.players)) {
      const zone = getPlayerZone(p.role, this.home.tactics);
      const { x, y } = zoneToCoord(zone);
      this._playerCoords[pid] = {
        x, y, defaultX: x, defaultY: y,
        role: p.role, attrs: p.attrs,
        fatigue: 0, distanceCovered: 0,
        team: 'home'
      };
    }

    // 客场: zone是"从客队视角"定义的，需要mirror到共享坐标系
    // 客队攻击-x方向，所以他们的DEEP_D(后场)对应共享坐标系的DEEP_A(+x方向)
    for (const [pid, p] of Object.entries(this.away.players)) {
      const rawZone = getPlayerZone(p.role, this.away.tactics);
      // mirror: 客队的后场(DEEP_D) → 共享坐标系的DEEP_A(+x侧)
      const zone = mz(rawZone);
      const { x, y } = zoneToCoord(zone);
      // 重要：mirrorZone翻转了左右(L↔R)，导致客队的FB_L站在了右边
      // 但FB_L应该始终站在左边(从该队视角)，所以我们需要翻转y坐标
      // 这样客队的FB_L(y=-23.8)和主队的FB_L(y=-23.8)都在同一边(左边)
      this._playerCoords[pid] = {
        x, y: -y, defaultX: x, defaultY: -y,
        role: p.role, attrs: p.attrs,
        fatigue: 0, distanceCovered: 0,
        team: 'away'
      };
    }
  }

  /** 推断当前球队的战术风格 */
  _inferTacticalStyle(team) {
    const t = team.tactics;
    const pi = t.getPressingMod();
    if (pi >= 1) return 'high_press';
    if (pi <= -1) return 'low_block';
    if (t.getCompactnessMod() >= 1) return 'low_block';
    if (t.getTempoMod() <= -1) return 'medium_block';
    return 'medium_block';
  }

  /**
   * 每步更新22名球员位置
   * @param {number} dt 时间步长(秒)
   */
  _stepMovementPlayers(dt) {
    // 构建22人数组
    const allPlayers = [];
    for (const [pid, coord] of Object.entries(this._playerCoords)) {
      const team = coord.team === 'home' ? this.home : this.away;
      const playerObj = team.players[pid];
      if (!playerObj) continue;

      const isAttacking = this.possession === coord.team;

      allPlayers.push({
        id: pid,
        role: coord.role,
        team: coord.team,
        attrs: coord.attrs || playerObj.attrs || {},
        x: coord.x, y: coord.y,
        defaultX: coord.defaultX, defaultY: coord.defaultY,
        fatigue: coord.fatigue || 0,
        distanceCovered: coord.distanceCovered || 0,
        teamRole: isAttacking ? 'attacking' : 'defending',
        side: coord.defaultY != null ? (coord.defaultY < -5 ? 'left' : (coord.defaultY > 5 ? 'right' : null)) : null
      });
    }

    // 获取球的真实坐标
    let ballCoord = { x: 0, y: 0 };
    try {
      ballCoord = zoneToCoord(this.ball_zone);
    } catch(e) {
      // fallback
    }

    // 推断两个队的战术风格
    const attStyle = this._inferTacticalStyle(this._attTeam());

    const ctx = {
      pitchWidth: PITCH_WIDTH, pitchLength: PITCH_LENGTH,
      ballPosition: ballCoord,
      tacticalStyle: attStyle,
      allPlayers
    };

    // 执行移动 - 将大时间步分成多个小时间步，使球员持续向目标移动
    const SUB_STEPS = 5;  // 每个事件分成5个小时间步
    const subDT = dt / SUB_STEPS;
    let currentPlayers = allPlayers;
    for (let i = 0; i < SUB_STEPS; i++) {
      currentPlayers = updatePlayerPositions(currentPlayers, ctx, subDT);
    }

    // 回写坐标
    for (const p of currentPlayers) {
      if (this._playerCoords[p.id]) {
        this._playerCoords[p.id].x = p.x;
        this._playerCoords[p.id].y = p.y;
        this._playerCoords[p.id].fatigue = p.fatigue || 0;
        this._playerCoords[p.id].distanceCovered = p.distanceCovered || 0;
      }
    }

    // 同步疲劳度到球员对象
    for (const p of currentPlayers) {
      const team = p.team === 'home' ? this.home : this.away;
      const po = team.players[p.id];
      if (po) po.fatigue = p.fatigue || 0;
    }

    // 记录移动快照(每5步)
    this._tickCount++;
    if (this._tickCount % 5 === 0) {
      const snapshot = {
        tick: this._tickCount,
        minute: this.minute,
        players: currentPlayers.map(p => ({
          id: p.id, role: p.role, team: p.team,
          x: p.x.toFixed(1), y: p.y.toFixed(1),
          fatigue: (p.fatigue * 100).toFixed(0) + '%'
        }))
      };
      this._movementHistory.push(snapshot);
      if (this._movementHistory.length > 50) this._movementHistory.shift();
    }
  }

  // ============================================================

  initMatch(firstPossession = "home") {
    this.possession = firstPossession;
    this._invalidateZones();

    // 初始化22人坐标
    this._initPlayerCoords();

    const attZones = this._attZones();
    const attTeam = this._attTeam();
    for (const [pid, [z, role]] of Object.entries(attZones)) {
      if (role.startsWith("ST_")) {
        this.ball_carrier = pid;
        this.ball_zone = z;
        return;
      }
    }
    const fallbackPid = Object.keys(attTeam.players).pop();
    this.ball_carrier = fallbackPid;
    this.ball_zone = (attZones[fallbackPid] || ["MID_D_C", "ST_C"])[0];
  }

  _advanceTime(min, max) {
    const sec = this.rng.randint(min, max);
    this.second += sec;
    while (this.second >= 60) { this.second -= 60; this.minute += 1; }
    if (this.minute >= 45 && !this.halftime_reached) {
      this.halftime_reached = true;
      this.is_half_time = true;
    }
    if (this.minute >= 90) {
      if (this.stoppage_time === 0) this.stoppage_time = this.rng.randint(2, 5);
      if (this.minute >= 90 + this.stoppage_time) this.is_full_time = true;
    }
  }

  _updateStats(type, success) {
    const tk = this.possession === "home" ? "home" : "away";
    this.possession_counter += 1;
    if (this.possession === "home") this.possession_home += 1;

    if (type === 'pass') this.stats[tk].passes += 1;
    if (type === 'tackle') this.stats[tk].tackles += 1;
  }

  _generateEventDescription(situation, actionType, result, playerName, zoneName) {
    const { type, subType } = situation;
    const timeStr = this.minute !== undefined ? `${this.minute}'` : '0\'';
    const ballZone = this.ball_zone || '未知区域';
    
    // 构建决策详情
    let decisionDetail = '';
    if (result.intent) {
      if (result.intent.targetZone) decisionDetail += `→目标:${result.intent.targetZone} `;
      if (result.intent.anticipation) decisionDetail += `预判:${result.intent.anticipation} `;
    }
    if (result.successProb !== undefined) decisionDetail += `成功率:${(result.successProb * 100).toFixed(0)}% `;
    if (result.winProb !== undefined) decisionDetail += `胜率:${(result.winProb * 100).toFixed(0)}% `;

    switch (type) {
      case 'pass':
        if (result.successProb > 0.7) {
          return `[${timeStr}] ${playerName}在${zoneName}精准传球 ${decisionDetail}|球→${ballZone}`;
        } else if (result.successProb > 0.4) {
          return `[${timeStr}] ${playerName}在${zoneName}传球${result.interceptProb > 0.3 ? '被拦截!' : '成功'} ${decisionDetail}|球→${ballZone}`;
        } else {
          return `[${timeStr}] ${playerName}在${zoneName}传球失误 ${decisionDetail}|球→${ballZone}`;
        }

      case 'dribble':
        if (result.successRate > 0.7) {
          return `[${timeStr}] ${playerName}在${zoneName}盘带突破 ${decisionDetail}|球→${ballZone}`;
        } else if (result.successRate > 0.4) {
          return `[${timeStr}] ${playerName}在${zoneName}盘带${result.intent?.feint?.isDeceived ? '假动作!' : ''} ${decisionDetail}|球→${ballZone}`;
        } else {
          return `[${timeStr}] ${playerName}在${zoneName}盘带被断 ${decisionDetail}|球→${ballZone}`;
        }

      case 'shoot':
        this.stats[this.possession === "home" ? "home" : "away"].shots += 1;
        if (result.totalProb > 0.3) {
          this.stats[this.possession === "home" ? "home" : "away"].shots_on_target += 1;
          return `[${timeStr}] ${playerName}在${zoneName}射门⚽进球! ${decisionDetail}|球→${ballZone}`;
        } else if (result.onTargetRate > 0.5) {
          this.stats[this.possession === "home" ? "home" : "away"].shots_on_target += 1;
          return `[${timeStr}] ${playerName}在${zoneName}射门被扑 ${decisionDetail}|球→${ballZone}`;
        } else {
          return `[${timeStr}] ${playerName}在${zoneName}射门打偏 ${decisionDetail}|球→${ballZone}`;
        }

      case 'tackle':
        if (result.winProb > 0.6) {
          this.stats[this.possession === "home" ? "home" : "away"].tackles += 1;
          return `[${timeStr}] ${playerName}抢断成功${result.anticipation?.isCorrect ? '(预判)' : ''} ${decisionDetail}|球→${ballZone}`;
        } else if (result.foulProb > 0.3) {
          this.stats[this.possession === "home" ? "home" : "away"].fouls += 1;
          return `[${timeStr}] ${playerName}抢断犯规 ${decisionDetail}|球→${ballZone}`;
        } else {
          return `[${timeStr}] ${playerName}抢断失败 ${decisionDetail}|球→${ballZone}`;
        }

      case 'contest':
        if (result.winProb > 0.6) {
          return `[${timeStr}] ${playerName}争顶成功 ${decisionDetail}|球→${ballZone}`;
        } else {
          return `[${timeStr}] ${playerName}争顶失败 ${decisionDetail}|球→${ballZone}`;
        }

      case 'save':
        this.stats[this.possession === "home" ? "away" : "home"].saves += 1;
        if (result.saveProb > 0.5) {
          return `[${timeStr}] 门将扑救成功${result.anticipation?.isCorrect ? '(预判)' : ''} ${decisionDetail}|球→${ballZone}`;
        } else {
          return `[${timeStr}] 门将扑救失败 ${decisionDetail}|球→${ballZone}`;
        }

      default:
        return `[${this.minute}'] ${playerName}在${zoneName}处理球`;
    }
  }

  _resolveResult(situation, actionType, result, carrier, opponent, gk) {
    const { type } = situation;
    const rng = this.rng.random();

    switch (type) {
      case 'pass': {
        const success = rng < result.successProb;
        this._updateStats('pass', success);

        if (success) {
          // 传球落点由传球类型决定：safe=保持/推1格, normal=推1格, risky=穿1-2层, long=跨2-3层
          this._advanceBallByPass(actionType);
          this._invalidateZones();
          this.ball_carrier = null;
          this._pickNonGkCarrier();
          return { success: true, desc: '传球成功', followUp: null };
        } else {
          // 传球失败：球权转移给防守方最近的球员
          this.possession = this.possession === "home" ? "away" : "home";
          this._invalidateZones();
          this.ball_carrier = null;
          this._pickNonGkCarrier();
          return { success: false, desc: '传球被断', followUp: null };
        }
      }

      case 'dribble': {
        const success = rng < result.successRate;
        this._updateStats('dribble', success);

        if (success) {
          // 盘带推进由类型决定：burst跨1-2层，control稳步，shield原地，feint+force小幅
          this._advanceBallByDribble(actionType);
          return { success: true, desc: '盘带突破', followUp: null };
        } else {
          if (this.rng.random() < 0.7) {
            this.possession = this.possession === "home" ? "away" : "home";
            this._invalidateZones();
            this.ball_carrier = null;
            this._pickNonGkCarrier();
          }
          return { success: false, desc: '盘带被断', followUp: null };
        }
      }

      case 'shoot': {
        // 射门处理
        const notBlocked = rng > result.blockRate;
        if (!notBlocked) {
          // 被阻挡
          return { success: false, desc: '射门被阻挡', followUp: 'blocked' };
        }

        const onTarget = this.rng.random() < result.onTargetRate;
        if (!onTarget) {
          this.stats[this.possession === "home" ? "home" : "away"].shots += 1;
          return { success: false, desc: '射门偏出', followUp: 'goal_kick' };
        }

        this.stats[this.possession === "home" ? "home" : "away"].shots += 1;
        this.stats[this.possession === "home" ? "home" : "away"].shots_on_target += 1;

        // 射正，门将扑救
        const gkResult = executeAction('save', 'save', gk.attrs, {
          ...situation.context,
          shotDirection: result.shotDirection || 'center',
          shotDistance: situation.context.distance,
          shotPower: 0.7,
          shotHeight: 0.3
        });

        const saved = this.rng.random() < gkResult.saveProb;
        if (saved) {
          this.stats[this.possession === "home" ? "away" : "home"].saves += 1;
          return { success: true, desc: '射正被扑', followUp: 'shot_saved' };
        }

        // 进球！
        if (this.possession === "home") {
          this.score_home += 1;
        } else {
          this.score_away += 1;
        }
        return { success: true, desc: 'GOAL!', followUp: 'goal' };
      }

      case 'tackle': {
        const success = rng < result.winProb;
        this._updateStats('tackle', success);

        if (result.foulProb > 0.3 && this.rng.random() < result.foulProb) {
          this.stats[this.possession === "home" ? "home" : "away"].fouls += 1;
          return { success: false, desc: '犯规', followUp: 'foul' };
        }

        if (success) {
          // 抢断成功：防守方获得球权
          this.possession = this.possession === "home" ? "away" : "home";
          this._invalidateZones();
          this.ball_carrier = null;
          this._pickNonGkCarrier();
          return { success: true, desc: '抢断成功', followUp: null };
        } else {
          return { success: false, desc: '抢断失败', followUp: null };
        }
      }

      case 'contest': {
        const success = rng < result.winProb;

        if (success) {
          return { success: true, desc: '争顶成功', followUp: null };
        } else {
          // 争顶失败：球权转移
          this.possession = this.possession === "home" ? "away" : "home";
          this._invalidateZones();
          this.ball_carrier = null;
          return { success: false, desc: '争顶失败', followUp: null };
        }
      }

      default:
        return { success: false, desc: '未知动作', followUp: null };
    }
  }

  step() {
    if (this.is_full_time) return null;

    // 确保有持球者 — 优先选择非门将的进攻/中场球员
    if (this.ball_carrier === null) {
      this._pickNonGkCarrier();
    }
    if (this.ball_carrier === null) return null;

    let carrier = this._getCarrierPlayer();
    if (!carrier) {
      const att = this._attTeam();
      const k = Object.keys(att.players);
      if (k.length === 0) return null;
      this.ball_carrier = k[0];
      carrier = att.players[k[0]];
      if (!carrier) return null;
    }

    // 处理后续事件
    const followUp = this.last_event_follow_up;
    this.last_event_follow_up = null;

    if (followUp === "goal") {
      this._advanceTime(30, 45);
      return {
        type: "goal",
        desc: `⚽ GOAL! ${this.possession === "home" ? this.home.name : this.away.name} 进球! 比分 ${this.score_home}-${this.score_away}`,
        minute: this.minute
      };
    }

    // ── 射门后的球权转移 ──
    if (followUp === "goal_kick") {
      // 射偏 → 对方门将开门球
      this.possession = this.possession === "home" ? "away" : "home";
      this._invalidateZones();
      this.ball_carrier = this._pickGkCarrier();
      this.ball_zone = 'BOX_D_C';
      this.set_piece = 'goal_kick';
      this._advanceTime(10, 20);
      carrier = this._getCarrierPlayer();
      if (!carrier) return null;
    }
    else if (followUp === "shot_saved") {
      // 射正被扑 → 扑救成功，门将持球或角球
      this.possession = this.possession === "home" ? "away" : "home";
      this._invalidateZones();
      if (this.rng.random() < 0.7) {
        // 门将抱住球，开球
        this.ball_carrier = this._pickGkCarrier();
        this.ball_zone = 'BOX_D_C';
      } else {
        // 扑出底线 → 角球给对方
        this.possession = this.possession === "home" ? "away" : "home";
        this.ball_carrier = this._pickNonGkCarrier();
        this.ball_zone = 'BOX_A_C';
        // 标记为定位球，下次step处理为角球
        this.set_piece = 'corner';
      }
      this._advanceTime(15, 25);
      carrier = this._getCarrierPlayer();
      if (!carrier) return null;
    }
    else if (followUp === "blocked") {
      // 射门被挡 → 球权不确定，反弹到中场
      if (this.rng.random() < 0.4) {
        this.possession = this.possession === "home" ? "away" : "home";
      }
      this._invalidateZones();
      this.ball_carrier = this._pickNonGkCarrier();
      this.ball_zone = 'MID_A_C';
      this._advanceTime(5, 12);
      carrier = this._getCarrierPlayer();
      if (!carrier) return null;
    }

    // 构建比赛上下文
    const realDefDist = this._ballDefDist();
    const matchContext = {
      is_transition: this.is_transition,
      is_scramble: this.is_scramble,
      is_breaking_away: this.is_breaking_away,
      fatigue: carrier.fatigue || 0,
      setPiece: this.set_piece,
      realDefDist: realDefDist,
      realPressure: Math.max(0, Math.min(1, 1 - (realDefDist - 0.3) / 4.7)),
      match_minute: this.minute,
    };

    // 1. 情境判断（传入持球者属性，让球员自己做决策）
    const situation = determineSituation(
      this.rng, this.ball_zone, carrier.role, carrier.attrs, this.possession,
      this._defZones(), this._attTeam().tactics, this.set_piece, matchContext,
      this._defTeam().tactics
    );

    // 2. 动作选择
    const actionType = selectAction(this.rng, situation, this._attTeam().tactics, carrier.attrs);

    // 3. 获取对手和门将
    const opponent = this._getOpponentPlayer();
    const gk = this._getGkPlayer();

    // 4. 执行动作
    const result = executeAction(
      situation.type, actionType, carrier.attrs, situation.context,
      opponent ? opponent.attrs : null, gk ? gk.attrs : null
    );

    // 5. 处理结果
    const resolution = this._resolveResult(situation, actionType, result, carrier, opponent, gk);

    // 更新动作链：球/持球者/区域是否发生变化？
    // 6. 生成事件描述
    const zoneName = this.ball_zone;
    const desc = this._generateEventDescription(situation, actionType, result, carrier.role_name || '球员', zoneName);

    // 7. 同步球真实坐标
    this._syncBallCoord();

    // 8. 22人移动更新（在时间推进前，使用本次动作耗时）
    // 注意：timeCost是动作执行时间，但球员在此期间和之后都在移动
    const timeCost = { pass: [8, 15], dribble: [10, 18], shoot: [5, 12], tackle: [8, 15], contest: [10, 18], save: [3, 8] };
    const [tmin, tmax] = timeCost[situation.type] || [10, 15];
    const actionTime = (tmin + tmax) / 2;  // 平均秒数
    
    // 使用固定的合理时间步长，确保球员移动平滑且符合物理
    // 目标：每次事件球员移动5-15米（现实足球中10-15秒内的移动距离）
    const stepDT = Math.min(actionTime * 2, 30);  // 最大30秒，避免过大移动
    this._stepMovementPlayers(stepDT);

    // 9. 时间推进
    this._advanceTime(tmin, tmax);

    // 10. 更新后续事件
    if (resolution.followUp) {
      this.last_event_follow_up = resolution.followUp;
    }

    // 10. 重置状态
    this.is_transition = false;
    this.is_scramble = false;
    this.set_piece = null;

    // Get carrier's real coordinates for frontend visualization
    const carrierCoord = this._playerCoords[this.ball_carrier] || null;

    // Build positions snapshot for all 22 players (for frontend 2D visualization)
    const positions = {};
    for (const [pid, coord] of Object.entries(this._playerCoords)) {
      const side = coord.team; // 'home' or 'away'
      positions[`${side}_${pid}`] = {
        x: coord.x,
        y: coord.y,
        role: coord.role
      };
    }

    const event = {
      type: situation.type,
      subType: situation.subType,
      action: actionType,
      desc,
      success: resolution.success,
      minute: this.minute,
      team: this.possession,
      zone: this.ball_zone,
      carrier_pid: this.ball_carrier,
      carrier_side: this.possession,
      carrier_x: carrierCoord ? carrierCoord.x : undefined,
      carrier_y: carrierCoord ? carrierCoord.y : undefined,
      positions, // All 22 players' positions for 2D visualization
      result: {
        successProb: result.successProb || result.successRate || result.winProb || result.saveProb,
        intent: result.intent || result.anticipation || null
      }
    };

    this.events.push(event);
    return event;
  }

  runMatch({ maxActions = 400, verbose = false } = {}) {
    this.initMatch();
    let n = 0;
    while (!this.is_full_time && n < maxActions) {
      const r = this.step();
      if (r && verbose && r.desc) console.log(r.desc);
      n++;
    }
    return this.matchSummary();
  }

  matchSummary() {
    const h = this.stats.home, a = this.stats.away;

    // 构建带真实坐标的位置快照
    const home_positions = this.home.getPositionSnapshot();
    const away_positions = this.away.getPositionSnapshot({ mirror: true });

    // 附加真实坐标
    for (const pos of home_positions) {
      const coord = this._playerCoords[pos.pid];
      if (coord) {
        pos.x = coord.x; pos.y = coord.y;
        pos.fatigue = coord.fatigue || 0;
        pos.distanceCovered = coord.distanceCovered || 0;
      }
    }
    for (const pos of away_positions) {
      const coord = this._playerCoords[pos.pid];
      if (coord) {
        pos.x = coord.x; pos.y = coord.y;
        pos.fatigue = coord.fatigue || 0;
        pos.distanceCovered = coord.distanceCovered || 0;
      }
    }

    // 紧凑度统计
    const homeDef = [];
    const awayDef = [];
    for (const [pid, c] of Object.entries(this._playerCoords)) {
      if (c.team === 'home') homeDef.push(c);
      else awayDef.push(c);
    }
    const homeCompact = calculateCompactness(homeDef);
    const awayCompact = calculateCompactness(awayDef);

    return {
      score: `${this.score_home}-${this.score_away}`,
      home: this.home.name,
      away: this.away.name,
      shots: `${h.shots}-${a.shots}`,
      shots_on_target: `${h.shots_on_target}-${a.shots_on_target}`,
      possession_home_pct: 100 * this.possession_home / Math.max(1, this.possession_counter),
      passes: `${h.passes}-${a.passes}`,
      tackles: `${h.tackles}-${a.tackles}`,
      fouls: `${h.fouls}-${a.fouls}`,
      corners: `${h.corners}-${a.corners}`,
      saves: `${h.saves}-${a.saves}`,
      events: this.events,
      minute: this.minute,
      home_positions,
      away_positions,
      // 移动系统数据
      movement: {
        home_compactness: homeCompact,
        away_compactness: awayCompact,
        snapshots: this._movementHistory,
        tick_count: this._tickCount,
        ball_zone: this.ball_zone,
        ball_coord: this._ballCoord
      }
    };
  }
}

const _exp = { MatchEngine };


  // ── public API ──
  global.FM = {};
  global.FM.ATTRS = typeof ATTRS !== 'undefined' ? ATTRS : undefined;
  global.FM.ALL_ATTRS = typeof ALL_ATTRS !== 'undefined' ? ALL_ATTRS : undefined;
  global.FM.GK_ATTR_MAP = typeof GK_ATTR_MAP !== 'undefined' ? GK_ATTR_MAP : undefined;
  global.FM.ATTR_TYPE = typeof ATTR_TYPE !== 'undefined' ? ATTR_TYPE : undefined;
  global.FM.QUALITY_TIERS = typeof QUALITY_TIERS !== 'undefined' ? QUALITY_TIERS : undefined;
  global.FM.ROLE_POSITION_NAMES = typeof ROLE_POSITION_NAMES !== 'undefined' ? ROLE_POSITION_NAMES : undefined;
  global.FM.Rng = typeof Rng !== 'undefined' ? Rng : undefined;
  global.FM.POSITION_TEMPLATES = typeof POSITION_TEMPLATES !== 'undefined' ? POSITION_TEMPLATES : undefined;
  global.FM.ROLE_TEMPLATE_MAP = typeof ROLE_TEMPLATE_MAP !== 'undefined' ? ROLE_TEMPLATE_MAP : undefined;
  global.FM.SQUAD_TEMPLATE = typeof SQUAD_TEMPLATE !== 'undefined' ? SQUAD_TEMPLATE : undefined;
  global.FM.V_BANDS = typeof V_BANDS !== 'undefined' ? V_BANDS : undefined;
  global.FM.H_LANES = typeof H_LANES !== 'undefined' ? H_LANES : undefined;
  global.FM.ZONES = typeof ZONES !== 'undefined' ? ZONES : undefined;
  global.FM.ZONE_PHASE = typeof ZONE_PHASE !== 'undefined' ? ZONE_PHASE : undefined;
  global.FM.ROLE_POSITIONS = typeof ROLE_POSITIONS !== 'undefined' ? ROLE_POSITIONS : undefined;
  global.FM.FORMATIONS = typeof FORMATIONS !== 'undefined' ? FORMATIONS : undefined;
  global.FM.V_BAND_ORDER = typeof V_BAND_ORDER !== 'undefined' ? V_BAND_ORDER : undefined;
  global.FM.H_LANE_ORDER = typeof H_LANE_ORDER !== 'undefined' ? H_LANE_ORDER : undefined;
  global.FM.PRESSURE_THRESHOLD = typeof PRESSURE_THRESHOLD !== 'undefined' ? PRESSURE_THRESHOLD : undefined;
  global.FM.getZoneCenter = typeof getZoneCenter !== 'undefined' ? getZoneCenter : undefined;
  global.FM.zoneDistance = typeof zoneDistance !== 'undefined' ? zoneDistance : undefined;
  global.FM.getZoneV = typeof getZoneV !== 'undefined' ? getZoneV : undefined;
  global.FM.getZoneH = typeof getZoneH !== 'undefined' ? getZoneH : undefined;
  global.FM.zoneInSameVBand = typeof zoneInSameVBand !== 'undefined' ? zoneInSameVBand : undefined;
  global.FM.getPlayerZone = typeof getPlayerZone !== 'undefined' ? getPlayerZone : undefined;
  global.FM.mirrorZone = typeof mirrorZone !== 'undefined' ? mirrorZone : undefined;
  global.FM.PlayerProfile = typeof PlayerProfile !== 'undefined' ? PlayerProfile : undefined;
  global.FM.generatePlayerAttrs = typeof generatePlayerAttrs !== 'undefined' ? generatePlayerAttrs : undefined;
  global.FM.createPlayer = typeof createPlayer !== 'undefined' ? createPlayer : undefined;
  global.FM.downgradeQuality = typeof downgradeQuality !== 'undefined' ? downgradeQuality : undefined;
  global.FM.SquadBuilder = typeof SquadBuilder !== 'undefined' ? SquadBuilder : undefined;
  global.FM.weightedScore = typeof weightedScore !== 'undefined' ? weightedScore : undefined;
  global.FM.calcProb = typeof calcProb !== 'undefined' ? calcProb : undefined;
  global.FM.resolveTwoPhase = typeof resolveTwoPhase !== 'undefined' ? resolveTwoPhase : undefined;
  global.FM.TacticalInstructions = typeof TacticalInstructions !== 'undefined' ? TacticalInstructions : undefined;
  global.FM.Player = typeof Player !== 'undefined' ? Player : undefined;
  global.FM.Team = typeof Team !== 'undefined' ? Team : undefined;
  global.FM.findNearestOpponent = typeof findNearestOpponent !== 'undefined' ? findNearestOpponent : undefined;
  global.FM.determineSituation = typeof determineSituation !== 'undefined' ? determineSituation : undefined;
  global.FM.selectAction = typeof selectAction !== 'undefined' ? selectAction : undefined;
  global.FM.executeAction = typeof executeAction !== 'undefined' ? executeAction : undefined;
  global.FM.MatchEngine = typeof MatchEngine !== 'undefined' ? MatchEngine : undefined;
})(typeof window !== 'undefined' ? window : globalThis);
