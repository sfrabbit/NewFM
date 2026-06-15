/**
 * 禁区决策诊断：追踪每次BOX_A持球时 射门/传球/盘带 的分数和概率
 * 目的：看清楚谁在禁区持球，三个选项各得多少分，为什么盘带总是赢
 */
const { Rng } = require("./engine/rng");
const { Team, TacticalInstructions } = require("./engine/teams");
const { MatchEngine } = require("./engine/match");
const { buildContext, computeShootScore, computePassScore, computeDribbleScore } = require("./engine/situations");
const { getZoneV } = require("./engine/zones");

const rng = new Rng(42);
const home = new Team({
  name: "主", formation: "4-3-3",
  tactics: new TacticalInstructions({ defensive_line:1, pressing_intensity:2, default_tempo:1, compactness:1 }),
  eliteCount: 3, rng: new Rng(42)
});
const away = new Team({
  name: "客", formation: "4-4-2",
  tactics: new TacticalInstructions({ defensive_line:-1, pressing_intensity:-1, default_tempo:-1, compactness:2 }),
  eliteCount: 1, rng: new Rng(99)
});
const mx = new MatchEngine(home, away, 777);

// 挂载诊断
const origStep = mx.step.bind(mx);
let diagCount = 0;
mx.step = function() {
  const result = origStep();
  if (!result || !this.ball_zone) return result;
  const v = getZoneV(this.ball_zone);
  if (v !== "BOX_A") return result;

  const carrier = this._getCarrierPlayer();
  if (!carrier) return result;
  const role = carrier.role;
  if (!(/^(W_|IF_|ST_)/.test(role))) return result;

  const matchContext = {
    is_transition: this.is_transition,
    fatigue: carrier.fatigue || 0,
    setPiece: this.set_piece,
    realDefDist: this._ballDefDist(),
    realPressure: Math.max(0, Math.min(1, 1 - (this._ballDefDist() - 0.3) / 4.7)),
    stuckCount: this._stuckCounter,
  };
  const ctx = buildContext(this.ball_zone, this._defZones(), matchContext);
  const tactics = this._attTeam().tactics;

  const ss = computeShootScore(carrier.attrs, ctx, v, tactics, role);
  const ps = computePassScore(carrier.attrs, ctx, v, tactics, role);
  const ds = computeDribbleScore(carrier.attrs, ctx, v, false, role);

  const maxScore = Math.max(ss, ps, ds);
  const exps = [Math.exp(ss-maxScore), Math.exp(ps-maxScore), Math.exp(ds-maxScore)];
  const total = exps.reduce((a,b)=>a+b,0);
  const pS = exps[0]/total*100, pP = exps[1]/total*100, pD = exps[2]/total*100;

  if (diagCount < 20) {
    console.log("");
    console.log("[" + this.minute + "' " + role + "@" + this.ball_zone
      + " stuck=" + this._stuckCounter + " defDist=" + this._ballDefDist().toFixed(1) + "m"
      + " space=" + ctx.space.toFixed(1) + " press=" + ctx.pressure.toFixed(2) + "]");
    console.log("  attrs: conf=" + (carrier.attrs["自信"]||"?") + " power=" + (carrier.attrs["力量输出"]||"?")
      + " touch=" + (carrier.attrs["触球精度"]||"?") + " burst=" + (carrier.attrs["爆发"]||"?")
      + " speed=" + (carrier.attrs["速度"]||"?") + " control=" + (carrier.attrs["控制技巧"]||"?"));
    console.log("  shoot=" + ss.toFixed(2) + "  pass=" + ps.toFixed(2) + "  dribble=" + ds.toFixed(2));
    console.log("  prob: shoot=" + pS.toFixed(0) + "% pass=" + pP.toFixed(0) + "% dribble=" + pD.toFixed(0) + "%");
    console.log("  actual: " + result.type);
    diagCount++;
  }

  return result;
};

mx.runMatch({ maxActions: 400, verbose: false });
console.log("");
console.log("=== " + diagCount + " decisions in BOX_A tracked ===");

// Summary: shoot/pass/dribble 平均分
if (diagCount === 0) console.log("No BOX_A decisions found in this match. Try more actions or different seed.");
