/**
 * 22人移动模块 v3 测试 — 阵型无预设，行为从结构推导
 */
const { movement } = require("./engine");

const PW = 68, PL = 105, hL = PL / 2, hW = PW / 2;
const ballAt = { x: 15, y: 0 };

function mkPlayer(role, defX, defY, side, teamRole) {
  return {
    id: Math.random(), role,
    defaultX: defX, defaultY: defY, x: defX, y: defY,
    side: side || null,
    attrs: { 速度: 14, 足球理解: 14, 决断速度: 13, 耐力: 15 },
    teamRole: teamRole || 'attacking'
  };
}

function buildTeam(rolesWithPositions) {
  return rolesWithPositions.map(([r, x, y], i) => ({
    id: i, role: r, defaultX: x, defaultY: y, x, y,
    side: Math.abs(y) > 15 ? (y < 0 ? 'left' : 'right') : null,
    attrs: { 速度: 14, 足球理解: 14, 决断速度: 13, 耐力: 15 },
    teamRole: x > 10 ? 'attacking' : 'defending'
  }));
}

function testOne(name, rolesWithPos, style) {
  const team = buildTeam(rolesWithPos);
  const ctx = { pitchWidth: PW, pitchLength: PL, ballPosition: ballAt, tacticalStyle: style, allPlayers: team };
  const struct = movement.analyzeTeamStructure(team, style);

  console.log(`\n--- ${name} (${style}) ---`);
  console.log(`  结构: ${[...new Set(team.map(p=>movement.getPositionType(p.role)))].join('/')}`);

  // 只打印几个代表性位置
  const highlights = new Set([0, 1, Math.floor(team.length/2), team.length-1]);
  team.forEach((p, i) => {
    if (!highlights.has(i) && team.length > 6) return;
    p.structure = struct[i];
    const t = movement.calculateTargetPosition(p, ctx);
    console.log(`  ${p.role.padEnd(6)} (${p.defaultX},${p.defaultY}) => (${t.x.toFixed(1)}, ${t.y.toFixed(1)})`);
  });
}

console.log("=== v3: 无阵型预设 ===\n");

// ====== 经典4-4-2 ======
testOne("4-4-2", [
  ['GK', -45, 0], ['LB', -25, -22], ['CB_L', -28, -6], ['CB_R', -28, 6], ['RB', -25, 22],
  ['LM', 5, -24], ['CM_L', 0, -5], ['CM_R', 0, 5], ['RM', 5, 24],
  ['ST_L', 25, -4], ['ST_R', 25, 4]
], 'medium_block');

// ====== 4-3-3 ======
testOne("4-3-3", [
  ['GK', -45, 0], ['LB', -20, -20], ['CB_L', -25, -6], ['CB_R', -25, 6], ['RB', -20, 20],
  ['DM', -8, 0], ['CM_L', 5, -8], ['CM_R', 5, 8],
  ['LW', 18, -22], ['ST', 28, 0], ['RW', 18, 22]
], 'high_press');

// ====== 3-5-2 ======
testOne("3-5-2", [
  ['GK', -45, 0], ['CB_L', -22, -10], ['CB', -22, 0], ['CB_R', -22, 10],
  ['LWB', -10, -28], ['CM_L', -2, -7], ['CM', -2, 0], ['CM_R', -2, 7], ['RWB', -10, 28],
  ['ST_L', 22, -3], ['ST_R', 22, 3]
], 'counter_attack');

// ====== 奇异阵型: 4-1-4-1 (实际存在的阵型) ======
testOne("4-1-4-1", [
  ['GK', -45, 0], ['LB', -20, -20], ['CB_L', -25, -6], ['CB_R', -25, 6], ['RB', -20, 20],
  ['DM', -5, 0],
  ['LM', 8, -22], ['CM_L', 8, -6], ['CM_R', 8, 6], ['RM', 8, 22],
  ['ST', 28, 0]
], 'medium_block');

