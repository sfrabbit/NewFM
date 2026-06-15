// REST API server with MySQL-backed persistence.
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const {
  ROLE_POSITION_NAMES, QUALITY_TIERS, GK_ATTR_MAP, ALL_ATTRS,
  createPlayer, SquadBuilder, mirrorZone,
  TacticalInstructions, Team, MatchEngine,
} = require("../engine");
const { ROLE_TEMPLATE_MAP } = require("../engine/presets");
const db = require("./persist");

function profileToRecord(pl) {
  return {
    name: pl.name,
    role: pl.role,
    role_name: pl.role_name,
    quality: pl.quality,
    is_gk: pl.role === "GK",
    attrs: { ...pl.attrs },
    attr_aliases: pl.role === "GK" ? { ...GK_ATTR_MAP } : {},
  };
}

function guessFormation(roles) {
  const startsWith = (r, pfx) => pfx.some(p => r.startsWith(p));
  let cb = 0, fb = 0, dm = 0, cm = 0, w = 0, st = 0;
  for (const r of roles) {
    if (r.startsWith("CB_")) cb++;
    else if (startsWith(r, ["FB_","WB_"])) fb++;
    else if (r.startsWith("DM_")) dm++;
    else if (startsWith(r, ["CM_","AM_"])) cm++;
    else if (startsWith(r, ["W_","IF_"])) w++;
    else if (r.startsWith("ST_")) st++;
  }
  const defC = cb + fb + dm;
  const midC = cm;
  const fwdC = w + st;
  return midC ? `${defC}-${midC}-${fwdC}` : `${defC}-${fwdC}`;
}

async function buildTeam(name, ids, tacticsData) {
  const t = new TacticalInstructions({
    defensive_line: tacticsData.defensive_line || 0,
    pressing_intensity: tacticsData.pressing || 0,
    default_tempo: tacticsData.tempo || 0,
    compactness: tacticsData.compactness || 0,
    attacking_width: tacticsData.width || 0,
  });

  const all = await db.listPlayers();
  const selected = [];
  for (const id of ids) {
    const p = all.find(pl => String(pl.id) === String(id));
    if (p) selected.push(p);
  }
  if (selected.length < 1) {
    const sb = new SquadBuilder(name);
    const sq = sb.generateFullSquad("starter", 2);
    const starters = sb.getStarting11();
    const playersData = starters.map(p => ({
      pid: p.pid, name: p.name, role: p.role,
      attrs: p.attrs, quality: p.quality,
    }));
    const formation = tacticsData.formation || guessFormation(playersData.map(p => p.role));
    return new Team({ name, formation, tactics: t, playersData });
  }
  const formation = tacticsData.formation || guessFormation(selected.slice(0, 11).map(p => p.role));
  const playersData = selected.slice(0, 11).map(p => ({
    pid: p.id, name: p.name, role: p.role,
    attrs: p.attrs, quality: p.quality,
  }));
  return new Team({ name, formation, tactics: t, playersData });
}

function sendJson(res, code, data) {
  const body = Buffer.from(JSON.stringify(data), "utf-8");
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function send404(res) { sendJson(res, 404, { error: "not found" }); }

async function serveFile(res, fp, ctype) {
  try {
    const buf = await fs.promises.readFile(fp);
    res.writeHead(200, {
      "Content-Type": `${ctype}; charset=utf-8`,
      "Content-Length": buf.length,
      "Cache-Control": "no-cache",
    });
    res.end(buf);
  } catch (_) {
    send404(res);
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (_) { resolve({}); }
    });
  });
}

