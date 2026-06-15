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

module.exports = { weightedScore, calcProb, resolveTwoPhase };
