// Bundler: engine/ modules → single browser script
const fs = require('fs');
const path = require('path');

// Topological order (respecting all require() dependencies)
// actions.js and transitions.js REMOVED — replaced by 6-module system
const order = [
  'constants.js',
  'rng.js',
  'presets.js',
  'zones.js',
  'player.js',
  'prob.js',
  'teams.js',
  'situations.js',
  'match.js',
];

let out = `// ⚽ Football Tactical Engine — browser bundle
// Auto-generated from engine/ modules (${new Date().toISOString()})
(function(global) {
  const _mod = {};

`;

for (const f of order) {
  let src = fs.readFileSync(path.join('engine', f), 'utf-8');
  src = src.replace(/const\s*\{[^}]+\}\s*=\s*require\(['"][^'"]+['"]\)\s*;?\s*\n?/g, '');
  src = src.replace(/const\s+\w+\s*=\s*require\(['"][^'"]+['"]\)\s*;?\s*\n?/g, '');
  src = src.replace(/module\.exports\s*=\s*\{/, 'const _exp = {');
  out += `\n  // ── ${f} ──\n`;
  out += src + '\n';
}

// Public symbols to export
const expSymbols = [
  'ATTRS','ALL_ATTRS','GK_ATTR_MAP','ATTR_TYPE','QUALITY_TIERS','ROLE_POSITION_NAMES',
  'Rng',
  'POSITION_TEMPLATES','ROLE_TEMPLATE_MAP','SQUAD_TEMPLATE',
  'V_BANDS','H_LANES','ZONES','ZONE_PHASE','ROLE_POSITIONS','FORMATIONS','V_BAND_ORDER','H_LANE_ORDER','PRESSURE_THRESHOLD','getZoneCenter','zoneDistance','getZoneV','getZoneH','zoneInSameVBand','getPlayerZone','mirrorZone',
  'PlayerProfile','generatePlayerAttrs','createPlayer','downgradeQuality','SquadBuilder',
  'weightedScore','calcProb','resolveTwoPhase',
  'TacticalInstructions','Player','Team','findNearestOpponent',
  'determineSituation','selectAction','executeAction',
  'MatchEngine',
];

out += `\n  // ── public API ──\n`;
out += `  global.FM = {};\n`;
for (const s of expSymbols) {
  out += `  global.FM.${s} = typeof ${s} !== 'undefined' ? ${s} : undefined;\n`;
}

out += `})(typeof window !== 'undefined' ? window : globalThis);\n`;

fs.writeFileSync('public/fm-engine.js', out);
console.log('Bundle written to public/fm-engine.js (' + out.length + ' chars)');
