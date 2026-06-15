# 工作日志

> 足球战术引擎开发全过程记录
> 最后更新：2026-06-14

---

## 一、核心设计原则（已确立，不可违背）

1. **连续逻辑，禁止分类**：所有属性、距离、压力都是连续值，不做"短/中/长"或"精英/普通"分类
2. **物理现实优先**：公式结果必须对照真实数据校准
3. **数据先行**：调整公式前必须先找到现实数据，禁止凭空分析
4. **情境由动作类型定义，不由位置定义**
5. **6核心动作情境**：S01传球、S02盘带、S03射门、S04对抗、S05解围、S06门将扑救

---

## 二、项目结构

```
fm-tactical-engine/
├── engine/                  # 引擎核心（Node.js）
│   ├── constants.js         # 属性定义
│   ├── rng.js               # 随机数
│   ├── presets.js           # 位置模板
│   ├── zones.js             # 球场区域
│   ├── player.js            # 球员模型
│   ├── prob.js              # 概率计算
│   ├── actions.js           # 动作定义
│   ├── teams.js             # 球队模型
│   ├── situations.js        # 情境判断
│   ├── transitions.js       # 球权转换
│   ├── match.js             # 比赛引擎
│   ├── dribble_branches.js  # 盘带分支（最新版）
│   └── test_*.js            # 测试脚本
├── server/
│   ├── index.js             # REST API（端口8080）
│   └── persist.js           # 数据持久化（TiDB/内存）
├── public/
│   ├── admin.html           # 管理后台
│   ├── index.html           # 比赛观看
│   └── fm-engine.js         # 浏览器打包版
├── docs/
│   ├── WORK_LOG.md          # 本文档
│   └── reference_data.md    # 现实数据参考（从user_code_new同步）
├── tools/                   # 数据采集/分析脚本（Python）
└── data/                    # CSVs + StatsBomb JSONs（在temp目录）
```

---

## 三、已完成的公式校准

### 3.1 传球公式 S01
- **公式**：`touchBase + powerFactor - decayRate`（连续衰减）
- **验证**：5m短传95%+, 40m长传60%+, 90m超长传42%
- **现实对照**：StatsBomb平均传球成功率83.5%，完全吻合
- **测试文件**：`engine/test_pass_90m.js`, `engine/test_pass_final2.js`
- **状态**：✅ 完成

### 3.2 盘带基础公式 S02（旧版，已被3.3替代）
- **状态**：❌ 已废弃

### 3.3 盘带公式（space+pressure 连续二维模型）✅ 最新版
- **核心理念**：去掉了D1-D5情境分类。盘带结果仅由两个连续物理量决定：
  - `space` — 球员周围360°自由面积（m²，客观数据，0=被完全封死，20=开阔）
  - `pressure` — 防守压力（0-1连续值，0=无压力，1=极限围抢）
  - 这两个变量正交，构成完整的盘带情境二维平面。所有之前的"情境"只是平面上的区域。
- **公式**：
```
playerScore = Σ(attr * weight)
defenderScore = defense*0.4 + burst*0.3 + strength*0.3
baseSuccess = playerScore / (playerScore + risk * defenderScore)
spaceFactor   = max(0.3, 1 - spaceSensitivity * max(0, 10 - space))
pressureFactor = max(0.4, 1 - pressure * pressureSensitivity)
fatigueFactor = max(0.7, 1 - fatigue * 0.005)
final = min(0.95, max(0.05, base * spaceFactor * pressureFactor * fatigueFactor))
```
- **5种带球方式**（球员选择，非情境分类）：
  | 方式 | 属性权重 | risk | spSens | prSens | 特点 |
  |------|---------|------|--------|--------|------|
  | burst 爆发 | burst*0.5+speed*0.5 | 0.40 | 0.08 | 0.12 | 需要空间，受压力影响大 |
  | control 控制 | control*0.6+burst*0.4 | 0.30 | 0.05 | 0.08 | 平衡型 |
  | force 强突 | control*0.4+burst*0.4+luck*0.2 | 0.55 | 0.04 | 0.25 | 高风险，压力敏感 |
  | shield 护球 | control*0.4+strength*0.6 | 0.22 | 0.01 | 0.04 | 不依赖空间，天然抗压 |
  | passBack 回传 | control*0.5+vision*0.5 | 0.05 | 0.01 | 0.02 | 最低风险，绕过情境 |
- **验证**：14/14全部通过
- **测试文件**：`engine/test_dribble.js`
- **主文件**：`engine/dribble.js`
- **状态**：✅ 完成

### 3.4 射门公式 S03 ✅ 完成

