# -*- coding: utf-8 -*-
"""批量下载 StatsBomb Open Data 所有赛事的 matches 和 events"""
import requests, json, os, time
from collections import defaultdict

DATA_DIR = r"c:\Users\admin\.trae-cn\work\6a291dd73a6e4bdd52475c1a\data\statsbomb"
MATCHES_DIR = os.path.join(DATA_DIR, "matches")
EVENTS_DIR = os.path.join(DATA_DIR, "events")
os.makedirs(MATCHES_DIR, exist_ok=True)
os.makedirs(EVENTS_DIR, exist_ok=True)

BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"

# 1. 下载 competitions.json
print("=== 1. 下载 competitions.json ===")
comp_url = f"{BASE_URL}/competitions.json"
resp = requests.get(comp_url, timeout=30)
if resp.status_code == 200:
    with open(os.path.join(DATA_DIR, "competitions.json"), "w", encoding="utf-8") as f:
        f.write(resp.text)
    competitions = json.loads(resp.text)
    print(f"  发现 {len(competitions)} 个赛事")
else:
    print(f"  失败: {resp.status_code}")
    competitions = []

# 2. 下载每个赛事的 matches
print("\n=== 2. 下载所有赛事的 matches ===")
all_matches = {}
total_matches = 0

for comp in competitions:
    cid = comp['competition_id']
    sid = comp['season_id']
    cname = comp.get('competition_name', 'Unknown')
    sname = comp.get('season_name', 'Unknown')
    
    # 只下载有公开数据的赛事
    match_url = f"{BASE_URL}/matches/{cid}/{sid}.json"
    try:
        resp = requests.get(match_url, timeout=30)
        if resp.status_code == 200:
            matches = json.loads(resp.text)
            filepath = os.path.join(MATCHES_DIR, f"{cid}_{sid}.json")
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(matches, f, ensure_ascii=False)
            all_matches[f"{cid}_{sid}"] = {
                "competition": cname,
                "season": sname,
                "matches": len(matches),
                "file": filepath
            }
            total_matches += len(matches)
            print(f"  OK  {cname} {sname}: {len(matches)} 场比赛")
        else:
            print(f"  SKIP {cname} {sname}: HTTP {resp.status_code}")
    except Exception as e:
        print(f"  ERR {cname} {sname}: {e}")
    time.sleep(0.2)

print(f"\n  总计: {len(all_matches)} 个赛事/赛季, {total_matches} 场比赛")

# 3. 下载 sample events（每个赛事取前3场）
print("\n=== 3. 下载 sample events（每个赛事前3场） ===")
event_count = 0
sample_size = 0

for key, info in all_matches.items():
    matches = json.load(open(info['file']))
    sample = matches[:3]  # 取前3场
    
    for m in sample:
        mid = m['match_id']
        event_url = f"{BASE_URL}/events/{mid}.json"
        try:
            resp = requests.get(event_url, timeout=30)
            if resp.status_code == 200:
                events = json.loads(resp.text)
                filepath = os.path.join(EVENTS_DIR, f"{mid}.json")
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(events, f, ensure_ascii=False)
                event_count += 1
                sample_size += len(events)
                print(f"    OK  Match {mid}: {len(events)} events")
            else:
                print(f"    SKIP Match {mid}: HTTP {resp.status_code}")
        except Exception as e:
            print(f"    ERR  Match {mid}: {e}")
        time.sleep(0.15)

print(f"\n  总计: {event_count} 场比赛的事件数据, {sample_size} 个事件")

# 4. 下载 lineups（每个赛事前3场）
print("\n=== 4. 下载 sample lineups ===")
LINEUPS_DIR = os.path.join(DATA_DIR, "lineups")
os.makedirs(LINEUPS_DIR, exist_ok=True)
lineup_count = 0

for key, info in all_matches.items():
    matches = json.load(open(info['file']))
    sample = matches[:3]
    
    for m in sample:
        mid = m['match_id']
        lineup_url = f"{BASE_URL}/lineups/{mid}.json"
        try:
            resp = requests.get(lineup_url, timeout=30)
            if resp.status_code == 200:
                filepath = os.path.join(LINEUPS_DIR, f"{mid}.json")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(resp.text)
                lineup_count += 1
                print(f"    OK  Match {mid} lineup")
            else:
                print(f"    SKIP Match {mid}: HTTP {resp.status_code}")
        except Exception as e:
            print(f"    ERR  Match {mid}: {e}")
        time.sleep(0.15)

print(f"\n  总计: {lineup_count} 场比赛的阵容数据")

# 5. 保存索引
print("\n=== 5. 保存数据索引 ===")
index = {
    "competitions": len(competitions),
    "match_files": len(all_matches),
    "total_matches": total_matches,
    "sample_events": event_count,
    "sample_lineups": lineup_count,
    "files": all_matches
}
with open(os.path.join(DATA_DIR, "index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print(f"\n{'='*60}")
print(f"StatsBomb 数据下载完成!")
print(f"  目录: {DATA_DIR}")
print(f"  赛事: {len(competitions)}")
print(f"  比赛文件: {len(all_matches)}")
print(f"  总比赛数: {total_matches}")
print(f"  事件样本: {event_count} 场")
print(f"  阵容样本: {lineup_count} 场")
