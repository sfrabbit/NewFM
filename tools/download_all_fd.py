# -*- coding: utf-8 -*-
"""批量下载 football-data.co.uk 所有可用联赛和赛季的 CSV 数据"""
import requests, os, time, sys

DATA_DIR = r"c:\Users\admin\.trae-cn\work\6a291dd73a6e4bdd52475c1a\data"
os.makedirs(DATA_DIR, exist_ok=True)

# 所有已知联赛代码 → 名称
LEAGUES = {
    "E0": "英超 Premiership",
    "E1": "英冠 Championship",
    "E2": "英甲 League 1",
    "E3": "英乙 League 2",
    "EC": "英议联 Conference",
    "D1": "德甲 Bundesliga",
    "D2": "德乙 Bundesliga 2",
    "I1": "意甲 Serie A",
    "I2": "意乙 Serie B",
    "SP1": "西甲 La Liga",
    "SP2": "西乙 Segunda",
    "F1": "法甲 Ligue 1",
    "F2": "法乙 Ligue 2",
    "N1": "荷甲 Eredivisie",
    "B1": "比甲 Pro League",
    "P1": "葡超 Primeira Liga",
    "T1": "土超 Super Lig",
    "G1": "希超 Super League",
    "SC0": "苏超 Premiership",
    "SC1": "苏冠 Championship",
}

# 赛季代码（从21-22到24-25）
SEASONS = [
    ("1112", "2011/12"), ("1213", "2012/13"), ("1314", "2013/14"),
    ("1415", "2014/15"), ("1516", "2015/16"), ("1617", "2016/17"),
    ("1718", "2017/18"), ("1819", "2018/19"), ("1920", "2019/20"),
    ("2021", "2020/21"), ("2122", "2021/22"), ("2223", "2022/23"),
    ("2324", "2023/24"), ("2425", "2024/25"), ("2526", "2025/26"),
]

BASE_URL = "https://www.football-data.co.uk/mmz4281/{season}/{league}.csv"

success_count = 0
fail_count = 0
all_files = []

for code, name in LEAGUES.items():
    for scode, season_name in SEASONS:
        url = BASE_URL.format(season=scode, league=code)
        filename = f"{code}_{season_name.replace('/', '-')}.csv"
        filepath = os.path.join(DATA_DIR, filename)

        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            if size > 200:
                all_files.append({"file": filename, "league": name, "season": season_name, "size": size})
                success_count += 1
                continue  # skip existing

        try:
            resp = requests.get(url, timeout=20)
            if resp.status_code == 200 and len(resp.text) > 100:
                with open(filepath, "w", encoding="utf-8-sig") as f:
                    f.write(resp.text)
                size = os.path.getsize(filepath)
                if size > 200:
                    all_files.append({"file": filename, "league": name, "season": season_name, "size": size})
                    success_count += 1
                    print(f"  OK   {filename} ({size:,} bytes)")
                else:
                    os.remove(filepath)
                    fail_count += 1
            else:
                fail_count += 1
        except Exception as e:
            fail_count += 1

        time.sleep(0.15)  # be polite

print(f"\n{'='*60}")
print(f"下载完成: {success_count} 成功, {fail_count} 失败")
print(f"数据目录: {DATA_DIR}")
print(f"\n各联赛文件统计:")

from collections import defaultdict
by_league = defaultdict(list)
for f in all_files:
    by_league[f['league']].append(f['season'])

for league, seasons in sorted(by_league.items()):
    print(f"  {league}: {len(seasons)}个赛季 - {', '.join(seasons[:3])}...")
