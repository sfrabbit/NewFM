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

module.exports = {
  V_BANDS, H_LANES, ZONES, ZONE_PHASE, ROLE_POSITIONS, FORMATIONS,
  V_BAND_ORDER, H_LANE_ORDER, PRESSURE_THRESHOLD,
  getZoneCenter, zoneDistance, getZoneV, getZoneH, zoneInSameVBand,
  getPlayerZone, mirrorZone,
  zoneToCoord, coordToZone, PITCH_LENGTH, PITCH_WIDTH, HALF_LENGTH, HALF_WIDTH,
};