async function handle(req, res) {
  const { pathname } = url.parse(req.url);
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") { sendJson(res, 204, {}); return; }
  if (method === "HEAD") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end();
    return;
  }

  if (method === "GET") {
    if (pathname === "/") {
      return await serveFile(res, path.join(__dirname, "..", "public", "admin.html"), "text/html");
    }
    if (pathname === "/match-classic") {
      return await serveFile(res, path.join(__dirname, "..", "public", "index.html"), "text/html");
    }
    if (pathname === "/api/players") {
      const list = await db.listPlayers();
      return sendJson(res, 200, list);
    }
    if (pathname.startsWith("/api/players/")) {
      const pid = pathname.split("/").pop();
      const pl = await db.getPlayer(pid);
      return pl ? sendJson(res, 200, pl) : sendJson(res, 404, {});
    }
    if (pathname === "/api/roles") {
      const r = Object.entries(ROLE_POSITION_NAMES).map(([role, name]) => ({
        role, name, template: ROLE_TEMPLATE_MAP[role] || "CM",
      }));
      return sendJson(res, 200, r);
    }
    if (pathname === "/api/qualities") {
      const q = {};
      for (const [k, v] of Object.entries(QUALITY_TIERS)) q[k] = v.label;
      return sendJson(res, 200, q);
    }
    return send404(res);
  }

  if (method === "POST") {
    const data = await readBody(req);
    if (pathname === "/api/players/generate") {
      const role = data.role || "ST_C";
      const quality = data.quality || "starter";
      const name = data.name || `球员_${Date.now() % 100000}`;
      const seed = data.seed || Math.floor(Math.random() * 99999) + 1;
      const pl = createPlayer(name, role, quality, seed);
      const saved = await db.insertPlayer(profileToRecord(pl));
      return sendJson(res, 201, saved);
    }
    if (pathname === "/api/players/generate_squad") {
      const name = data.name || "新球队";
      const quality = data.quality || "starter";
      const starCount = data.star_count || 2;
      const seed = Math.floor(Math.random() * 99999) + 1;
      const sb = new SquadBuilder(name, seed);
      const squad = sb.generateFullSquad(quality, starCount);
      const created = [];
      for (const pl of squad) {
        const saved = await db.insertPlayer(profileToRecord(pl));
        created.push(saved);
      }
      return sendJson(res, 201, created);
    }
    if (pathname === "/api/match/simulate") {
      const home = await buildTeam("主队", data.home_players || [], data.home_tactics || {});
      const away = await buildTeam("客队", data.away_players || [], data.away_tactics || {});
      const seed = data.seed || 42;
      const engine = new MatchEngine(home, away, seed);
      let summary;
      try {
        summary = engine.runMatch({ maxTicks: 6300, verbose: false });
      } catch (e) {
        return sendJson(res, 500, {
          error: String(e), stack: e && e.stack,
          events: [], summary: null,
        });
      }
      const events = (engine.events || [])
        .filter(ev => ev && ev.desc)
        .map(ev => ({
          sid: ev.sid || null, aid: ev.aid || null,
          time: ev.minute, text: ev.desc, team: ev.team || null,
          success: ev.success || false,
          tags: ev.tags || [],
          zone: (ev.carrier_side === 'away' && ev.zone) ? mirrorZone(ev.zone) : (ev.zone || null),
          carrier_pid: ev.carrier_pid || null,
          carrier_side: ev.carrier_side || null,
          positions: ev.positions || null,
        }));
      summary.events = events;
      return sendJson(res, 200, { events, summary, score: summary.score });
    }
    if (pathname === "/api/players/reset") {
      await db.resetAll();
      return sendJson(res, 200, { ok: true, count: 0 });
    }
    return send404(res);
  }

  if (method === "PUT") {
    if (!pathname.startsWith("/api/players/")) return send404(res);
    const pid = pathname.split("/").pop();
    const data = await readBody(req);
    const pl = await db.getPlayer(pid);
    if (!pl) return send404(res);
    const patch = {};
    if (data.name) patch.name = data.name;
    if (data.quality) patch.quality = data.quality;
    if (data.role) {
      patch.role = data.role;
      patch.role_name = ROLE_POSITION_NAMES[data.role] || data.role;
      patch.is_gk = data.role === "GK";
      patch.attr_aliases = data.role === "GK" ? { ...GK_ATTR_MAP } : {};
    }
    if (data.attrs) {
      const newAttrs = { ...pl.attrs };
      for (const [k, v] of Object.entries(data.attrs)) {
        if (ALL_ATTRS.includes(k)) {
          newAttrs[k] = Math.max(1, Math.min(20, parseInt(v, 10) || 10));
        }
      }
      patch.attrs = newAttrs;
    }
    const updated = await db.updatePlayer(pid, patch);
    return sendJson(res, 200, updated);
  }

  if (method === "DELETE") {
    if (!pathname.startsWith("/api/players/")) return send404(res);
    const pid = pathname.split("/").pop();
    const ok = await db.deletePlayer(pid);
    return ok ? sendJson(res, 200, { ok: true }) : send404(res);
  }

  send404(res);
}

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = "0.0.0.0";

(async () => {
  try {
    await db.migrate();
    console.log("[db] migration OK");
  } catch (e) {
    console.error("[db] migration failed:", e.message);
  }
  const server = http.createServer((req, res) => {
    handle(req, res).catch(err => {
      try { sendJson(res, 500, { error: String(err), stack: err && err.stack }); }
      catch (_) { /* socket gone */ }
    });
  });
  server.listen(PORT, HOST, () => {
    console.log(`⚽ Football Manager server listening on http://${HOST}:${PORT}`);
  });
})();
