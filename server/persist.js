// MySQL-backed persistence for players (TiDB on Mule Pages).
// Falls back to in-memory store when DATABASE_URL is absent.
const mysql = require("mysql2/promise");

const url = process.env.DATABASE_URL;
let pool = null;

// ── In-memory fallback ──────────────────────────────────────────
let _memNextId = 1;
const _memStore = new Map();

function _memInsert(p) {
  const id = String(_memNextId++);
  const rec = { ...p, id };
  _memStore.set(id, rec);
  return rec;
}

(async () => {
  if (!url) {
    console.warn("[persist] DATABASE_URL not set — using in-memory store");
    return;
  }
  pool = mysql.createPool(url);
})();

async function migrate() {
  if (!pool) return;
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      name         VARCHAR(120) NOT NULL,
      role         VARCHAR(16)  NOT NULL,
      role_name    VARCHAR(64)  NOT NULL,
      quality      VARCHAR(16)  NOT NULL,
      is_gk        TINYINT(1)   NOT NULL DEFAULT 0,
      attrs        JSON         NOT NULL,
      attr_aliases JSON         NOT NULL,
      created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function rowToPlayer(r) {
  return {
    id: String(r.id),
    name: r.name,
    role: r.role,
    role_name: r.role_name,
    quality: r.quality,
    is_gk: !!r.is_gk,
    attrs: typeof r.attrs === "string" ? JSON.parse(r.attrs) : r.attrs,
    attr_aliases: typeof r.attr_aliases === "string" ? JSON.parse(r.attr_aliases) : r.attr_aliases,
  };
}

async function listPlayers() {
  if (!pool) return [..._memStore.values()];
  const [rows] = await pool.execute("SELECT * FROM players ORDER BY id ASC");
  return rows.map(rowToPlayer);
}

async function getPlayer(id) {
  if (!pool) return _memStore.get(String(id)) || null;
  const [rows] = await pool.execute("SELECT * FROM players WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? rowToPlayer(rows[0]) : null;
}

async function insertPlayer(p) {
  if (!pool) return _memInsert(p);
  const [r] = await pool.execute(
    `INSERT INTO players (name, role, role_name, quality, is_gk, attrs, attr_aliases)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      p.name, p.role, p.role_name, p.quality,
      p.is_gk ? 1 : 0,
      JSON.stringify(p.attrs || {}),
      JSON.stringify(p.attr_aliases || {}),
    ]
  );
  return { ...p, id: String(r.insertId) };
}

async function updatePlayer(id, patch) {
  if (!pool) {
    const rec = _memStore.get(String(id));
    if (!rec) return null;
    Object.assign(rec, patch);
    return rec;
  }
  const fields = [];
  const vals = [];
  if (patch.name !== undefined)         { fields.push("name=?");         vals.push(patch.name); }
  if (patch.role !== undefined)         { fields.push("role=?");         vals.push(patch.role); }
  if (patch.role_name !== undefined)    { fields.push("role_name=?");    vals.push(patch.role_name); }
  if (patch.quality !== undefined)      { fields.push("quality=?");      vals.push(patch.quality); }
  if (patch.is_gk !== undefined)        { fields.push("is_gk=?");        vals.push(patch.is_gk ? 1 : 0); }
  if (patch.attrs !== undefined)        { fields.push("attrs=?");        vals.push(JSON.stringify(patch.attrs)); }
  if (patch.attr_aliases !== undefined) { fields.push("attr_aliases=?"); vals.push(JSON.stringify(patch.attr_aliases)); }
  if (!fields.length) return getPlayer(id);
  vals.push(id);
  await pool.execute(`UPDATE players SET ${fields.join(", ")} WHERE id=?`, vals);
  return getPlayer(id);
}

async function deletePlayer(id) {
  if (!pool) return _memStore.delete(String(id));
  const [r] = await pool.execute("DELETE FROM players WHERE id=?", [id]);
  return r.affectedRows > 0;
}

async function resetAll() {
  if (!pool) { _memStore.clear(); _memNextId = 1; return; }
  await pool.execute("DELETE FROM players");
  try { await pool.execute("ALTER TABLE players AUTO_INCREMENT = 1"); } catch (_) {}
}

module.exports = {
  migrate, listPlayers, getPlayer,
  insertPlayer, updatePlayer, deletePlayer, resetAll,
};
