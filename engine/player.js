// Player profile + squad generation. Mirrors player_module.py.
const { ALL_ATTRS, GK_ATTR_MAP, QUALITY_TIERS, ROLE_POSITION_NAMES } = require("./constants");
const { POSITION_TEMPLATES, ROLE_TEMPLATE_MAP, SQUAD_TEMPLATE } = require("./presets");
const { Rng } = require("./rng");

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

module.exports = {
  PlayerProfile,
  generatePlayerAttrs,
  createPlayer,
  downgradeQuality,
  SquadBuilder,
};
