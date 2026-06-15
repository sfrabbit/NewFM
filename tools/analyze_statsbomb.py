# -*- coding: utf-8 -*-
"""Analyze StatsBomb Open Data events for dribble statistics"""
import json, os, glob
from collections import Counter, defaultdict

DATA_DIR = r"c:\Users\admin\.trae-cn\work\6a291dd73a6e4bdd52475c1a\data"

# Load matches
with open(os.path.join(DATA_DIR, "sb_matches_44.json")) as f:
    matches = json.load(f)

print(f"Loaded {len(matches)} matches (competition 2, season 44 = 2003/04 Champions League)")

# Try to download a few event files
import requests
import time

# Pick 3 random matches
sample_matches = matches[:5]
event_data = []

for m in sample_matches:
    mid = m['match_id']
    url = f"https://raw.githubusercontent.com/statsbomb/open-data/master/data/events/{mid}.json"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            events = resp.json()
            event_data.append({"match_id": mid, "home": m['home_team']['home_team_name'], 
                              "away": m['away_team']['away_team_name'], "events": len(events)})
            print(f"  OK  Match {mid}: {m['home_team']['home_team_name']} vs {m['away_team']['away_team_name']} - {len(events)} events")
            
            # Count dribble-related events
            # StatsBomb event types: 14 = Dribble (Take-on)
            dribbles = [e for e in events if e.get('type', {}).get('id') == 14]
            if dribbles:
                outcomes = Counter()
                for d in dribbles:
                    out = d.get('dribble', {}).get('outcome', {}).get('name', 'unknown')
                    outcomes[out] += 1
                total_dribbles = sum(outcomes.values())
                complete = outcomes.get('Complete', 0)
                incomplete = outcomes.get('Incomplete', 0)
                success_rate = complete / total_dribbles * 100 if total_dribbles > 0 else 0
                print(f"    Dribbles: {total_dribbles} ({complete} complete, {incomplete} incomplete) = {success_rate:.1f}%")
            else:
                print(f"    No dribble events found")
        else:
            print(f"  FAIL Match {mid}: HTTP {resp.status_code}")
    except Exception as ex:
        print(f"  ERR  Match {mid}: {ex}")
    time.sleep(0.5)

# Summary
print("\n--- Summary ---")
print(f"Analyzed {len(event_data)} matches")
if event_data:
    total_ev = sum(d['events'] for d in event_data)
    print(f"Total events across matches: {total_ev}")
    print(f"Average events per match: {total_ev / len(event_data):.0f}")