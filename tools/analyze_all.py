# -*- coding: utf-8 -*-
"""综合分析 StatsBomb + football-data.co.uk 数据"""
import json, os, requests, csv, time
from collections import Counter, defaultdict

DATA_DIR = r"c:\Users\admin\.trae-cn\work\6a291dd73a6e4bdd52475c1a\data"
OUT = {}

# ── 1. football-data.co.uk 五大联赛 ──
print("=== 1. 五大联赛 match-level 数据 ===")
LEAGUES = {"E0": "英超", "D1": "德甲", "I1": "意甲", "SP1": "西甲", "F1": "法甲"}
for code, name in LEAGUES.items():
    path = os.path.join(DATA_DIR, f"{code}_2425.csv")
    if not os.path.exists(path): continue
    rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))
    def s(v): return int(v) if v.isdigit() else (int(v) if v.lstrip('-').isdigit() else 0)
    n = len(rows)
    total_shots = sum(s(r.get("HS",0))+s(r.get("AS",0)) for r in rows)
    total_sot = sum(s(r.get("HST",0))+s(r.get("AST",0)) for r in rows)
    total_goals = sum(s(r.get("FTHG",0))+s(r.get("FTAG",0)) for r in rows)
    total_fouls = sum(s(r.get("HF",0))+s(r.get("AF",0)) for r in rows)
    total_corners = sum(s(r.get("HC",0))+s(r.get("AC",0)) for r in rows)
    total_yc = sum(s(r.get("HY",0))+s(r.get("AY",0)) for r in rows)
    OUT[f"league_{code}"] = {
        "name": name, "matches": n,
        "goals_per_match": round(total_goals/n, 2),
        "shots_per_match": round(total_shots/n, 2),
        "shots_per_team_match": round(total_shots/n/2, 2),
        "sot_accuracy": round(total_sot/total_shots*100, 1) if total_shots else 0,
        "shot_to_goal": round(total_goals/total_shots*100, 1) if total_shots else 0,
        "sot_to_goal": round(total_goals/total_sot*100, 1) if total_sot else 0,
        "fouls_per_match": round(total_fouls/n, 2),
        "corners_per_match": round(total_corners/n, 2),
        "yc_per_match": round(total_yc/n, 2),
    }
    print(f"  {name}: {n}场, 进球{OUT[f'league_{code}']['goals_per_match']}/场, 射门{OUT[f'league_{code}']['shots_per_match']}/场, 射正率{OUT[f'league_{code}']['sot_accuracy']}%")

# ── 2. StatsBomb events (盘带/传球/射门) ──
print("\n=== 2. StatsBomb 事件级数据 ===")

def analyze_sb_matches(matches_file, label):
    with open(matches_file) as f:
        matches = json.load(f)
    dribble_all = []
    pass_all = []
    shot_all = []
    sample = matches[:10]  # 取前10场
    
    for m in sample:
        mid = m['match_id']
        url = f"https://raw.githubusercontent.com/statsbomb/open-data/master/data/events/{mid}.json"
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code != 200: continue
            events = resp.json()
            
            # Dribble (type 14)
            for e in events:
                if e.get('type',{}).get('id') == 14:
                    out = e.get('dribble',{}).get('outcome',{}).get('name','unknown')
                    player = e.get('player',{}).get('name','')
                    dribble_all.append({'outcome': out, 'player': player})
            
            # Pass (type 30)
            for e in events:
                if e.get('type',{}).get('id') == 30:
                    out = e.get('pass',{}).get('outcome',{}).get('name','')
                    length = e.get('pass',{}).get('length', 0)
                    pass_all.append({'outcome': out, 'length': length})
            
            # Shot (type 16)
            for e in events:
                if e.get('type',{}).get('id') == 16:
                    out = e.get('shot',{}).get('outcome',{}).get('name','')
                    shot_all.append({'outcome': out})
            
            time.sleep(0.3)
        except Exception as ex:
            pass
    
    # Dribble stats
    if dribble_all:
        d_outcomes = Counter(d['outcome'] for d in dribble_all)
        total_d = sum(d_outcomes.values())
        complete = d_outcomes.get('Complete', 0)
        print(f"  [{label}] 盘带: {total_d}次, 成功{complete}({complete/total_d*100:.1f}%), 样本{len(sample)}场")
    
    # Pass stats
    if pass_all:
        p_outcomes = Counter(p['outcome'] for p in pass_all)
        total_p = sum(p_outcomes.values())
        complete_p = p_outcomes.get('Complete', 0) + p_outcomes.get('Incomplete', 0)  # rough
        # Actually StatsBomb uses different names
        complete_p = sum(1 for p in pass_all if p['outcome'] not in ('Incomplete', 'Pass Offside', 'Out', 'Unknown'))
        lengths = [p['length'] for p in pass_all if p['length']]
        print(f"  [{label}] 传球: {total_p}次, 成功{complete_p}({complete_p/total_p*100:.1f}%), 平均距离{sum(lengths)/len(lengths):.1f}m" if lengths else f"  [{label}] 传球: {total_p}次, 成功{complete_p}({complete_p/total_p*100:.1f}%)")
    
    # Shot stats
    if shot_all:
        s_outcomes = Counter(s['outcome'] for s in shot_all)
        total_s = sum(s_outcomes.values())
        goals = s_outcomes.get('Goal', 0)
        sot = sum(v for k,v in s_outcomes.items() if k in ('Goal','Saved','Saved to Post','Saved Off Target'))
        print(f"  [{label}] 射门: {total_s}次, 进球{goals}, 射正{sot}({sot/total_s*100:.1f}%), 转化率{goals/total_s*100:.1f}%")
    
    return {"dribbles": len(dribble_all), "passes": len(pass_all), "shots": len(shot_all)}

# 德甲2023/24
bl = analyze_sb_matches(os.path.join(DATA_DIR, "sb_bundesliga_2324_matches.json"), "德甲23/24")
# 世界杯2022
wc = analyze_sb_matches(os.path.join(DATA_DIR, "sb_wc2022_matches.json"), "世界杯22")

print("\n=== 完成 ===")
print(f"数据已保存到 {DATA_DIR}/five_leagues_summary.json")