- **核心理念**：射门 = distance + angle + pressure 三维连续模型，分两步计算
- **公式**：
```
// Step 1: 射正率
idealOT = 0.90 * finScore / (finScore + 1.5)
distFactor = 1 / (1 + ((d-distRef)/distDecay)²)    // sigmoid衰减
onTarget = idealOT * distFactor * angleFactor * pressureFactor * fatigueFactor

// Step 2: 射正→进球率
baseGoal = attackerScore / (attackerScore + gkScore * gkMultiplier)
goalGivenTarget = baseGoal * distFinFactor * angleFinFactor

// 总进球概率 = onTarget * goalGivenTarget
// isDeadBall=true 时各项参数更宽松（点球场景）
```
- **4种射门方式**：
  | 方式 | 属性权重 | distRef | distDecay | gkMult | 特点 |
  |------|---------|---------|-----------|--------|------|
  | power 抽射 | power*0.5+longShots*0.3+finishing*0.2 | 7 | 10 | 2.0 | 远射保持精度 |
  | placed 推射 | finishing*0.5+composure*0.3+technique*0.2 | 7 | 6 | 2.0 | 近距离极准 |
  | volley 凌空 | technique*0.5+finishing*0.3+composure*0.2 | 5 | 5 | 2.0 | 高难度高回报 |
  | header 头球 | heading*0.7+jumping*0.3 | 4 | 4 | 2.0 | 仅禁区内有效 |
- **isDeadBall**：区分罚球/任意球（死球有完美控制）vs 活球射门
  - 死球：distFactor penalty ×25%, gkMultiplier=0.20, pressure factor ×10%
- **验证**：12/12全部通过
- **测试文件**：`engine/test_shoot.js`
- **主文件**：`engine/shoot.js`

### 3.5 对抗公式 S04（待做）

### 3.6 解围公式 S05（待做）

### 3.7 门将扑救公式 S06（待做）

---

## 四、数据收集

### 4.1 已下载数据
- **football-data.co.uk**：303个CSV，20联赛×15赛季（2011-2026），110,000+场比赛
- **StatsBomb Open Data**：德甲23/24、世界杯2022、欧冠03/04事件级数据（部分因网络限制未全部下载）
- **脚本**：`download_all_fd.py`, `download_statsbomb_all.py`

### 4.2 已分析数据
- 五大联赛场均进球2.90、场均射门25.2、射正率35.5%、转化率11.5%
- 盘带/过人500+事件样本分析

### 4.3 盘带分支搜索数据（2026年6月收集）
- D2单对一：联赛平均50%, 顶级55-63%, 弱队38%
- D3高压护球：意甲前锋平均52%, 顶级65-73%
- D4边线突破：顶级60-72%, 普通39-55%
- D5反击推进：有核心40-42%, 无核心17-28%
- D1无压力推进：55-65%

### 4.4 数据源清单
- football-data.co.uk (免费CSV)
- StatsBomb Open Data (GitHub)
- FBref / WhoScored / SofaScore / FotMob
- SoccerData (Python库) / worldfootballR (R包)
- Transfermarkt-Datasets (GitHub)
- OpenFootball (GitHub)
- football-data.org (REST API)

---

## 五、部署信息

### 5.1 本地服务
- **端口**：8080
- **启动命令**：`$env:PORT='8080'; node server/index.js`
- **目录**：`fm-tactical-engine/server/`
- **数据库**：内存模式（DATABASE_URL未设置时自动降级）
- **地址**：http://localhost:8080

### 5.2 腾讯云部署
- **地址**：https://newfm-270069-8-1443065697.sh.run.tcloudbase.com/
- **平台**：Mule Pages（serverless）
- **数据库**：TiDB（DATABASE_URL由平台自动注入）
- **构建**：`build.cjs` → `public/fm-engine.js`
- **代码导出**：`user_code_new/code_export/js-build/`

---

## 六、待解决问题

1. **S02盘带 ←→ match.js 集成**：`situations.js`中的S01-S23旧系统需要逐步迁移到新6核心情境模型

2. **S03射门 ←→ match.js 集成**：与盘带模块类似，需要接入旧S01-S23系统

3. **对抗情境S04**：需要定义和测试

 4. **解围情境S05**：需要定义和测试

5. **门将扑救S06**：需要定义和测试

6. **完整比赛模拟**：所有情境接入match.js后进行端到端测试

---

## 七、"精英"概念移除记录

已从以下文件中移除"精英/elite"标签：
- `engine/teams.js`：`eliteCount` → `starCount`, `elite` → `quality_tier`
- `public/fm-engine.js`：同上
- `public/index.html`：`p.elite` → `p.quality_tier`
- `test_analysis.js`：`精英` → `stars`
- **原则**：永远只用属性描述（高/中/低），不使用球员分类标签
