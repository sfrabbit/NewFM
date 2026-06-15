"""Build browser bundle from engine/ modules."""
import re, os

order = ['constants.js','rng.js','presets.js','zones.js','player.js',
         'prob.js','actions.js','teams.js','situations.js','transitions.js','match.js']

out = ['// FM Engine bundle', '(function(global){', '  const _mod={};']

for f in order:
    with open(os.path.join('engine', f), encoding='utf-8') as fh:
        src = fh.read()
    # Strip require() calls — modules are concatenated in order
    src = re.sub(r"const\s*\{[^}]+\}\s*=\s*require\(['\"][^'\"]+['\"]\)\s*;?\s*\n?", '', src)
    src = re.sub(r"const\s+[A-Za-z_]+\s*=\s*require\(['\"][^'\"]+['\"]\)\s*;?\s*\n?", '', src)
    # Replace module.exports = { → const __expN = {
    src = src.replace('module.exports = {', f'const __exp_{f.replace(".js","")} = {{')
    out.append(f'\n  // ---- {f} ----')
    out.append(src)

sym = ['ATTRS','ALL_ATTRS','GK_ATTR_MAP','ATTR_TYPE','QUALITY_TIERS','ROLE_POSITION_NAMES',
       'Rng','POSITION_TEMPLATES','ROLE_TEMPLATE_MAP','SQUAD_TEMPLATE',
       'V_BANDS','H_LANES','ZONES','ZONE_PHASE','ROLE_POSITIONS','FORMATIONS',
       'V_BAND_ORDER','H_LANE_ORDER','PRESSURE_THRESHOLD',
       'getZoneCenter','zoneDistance','getZoneV','getZoneH','zoneInSameVBand',
       'getPlayerZone','mirrorZone',
       'PlayerProfile','generatePlayerAttrs','createPlayer','downgradeQuality','SquadBuilder',
       'weightedScore','calcProb','resolveTwoPhase',
       'ACTIONS','ACTIONS_INDEX','getAction',
       'TacticalInstructions','Player','Team','findNearestOpponent',
       'SITUATION_ACTIONS','determineSituation','selectAction',
       'resolveBallTransition','resolveShot','MatchEngine']

out.append('\n  // ---- public API ----')
out.append('  global.FM = {};')
for s in sym:
    out.append(f'  global.FM.{s} = typeof {s} !== "undefined" ? {s} : undefined;')
out.append('})(typeof window !== "undefined" ? window : globalThis);')

output = '\n'.join(out)
with open('public/fm-engine.js', 'w', encoding='utf-8') as fh:
    fh.write(output)
print(f'Bundle: {len(output)} chars, {output.count(chr(10))} lines')
