# -*- coding: utf-8 -*-
"""分析 football-data.co.uk 五大联赛CSV数据，提取统计汇总"""
import csv, os, json, math

DATA_DIR = r"c:\Users\admin\.trae-cn\work\6a291dd73a6e4bdd52475c1a\data"

LEAGUES = {
    "E0": "英超 Premiership 2024/25",
    "D1": "德甲 Bundesliga 2024/25",
    "I1": "意甲 Serie A 2024/25",
    "SP1": "西甲 La Liga 2024/25",
    "F1": "法甲 Ligue 1 2024/25",
}

def analyze_csv(filepath, league_name):
    rows = []
    with open(filepath, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    
    n = len(rows)
    if n == 0:
        return None
    
    # Aggregate stats (HS=home shots, HST=shots on target, etc.)
    def s(val):
        try: return int(val)
        except: return 0
    
    total_hs = sum(s(r.get("HS", 0)) for r in rows)
    total_as = sum(s(r.get("AS", 0)) for r in rows)
    total_hst = sum(s(r.get("HST", 0)) for r in rows)
    total_ast = sum(s(r.get("AST", 0)) for r in rows)
    total_hf = sum(s(r.get("HF", 0)) for r in rows)
    total_af = sum(s(r.get("AF", 0)) for r in rows)
    total_hc = sum(s(r.get("HC", 0)) for r in rows)
    total_ac = sum(s(r.get("AC", 0)) for r in rows)
    total_hy = sum(s(r.get("HY", 0)) for r in rows)
    total_ay = sum(s(r.get("AY", 0)) for r in rows)
    total_hr = sum(s(r.get("HR", 0)) for r in rows)
    total_ar = sum(s(r.get("AR", 0)) for r in rows)
    
    total_shots = total_hs + total_as
    total_sot = total_hst + total_ast
    total_fouls = total_hf + total_af
    total_corners = total_hc + total_ac
    total_yc = total_hy + total_ay
    total_rc = total_hr + total_ar
    
    # Goals
    total_hg = sum(s(r.get("FTHG", 0)) for r in rows)
    total_ag = sum(s(r.get("FTAG", 0)) for r in rows)
    total_goals = total_hg + total_ag
    
    # Per match averages
    return {
        "league": league_name,
        "matches": n,
        "goals": {
            "total": total_goals,
            "per_match": round(total_goals / n, 2),
            "per_team_match": round(total_goals / n / 2, 2),
        },
        "shots": {
            "total": total_shots,
            "per_match": round(total_shots / n, 2),
            "per_team_match": round(total_shots / n / 2, 2),
        },
        "shots_on_target": {
            "total": total_sot,
            "per_match": round(total_sot / n, 2),
            "accuracy": round(total_sot / total_shots * 100, 1) if total_shots > 0 else 0,
        },
        "conversion": {
            "shots_to_goal": round(total_goals / total_shots * 100, 1) if total_shots > 0 else 0,
            "sot_to_goal": round(total_goals / total_sot * 100, 1) if total_sot > 0 else 0,
        },
        "fouls": {
            "total": total_fouls,
            "per_match": round(total_fouls / n, 2),
        },
        "corners": {
            "total": total_corners,
            "per_match": round(total_corners / n, 2),
        },
        "cards": {
            "yellow_per_match": round(total_yc / n, 2),
            "red_per_match": round(total_rc / n, 2),
        },
        # Distribution analysis
        "score_distribution": {},
        "home_win_pct": 0,
        "draw_pct": 0,
    }

# Analyze all leagues
all_results = {}
for code, name in LEAGUES.items():
    path = os.path.join(DATA_DIR, f"{code}_2425.csv")
    if not os.path.exists(path):
        print(f"  SKIP {name} (no file)")
        continue
    result = analyze_csv(path, name)
    if result:
        all_results[code] = result
        print(f"  OK  {name}: {result['matches']} matches")

# Print summary
print("\n" + "=" * 70)
print("五大联赛 2024/25 赛季 数据汇总")
print("=" * 70)

for code, r in all_results.items():
    print(f"\n--- {r['league']} ({r['matches']}场) ---")
    g = r['goals']
    s = r['shots']
    sot = r['shots_on_target']
    c = r['conversion']
    print(f"  场均进球: {g['per_match']:.2f} | 场均射门: {s['per_match']:.1f} | 射正率: {sot['accuracy']:.1f}%")
    print(f"  射门转化率: {c['shots_to_goal']:.1f}% | 射正→进球: {c['sot_to_goal']:.1f}%")
    print(f"  场均犯规: {r['fouls']['per_match']:.1f} | 场均角球: {r['corners']['per_match']:.1f}")
    print(f"  场均黄牌: {r['cards']['yellow_per_match']:.2f}")

# Compute league averages across all
print("\n" + "-" * 40)
print("五大联赛均值:")
all_g = [r['goals']['per_match'] for r in all_results.values()]
all_s = [r['shots']['per_match'] for r in all_results.values()]
all_sot_acc = [r['shots_on_target']['accuracy'] for r in all_results.values()]
all_conv = [r['conversion']['shots_to_goal'] for r in all_results.values()]
all_fouls = [r['fouls']['per_match'] for r in all_results.values()]
all_corners = [r['corners']['per_match'] for r in all_results.values()]

print(f"  场均进球: {sum(all_g)/len(all_g):.2f} (范围 {min(all_g):.2f}-{max(all_g):.2f})")
print(f"  场均射门: {sum(all_s)/len(all_s):.1f} (范围 {min(all_s):.1f}-{max(all_s):.1f})")
print(f"  射正率: {sum(all_sot_acc)/len(all_sot_acc):.1f}%")
print(f"  射门→进球转化率: {sum(all_conv)/len(all_conv):.1f}%")
print(f"  场均犯规: {sum(all_fouls)/len(all_fouls):.1f}")
print(f"  场均角球: {sum(all_corners)/len(all_corners):.1f}")

# Save JSON
out_path = os.path.join(DATA_DIR, "five_leagues_summary.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(all_results, f, ensure_ascii=False, indent=2)
print(f"\n结果已保存: {out_path}")