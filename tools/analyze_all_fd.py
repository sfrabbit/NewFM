# -*- coding: utf-8 -*-
"""分析所有 football-data.co.uk CSV，生成综合统计报告"""
import csv, os, json, glob
from collections import defaultdict

DATA_DIR = r"c:\Users\admin\.trae-cn\work\6a291dd73a6e4bdd52475c1a\data"
OUT_DIR = r"c:\Users\admin\.trae-cn\work\6a291dd73a6e4bdd52475c1a\data\analysis"
os.makedirs(OUT_DIR, exist_ok=True)

def parse_csv(filepath):
    """解析单个CSV文件"""
    rows = []
    with open(filepath, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows

def safe_int(val):
    try:
        return int(val) if val and val.strip() else 0
    except:
        return 0

def analyze_file(filepath):
    """分析单个文件，返回统计"""
    rows = parse_csv(filepath)
    if not rows:
        return None
    
    n = len(rows)
    
    # 基础统计
    total_hs = sum(safe_int(r.get("HS", 0)) for r in rows)
    total_as = sum(safe_int(r.get("AS", 0)) for r in rows)
    total_hst = sum(safe_int(r.get("HST", 0)) for r in rows)
    total_ast = sum(safe_int(r.get("AST", 0)) for r in rows)
    total_hg = sum(safe_int(r.get("FTHG", 0)) for r in rows)
    total_ag = sum(safe_int(r.get("FTAG", 0)) for r in rows)
    total_hf = sum(safe_int(r.get("HF", 0)) for r in rows)
    total_af = sum(safe_int(r.get("AF", 0)) for r in rows)
    total_hc = sum(safe_int(r.get("HC", 0)) for r in rows)
    total_ac = sum(safe_int(r.get("AC", 0)) for r in rows)
    total_hy = sum(safe_int(r.get("HY", 0)) for r in rows)
    total_ay = sum(safe_int(r.get("AY", 0)) for r in rows)
    
    total_shots = total_hs + total_as
    total_sot = total_hst + total_ast
    total_goals = total_hg + total_ag
    total_fouls = total_hf + total_af
    total_corners = total_hc + total_ac
    total_yc = total_hy + total_ay
    
    return {
        "matches": n,
        "goals_per_match": round(total_goals / n, 2) if n > 0 else 0,
        "shots_per_match": round(total_shots / n, 2) if n > 0 else 0,
        "shots_per_team": round(total_shots / n / 2, 2) if n > 0 else 0,
        "sot_accuracy": round(total_sot / total_shots * 100, 1) if total_shots > 0 else 0,
        "shot_to_goal": round(total_goals / total_shots * 100, 1) if total_shots > 0 else 0,
        "sot_to_goal": round(total_goals / total_sot * 100, 1) if total_sot > 0 else 0,
        "fouls_per_match": round(total_fouls / n, 2) if n > 0 else 0,
        "corners_per_match": round(total_corners / n, 2) if n > 0 else 0,
        "yc_per_match": round(total_yc / n, 2) if n > 0 else 0,
    }

# 获取所有CSV文件
all_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
print(f"发现 {len(all_files)} 个CSV文件")

# 按联赛分组统计
by_league = defaultdict(list)
by_season = defaultdict(list)

for filepath in all_files:
    filename = os.path.basename(filepath)
    # 解析文件名: E0_2024-25.csv
    parts = filename.replace(".csv", "").split("_")
    if len(parts) != 2:
        continue
    league_code, season = parts
    
    result = analyze_file(filepath)
    if result:
        result["file"] = filename
        result["league"] = league_code
        result["season"] = season
        by_league[league_code].append(result)
        by_season[season].append(result)

# 生成联赛汇总
league_summary = {}
for league, files in sorted(by_league.items()):
    total_matches = sum(f["matches"] for f in files)
    avg_goals = sum(f["goals_per_match"] * f["matches"] for f in files) / total_matches if total_matches > 0 else 0
    avg_shots = sum(f["shots_per_match"] * f["matches"] for f in files) / total_matches if total_matches > 0 else 0
    avg_sot_acc = sum(f["sot_accuracy"] * f["matches"] for f in files) / total_matches if total_matches > 0 else 0
    avg_conv = sum(f["shot_to_goal"] * f["matches"] for f in files) / total_matches if total_matches > 0 else 0
    
    league_summary[league] = {
        "files": len(files),
        "total_matches": total_matches,
        "avg_goals_per_match": round(avg_goals, 2),
        "avg_shots_per_match": round(avg_shots, 2),
        "avg_sot_accuracy": round(avg_sot_acc, 1),
        "avg_conversion": round(avg_conv, 1),
    }

# 生成赛季汇总
season_summary = {}
for season, files in sorted(by_season.items()):
    total_matches = sum(f["matches"] for f in files)
    avg_goals = sum(f["goals_per_match"] * f["matches"] for f in files) / total_matches if total_matches > 0 else 0
    
    season_summary[season] = {
        "files": len(files),
        "total_matches": total_matches,
        "avg_goals_per_match": round(avg_goals, 2),
    }

# 保存结果
output = {
    "total_files": len(all_files),
    "leagues": len(by_league),
    "seasons": len(by_season),
    "by_league": league_summary,
    "by_season": season_summary,
    "all_files": [f for league in by_league.values() for f in league],
}

with open(os.path.join(OUT_DIR, "fd_summary.json"), "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

# 打印摘要
print("\n" + "=" * 70)
print("football-data.co.uk 数据汇总")
print("=" * 70)
print(f"\n总文件数: {len(all_files)}")
print(f"联赛数: {len(by_league)}")
print(f"赛季数: {len(by_season)}")

print("\n各联赛统计:")
for league, stats in sorted(league_summary.items()):
    print(f"  {league}: {stats['total_matches']}场, 进球{stats['avg_goals_per_match']}/场, 射门{stats['avg_shots_per_match']}/场, 射正{stats['avg_sot_accuracy']}%, 转化{stats['avg_conversion']}%")

print("\n各赛季统计:")
for season, stats in sorted(season_summary.items()):
    print(f"  {season}: {stats['total_matches']}场, 进球{stats['avg_goals_per_match']}/场")

print(f"\n结果已保存: {OUT_DIR}/fd_summary.json")