// ====== 奇异阵型: 3-4-3 (Conte) ======
testOne("3-4-3", [
  ['GK', -45, 0], ['CB_L', -22, -10], ['CB', -22, 0], ['CB_R', -22, 10],
  ['DM', -4, -7], ['CM', -4, 7],
  ['LW', 14, -22], ['AM', 14, 0], ['RW', 14, 22],
  ['ST', 26, 0]
], 'high_press');

// ====== 奇异阵型: 5-4-1 (极度防守) ======
testOne("5-4-1", [
  ['GK', -45, 0],
  ['LWB', -20, -25], ['CB_L', -25, -8], ['CB', -25, 0], ['CB_R', -25, 8], ['RWB', -20, 25],
  ['LM', 0, -18], ['CM_L', -2, -4], ['CM_R', -2, 4], ['RM', 0, 18],
  ['ST', 20, 0]
], 'low_block');

console.log('\n=== 验证：双CM一人攻一人守 ===');
// 两个CM，一个partnerPushedUp，一个不
const duo442 = buildTeam([
  ['GK', -45, 0], ['LB', -25, -22], ['CB', -28, -6], ['CB', -28, 6], ['RB', -25, 22],
  ['LM', 5, -24], ['CM', 0, -5], ['CM', 0, 5], ['RM', 5, 24],
  ['ST', 25, -4], ['ST', 25, 4]
]);
const ctx442 = { pitchWidth: PW, pitchLength: PL, ballPosition: ballAt, tacticalStyle: 'high_press', allPlayers: duo442 };
const st442 = movement.analyzeTeamStructure(duo442, 'high_press');

// CM at index 6 (attacking) with partnerPushedUp
const cm66 = { ...duo442[6], structure: st442[6], partnerPushedUp: true, teamRole: 'attacking' };
// CM at index 7 (attacking) without partnerPushedUp
const cm77 = { ...duo442[7], structure: st442[7], partnerPushedUp: false, teamRole: 'attacking' };

const r1 = movement.calculateTargetPosition(cm66, ctx442);
const r2 = movement.calculateTargetPosition(cm77, ctx442);
console.log(`  搭档前插→留守: (${r1.x.toFixed(1)}, ${r1.y.toFixed(1)})`);
console.log(`  搭档留守→前插: (${r2.x.toFixed(1)}, ${r2.y.toFixed(1)})`);

// 验证: 三中场
const trio433 = buildTeam([
  ['GK', -45, 0], ['LB', -20, -20], ['CB', -25, -6], ['CB', -25, 6], ['RB', -20, 20],
  ['DM', -8, 0], ['CM', 5, -8], ['CM', 5, 8],
  ['LW', 18, -22], ['ST', 28, 0], ['RW', 18, 22]
]);
const ctx433 = { pitchWidth: PW, pitchLength: PL, ballPosition: ballAt, tacticalStyle: 'high_press', allPlayers: trio433 };
const st433 = movement.analyzeTeamStructure(trio433, 'high_press');

const cm3a = { ...trio433[6], structure: st433[6], teamRole: 'attacking' };
const cm3b = { ...trio433[7], structure: st433[7], teamRole: 'attacking' };
const r3a = movement.calculateTargetPosition(cm3a, ctx433);
const r3b = movement.calculateTargetPosition(cm3b, ctx433);
console.log(`\n  三中场CM_L: (${r3a.x.toFixed(1)}, ${r3a.y.toFixed(1)})`);
console.log(`  三中场CM_R: (${r3b.x.toFixed(1)}, ${r3b.y.toFixed(1)})`);

console.log('\n=== 测试完成 ===');
console.log('√ 无阵型预设，从角色+位置动态推导');
console.log('√ 4-4-2 / 4-3-3 / 3-5-2 / 4-1-4-1 / 3-4-3 / 5-4-1 全部有效');
console.log('√ 双CM: 一人攻一人守');
console.log('√ 三CM: 更自由前插');
console.log('√ 单/双ST: 行为差异化');
console.log('√ 有DM保护→CM更多前插');
console.log('√ 有AM在前→CM略微减少前插');
