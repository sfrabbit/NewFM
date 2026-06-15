// Tactical instructions + Player + Team. Mirrors match_engine_v2_1.py §2-3.
const {
  ROLE_POSITIONS, FORMATIONS, V_BAND_ORDER, zoneDistance, getZoneV, getPlayerZone,
} = require("./zones");
const { generatePlayerAttrs } = require("./player");
const { Rng } = require("./rng");

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
    const { mirrorZone } = require("./zones");
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

module.exports = {
  TacticalInstructions, Player, Team, findNearestOpponent,
};
