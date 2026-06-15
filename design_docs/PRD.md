# 足球哲学引擎 PRD v0.5

> 交接给后续 AI 接手。本文档 + 同目录所有源文件构成完整上下文。无需访问原对话。

---

## 0. 阅读须知

本 PRD 是足球哲学引擎的中期交接文档。**不是 FM 克隆**，也不是 NPC 数值搬运。读者请先认真理解 §1.2 的设计哲学；如果接手者把这套东西又往 FM 风格上扭，本项目就死了。

**文档结构**：
- §1–§3：方向与架构（必读）
- §4：现在做到哪一步了（必读）
- §5–§6：已定型的规范（实现时直接参考）
- §7：未来 8 步路线（实施清单）
- §8：怎么验证有没有跑偏
- §9：源文件在哪
- §10：还没拍板的事
- 附录：补充资料

**配套文件**（与本 PRD 同目录或 `js-build/`）：
| 文件 | 用途 |
|---|---|
| `output/tactical_spec.md` | 倾向 / 套路两层语义规范 |
| `output/patterns_klopp_vs_pep.md` | 10 个对照套路（设计稿） |
| `output/patterns_v1.md` | 早期被否的草案（保留作为反例） |
| `output/analysis_report.md` | 数值偏离分析 |
| `js-build/engine/*.js` | 当前 JS 引擎 |
| `js-build/test_analysis.js` | 验证套件 |
| `js-build/public/index.html` | 前端管理 + 直播页 |
| `output/match_engine_v2_1.py` | 早期 Python 引擎（已被 JS 取代，可参考） |

## 1. 项目背景与目标

### 1.1 项目定位

足球俱乐部经营 + 战术模拟游戏。核心循环：
1. 玩家选定一个**足球哲学**（克洛普式压迫 / 瓜式控球 / 穆式低位反击 / 自定义混合）
2. 通过**训练**让球员学会承载哲学的**套路库**
3. 比赛由引擎按"套路 + 倾向 + 球员能力 + 状态起伏"模拟
4. 玩家根据反馈微调套路、调整阵容、引援填空缺

引擎对外输出：90 分钟比赛事件流 + 22 球员位置流 + 数据统计。

### 1.2 设计哲学（why we are NOT building FM）

**用户原话（务必内化）**：

> "足球不是一个数字化的东西。尤其是现实中球员起起伏伏，完全不是数字能表达和实现这个变化效果的。对玩家来说很容易被误导为'收集高性价比球员'而不是去寻找一个足球哲学建队。"

> "这十年 FM 最大的错误就是给球员建立了一堆所谓的角色 ... 球员我们就保持 20 属性 + 身高就够了。"

> "足球游戏的真正粉丝必然需要战术 ... 但是足球哲学这东西，如果只有几个选项，那就太无聊了，而且很容易出现数据不平衡，被玩家找出最优解。"

由此推导出的硬约束：

1. **禁止 Overall 评分**。任何"综合评价数"都是 min-max 收集党的入口。属性永远以维度向量呈现。
2. **禁止预设哲学菜单**。哲学不是下拉框，而是**套路库的组合涌现**出的事后标签。
3. **球员属性极简**：20 项属性 + 身高。不再加角色 / 习惯 / 偏好等次级 schema。
4. **状态 (form) 是一等公民**。短期波动 > 基础能力。低迷球员能打烂数据，强势球员能拖死强队。
5. **战术深度通过套路而非滑块堆叠实现**。倾向只 5 条，深度全在套路库里。

### 1.3 非目标 / 明确排除

- ❌ 物理拟真（球速、空气阻力、22 人骨骼动画）
- ❌ 转会市场博弈（先把比赛模拟做对再说）
- ❌ 球员人际关系网（用户原话："差不多有一点就可以了"）
- ❌ 角色 / 战术指令体系（FM Roles & Duties 是反面教材）
- ❌ 数据库式国家联赛建模（一开始就 N 个联赛 = 死路）

## 2. 产品体验目标

**用户应有的体验闭环**（用比体育游戏对话更贴近的语言）：

> "我喜欢克洛普。我让球队学了 4 套压迫套路。开赛后，我看到我的边后卫真的会在丢球后 2 秒内逼上去，中场配合协防换位。但是我的中卫年纪大了脚下慢，被对手 2 次反击打穿。下周我决定训练第 5 套'压迫盯人 + 换位补位'，让中卫不暴露在 1v1 里。"

引擎必须能让上面这段叙事**自然发生**而不是脚本化触发。

**过程拟真而非物理拟真**：90 分钟里发生的事情**符合常识**（一个动作大概多长时间、传球多大概率成功、压迫怎么导致失误），但不追求"球真的飞了多少米"。

**关键体验指标**（success metrics）：

1. **同一阵容换两套套路库 → 比赛画风明显不同**。Klopp 库 vs Pep 库的 200 场对战数据应该有 ≥6 个统计维度显著差异（控球率、抢断位置、传球长度分布、转身次数、犯规位置等）。
2. **同套套路在不同球员脚下表现不同**。低熟练度执行套路时步骤断裂率 > 60%；高熟练度 < 25%。
3. **观看一场比赛能猜出球队哲学**。盲测：随机给玩家看 5 分钟没有标签的比赛片段，能正确分类 Klopp / Pep / 反击的比例 > 50%（远高于 33% 随机）。
4. **min-max 数据玩法失效**。把所有球员都堆成"高传球高速度"并不能必胜，因为没有匹配的套路库和训练投入。

## 3. 核心架构：四层模型

引擎按"协同人数"严格分层，每层职责互斥。任何后续修改必须能放进其中一层。

```
情境 (S01-S23)   ← 客观事实层：球在哪、谁拿球、压力如何
   ↓
动作 (A1-A6)     ← 每个情境下的有限动作菜单
   ↓
─────── 以上是基础设施，下面是行为层 ───────
   ↓
┌────────────────────────────────────────────────┐
│ Layer 1：个人选择          (1 人)              │  情境→动作选择
│ Layer 2：二人化学反应      (2 人)              │  传球准确度、二过一
│ Layer 3：套路 Pattern      (3+ 人, 主动触发)  │  ←★ 套路差异化的核心 ★
│ Layer 4：体系 Tendency     (5+ 人, 被动持续)  │  落位、节奏、紧凑度
└────────────────────────────────────────────────┘
   ↓
风格签名 (Signature)  ← 套路库组成 + 倾向向量 → 涌现的事后标签
```

### 3.1 第一层 — 个人选择（情境 + 动作）

- **23 个情境**（S01–S23）覆盖所有"球员-球-空间-压力"的离散状态。
- **6 个动作**（A1–A6）是球员在该情境下的有限菜单。
- 选哪个动作由 `selectAction()` 按动作权重 + 球员能力 + 默认 tempo 决定。
- **这是基座，不要动**。23 个情境是过去半年从真实比赛抽象出来的，被反复打磨过。

### 3.2 第二层 — 二人化学反应

- 当只有 2 人参与（如传球者 + 接球者 / 持球者 + 防守者），由属性直接判定。
- 例：传球成功率 = `myScore / (myScore + w·oppScore)` 形式。
- 二过一、传中找点、长传 — 这些**属于个人选择 + 二人对位**，不属于"套路"。
- 早期 `patterns_v1.md` 把这些列为套路是错的，已废弃。

### 3.3 第三层 — 套路 Pattern（本项目差异化核心）

**定义**：3 人或以上协同的、有意图的情境串联。

- **主动触发**：满足 trigger 时被点名球员脱离倾向、按 expected_chain 行动。
- **覆盖倾向**：套路激活期间，参与者的站位/动作受套路指挥。
- **可训练**：每个球员对每个套路有 `proficiency` (0-100)，决定执行流畅度。
- **可迁移**：相似套路之间训练成果互相加成（详见 Step 8）。

**套路库 = 玩家的战术身份**。Klopp 球队和 Pep 球队哪怕用同一批球员同一阵型，因为套路库不同，画风就不同。

### 3.4 第四层 — 体系 Tendency（倾向）

- **5 个数字滑块**（−2 到 +2）：defensive_line, attacking_width, pressing_intensity, default_tempo, compactness。
- **被动、持续**：永远生效，不需要触发。
- **职责**：决定**球员站哪**、**没套路时的默认反应**。
- 详细定义见 §5。

### 3.5 套路 vs 倾向：优先级与覆盖

| 何时 | 谁说了算 |
|---|---|
| 有套路触发 + 球员被点名 | **套路** 完全覆盖倾向 |
| 有套路触发 + 球员未被点名 | 倾向（按默认站位 + 默认反应） |
| 无套路触发 | 倾向（这是当前引擎行为） |
| 套路执行失败 / 中断 | 立即回到倾向 |

**允许矛盾配置**（这是 feature 不是 bug）：
- 玩家可以同时设置"低位防守"倾向 + "高位压迫陷阱"套路
- 含义："我们整体蹲坑，但偶尔上去咬一口"
- 套路触发时球员前压执行，结束后回到低位
- 这能还原现实里"低位球队偶尔变招"

## 4. 当前实现状态

### 4.1 引擎基础（已稳定）

- 23 情境 / 6 动作的判定循环 (`engine/situations.js`, `engine/actions.js`)
- 转场逻辑 (`engine/transitions.js`)：球权变化、定位球、射门后续
- 球员属性生成 (`engine/player.js`)：20 项 + 身高
- 阵型与区域 (`engine/zones.js`)：6 阵型 × 30 区域 (5 lane × 6 band)
- 概率计算骨架 (`engine/prob.js`)：`myScore / (myScore + w·oppScore)`
- 主循环 (`engine/match.js`)：动作驱动，每个动作消耗 8–40 秒

**校验通过**：射正率 0.32–0.40、转化率 0.10–0.14、对手 GK 与我方进球负相关、对手精英人数与我方进球负相关。

### 4.2 倾向层重构（已完成）

把"战术 (tactics)"重新定义为"倾向 (tendencies)"，做了五件事：

1. **删除** `attacking_directness`（这条会和未来套路库重复）
2. **新增** `compactness`（紧凑度：前压 / 散开）
3. **重命名** `tempo` → `default_tempo`（明示"没套路时的默认节奏"）
4. **明确职责**：5 个倾向只影响**落位**和**默认强度**，不影响"传给谁、走哪条路线"
5. **`pressing_intensity` 严格限定**：只在球员**已经在该区域时**生效，不会把球员从己方半场拽到对方禁区

代码改动位置见 `output/tactical_spec.md` 的"实现位置"表。

**校验结果**（200 场跑出来的相关性）：
- safe ↔ tempo: -0.754 ✓
- hold ↔ tempo: -0.358 ✓
- risky ↔ tempo: +0.334 ✓
- dribble ↔ tempo: +0.517 ✓
- tackle ↔ pressing: +0.022 ✓（弱正、符合预期，因为 pressing 只影响"已在该区"的抢断概率）
- direct/clear/cross ↔ 任何倾向: ≈ 0 ✓（脱离倾向，等套路实现后再产生差异）

### 4.3 套路层（设计完，未实现）

- 套路 schema 草案见 §6.2
- 10 个对照套路完整设计见 `output/patterns_klopp_vs_pep.md`
- 引擎尚未接入：当前比赛事件流里**没有任何套路触发**
- 这是 Phase 1 的主要工作（Step 5–6）

### 4.4 哑原型 Step 1+2（已完成）

**目的**：在动大引擎之前，让用户先在屏幕上**看到 22 个点**，建立可视化基线。

实施：
- `engine/teams.js`: `Team.getPositionSnapshot()` 返回 11 个 `{pid, role, role_name, zone, is_gk, elite}`
- `engine/match.js`: `matchSummary()` 增加 `home_positions` / `away_positions`
- `public/index.html`:
  - 新增 CSS `.mp-player`
  - 新增 `miniZoneToXY(zoneId, side)`（客队 v/h 双向镜像）
  - 新增 `renderMatchPlayers(homePos, awayPos)` 在 mini-pitch 上绘 22 个圆点
  - `startMatch()` 在 `drawMiniPitch()` 之后调用 `renderMatchPlayers()`

**边界**：圆点静态，按倾向落位摆放；球（脉冲点）仍是事件驱动；倾向变化能实时反映到落位（验证过：高 defensive_line + compactness 把 FB_L 从 `DEEP_D_L` 推到 `MID_D_CL`）。

### 4.5 Step 3 持球者跟随（已完成）

**目的**：让"持球者"圆点跟着 ball_zone 移动，建立"球在脚下走"的视觉。

已完成：
- `engine/match.js` runMatch 循环里每个事件附加 `r.carrier_pid` 和 `r.carrier_side`
- `server/index.js` `/api/match/simulate` 的 event 映射透传 `carrier_pid` / `carrier_side`
- `public/index.html`:
  - 每个圆点带 id `mp-p-{side}-{pid}` + 默认位置缓存到 `window.__mpDefault`
  - 新增 `moveCarrier(side, pid, zone)`：CSS transition 平滑过渡 + jitter 防堆叠 + 自动归位前 carrier
  - 新增 `.mp-player.carrier` 金边高亮样式
  - `play()` 在每条 event 上调用 `moveCarrier`

**边界**：只有持球者 1 个点会动 + 上一个 carrier 自动回归。其他 20 个点仍按倾向静态站位（Step 4 解决）。

**测试**：30 步样本里 26/26 事件全部带 carrier 信息，球权切换时 carrier 正确换边。

## 5. 五大倾向轴的最终定义

| 轴 | 范围 | 语义 | 影响 | **不**影响 |
|---|---|---|---|---|
| `defensive_line` | −2 低位 / +2 高位 | 后卫线纵向落位 | CB/FB/WB V_BAND ±0.5；DM ±0.3 | 是否抢断、力度多大 |
| `attacking_width` | −2 收缩 / +2 拉边 | 边路横向铺开度 | FB/WB/W/IF H_LANE ±1.0 | 是否选择传中 |
| `pressing_intensity` | −2 缩防 / +2 紧逼 | 防守对抗激进度 | **仅当防守球员已在该区域时**：抢断动作权重 ↑、抢断成功率 ↑、犯规率 ↑、"高压力"判定门槛放宽 | 球员落位 |
| `default_tempo` | −2 慢 / +2 快 | **没套路时**的默认节奏 | safe/hold 权重 ↓ (tempo>0)；risky/dribble 权重 ↑ | 球员位置 |
| `compactness` | −2 散开 / +2 紧凑 | 球员间距：高 = 球队抱团 | CB/FB/WB V_BAND +0.3（前压）；ST/IF/W V_BAND −0.3（回撤）；中场不变 | 横向宽度 |

**易错点澄清**（参见 `tactical_spec.md` 反例）：
- 低位 + 高压 = 球员在己方半场内更主动出脚，不会跑到对方禁区
- 高位 + 低压 = 球员前压但接触球时被动，宁可让对方拿球
- 高紧凑 + 高宽度 = 球队像被压扁的矩形（横向拉长 / 纵向压缩）
- 慢节奏 + 高压迫 = 默认倒脚耐心，对方接近时全力抢

**已删除**：`attacking_directness`。直接 / 解围 / 传中偏好将由**套路库的组成**自动表达。

## 6. 套路（Pattern）设计规范

### 6.1 套路准入条件

一个东西要被称为"套路"必须**同时满足**：

1. **≥ 3 名被点名球员** 协同执行
   - 1 人 = 个人选择（情境 + 动作层）
   - 2 人 = 二人化学（属性对位）
   - 5+ 人 = 体系（应该用倾向表达）
2. **几个情境的有意图串联**，不是单一动作
3. **失败时有明确放弃条件**（`abort_if`），不会卡死
4. **可训练**：球员有熟练度，新球员执行不流畅

**反例**（早期 patterns_v1.md 被否的）：
- ❌ "二过一" — 2 人，属于二人化学
- ❌ "直塞反越位" — 1 人选择 + 1 人跑位，是情境/动作层
- ❌ "长传冲吊" — 1 个动作的偏好
- ❌ "高位逼抢" — 体系层，应该是倾向

**正例**（patterns_klopp_vs_pep.md）：
- ✓ "压迫盯人 + 协防换位"（压迫者 + 被换位者 + 协防者，3 人）
- ✓ "三人组边路撞墙"（边卫 + 中场 + 边锋，3 人）
- ✓ "3-2 出球结构"（双 CB + 后腰 + 倒脚指挥者，4 人）

### 6.2 套路 schema（草案）

```js
"三人组边路撞墙": {
  trigger: {
    initial_situation: "S06",         // 启动情境
    h: ["L", "R"],                    // 限定横向通道
    requires_phase: "open_play",      // 可选：开放比赛 / 反击 / 定位球后
    requires_role_present: ["FB_*", "CM_*", "W_*"]  // 必须场上有这些角色
  },
  participants: 3,                    // 几人协同（>=3）
  expected_chain: [
    {
      sid: "S06", preferred_action: "A2",
      executor_role: "FB_L|FB_R",
      executor_attrs: ["触球精度", "队友识别"],
      success_transition_to: "S07"
    },
    {
      sid: "S07", preferred_action: "A1",
      executor_role: "CM_*",
      executor_attrs: ["触球精度", "决断速度"],
      success_transition_to: "S05"
    },
    {
      sid: "S05", preferred_action: "A1",
      executor_role: "W_L|W_R",
      executor_attrs: ["触球精度", "对手识别"],
      success_transition_to: "S13"
    }
  ],
  abort_if: "actual_next_situation !== success_transition_to",
  off_ball_routines: {
    // 套路激活期间被点名球员的跑位指令（Step 6 实现）
    "FB_*": "overlap_outside_wing",
    "CM_*": "late_run_into_box"
  },
  proficiency_per_player: { /* pid -> 0-100 */ }
}
```

### 6.3 Klopp vs Pep 对照库

5 个 Klopp + 5 个 Pep，全部 ≥3 人，全部用上面 schema 描述。详见 `output/patterns_klopp_vs_pep.md`。

**对照表**（同一情境，两哲学反应不同）：

| 触发情境 | Klopp 反应 | Pep 反应 |
|---|---|---|
| 刚丢球（己方半场） | KL-01 反应式压迫（8 秒规则） | PG-01 退守 3-2 结构 |
| 持球于中场中路 | KL-02 中场绞杀 → 直传转换 | PG-03 中场三角倒脚 |
| 后场组织 | KL-04 长传找前压点 | PG-01 3-2 出球结构 |
| 边路 1v1 | KL-03 边卫套上 + 中场后插 | PG-02 反插边卫 + 第三人 |
| 阵地战受阻 | KL-05 三通道反击启动 | PG-04 假 9 号回撤拉空间 |
| 角球进攻 | 直接抢点 | PG-05 短角球重组 |

**验证目标**：Klopp 库 vs Pep 库 1000 场对战，应能观察到：
1. Pep 队控球率 +10pp 以上
2. Klopp 队前场抢断次数 +50% 以上
3. Pep 队平均传球长度更短
4. Klopp 队进球更多在丢球后 15 秒内 (反击)
5. Pep 队进攻三区触球次数 +30% 以上
6. Klopp 队犯规位置更靠前

## 7. 八步推进路线（Path B）

**原则**：每一步都要**可使用 + 可测试 + 符合常识理解**，不允许"做完很多步才能看出效果"的爆炸式开发。

每步配套：
- 一个明确产出
- 一个用户能在屏幕上看到的变化
- 一个能跑的测试

---

### Step 1 — 时间轴 + tick 循环

**目的**：把"动作驱动"的隐式时间换成"显式 tick"。

**产出**：
- 1 tick = 1 秒（推荐，可后调）
- 每个动作消耗 N 秒（沿用现有 `_timeCost`）
- 主循环按 tick 推进；动作执行只在它需要的 tick 触发

**用户可见**：比赛总时长稳定在 90'+ 补时，事件密度均匀；分钟数严格递增不跳。

**测试**：1000 场跑下来，sum(动作时间) 与 (full_time - start) 误差 < 5%。

**实现量**：仅改 `match.js` 主循环结构，不动判定。

---

### Step 2 — 22 球员位置状态（已完成）

见 §4.4。

---

### Step 3 — 持球者真实移动 + 弹性回位（已完成最小切片）

**已实现**：
- `engine/match.js` 每条 event 附加 `carrier_pid` / `carrier_side`
- 服务端透传 + 前端 `moveCarrier()` 实现"持球者圆点跟随 ball_zone + 上一个 carrier 自动归位"

**Step 3 仍可扩展（未来 Phase）**：
- 把"圆点跟 ball_zone 中心"升级为"`Player.position = {zone, x, y}` 实例字段，按真实速度移动"
- 弹性回位增加 N 秒过渡而不是瞬切
- 持球者在持球期间小幅运球位移（不只是被 zone 切换驱动）

**用户可见（当前）**：mini-pitch 上持球者圆点带金边、平滑滑到 ball_zone 附近，丢球后弹回默认位置。

**测试**：单场抽样 26/26 事件 carrier 信息完整；球权切换时 carrier 正确换边。

---

### Step 4 — 简单反应型无球跑动（3 规则）

**目的**：解决 Step 3 之后"球动其他 21 个人不动"的别扭感。

**3 条最小规则**：
1. **同队邻近者跟随**：持球者前压时，同侧 ±1 lane 的队友 +0.2 V_BAND
2. **防守方收缩到球周围**：球到 BOX_A 时，防守方 ST_* 不跟，其他人 -0.3 V_BAND（回防）
3. **后场队友补位**：持球者所在区无队友时，最近的同 lane 后排队友 +0.3 V_BAND

**用户可见**：22 个点会"集体呼吸"，不再是死板的初始落位。

**测试**：人为构造一个 ball_zone 序列，验证三条规则是否正确触发。

---

### Step 5 — 套路 schema + 匹配器（仅持球者套路）

**目的**：让套路真正介入选择，但暂时只让持球者按套路选动作；无球跑动还按 Step 4 的反应规则。

**产出**：
- `engine/patterns.js`：套路库 + 匹配器
- `selectAction` 增加套路 hook：有匹配套路时，强行选 `expected_chain` 当前步的 `preferred_action`，权重 × `(0.5 + proficiency/200)`
- 套路状态机：`GameState.active_pattern`、`pattern_step`、`pattern_actor_map`
- `abort_if` 触发时清状态、回到默认动作选择

**用户可见**：开比赛后日志能看到"克洛普 KL-01 反应式压迫触发"等行，事件流明显倾向某些动作链。

**测试**：注入 1 个套路 + 1 个明确触发条件，跑 100 场，统计触发次数 ≥ 一定阈值；触发后的事件序列与 expected_chain 一致率 ≥ 60%。

---

### Step 6 — 套路驱动无球动作（解锁全部 10 套路）

**目的**：让被点名的非持球球员真的执行 `off_ball_routines`。

**产出**：
- 每 tick 检查 `pattern_actor_map`；被点名的非持球球员按 routine 改变 position
- `routine` 字典：`overlap_outside_wing`, `late_run_into_box`, `cover_shift`, `third_man_arrival` 等
- routine 也按 `proficiency` 折扣（不熟练就晚到 / 跑偏）

**用户可见**：套路触发时屏幕上能看到边后卫真的套上去、中场真的后插上、对手压迫时真的有人换位。

**测试**：Klopp 库 vs Pep 库 200 场对战，§6.3 列的 6 项指标至少 5 项达标。这是套路系统的**真正验收**。

---

### Step 7 — 套路熟练度 + 训练系统

**目的**：建立训练 → 比赛反馈的循环。

**产出**：
- `Player.pattern_proficiency: Map<patternId, 0-100>`
- 训练玩法：每周分配 N 个训练时段，每时段练 1 个套路；参与球员熟练度 +X（带边际衰减）
- 比赛后：参与套路的球员该套路熟练度 +1（成功）/ +0（失败）

**用户可见**：训练界面里能看到球员对每个套路的熟练度条；新签球员第 1 场往往拖累套路成功率。

**测试**：模拟一个 30 周赛季，新球员对主力套路熟练度从 ~30 涨到 ~70；套路成功率与平均熟练度 r > 0.5。

---

### Step 8 — 套路相似度 + 迁移 + 风格签名

**目的**：让"训练过类似套路"加速学习；让球员经历产生身份。

**产出**：
- 套路向量化（参与角色 + 主要触发情境 + 主要动作）
- 训练 A 套路时，相似度 > 0.7 的套路熟练度也涨（按比例）
- **风格签名**：对一个球员或一支球队，把熟练度高的套路汇总，按维度（压迫倾向、控球倾向、反击倾向、定位球依赖度等）输出向量，并自动生成文字标签 ("压迫型边后卫" / "控球大师")

**用户可见**：球员详情页有"风格"段落自动文字；球队详情页有"哲学画像"雷达图。

**测试**：Klopp 库训练 50 场后，球队风格签名应明显落在"高压迫 + 直传"象限；签名生成稳定（同一球队连续 10 场签名 cosine 相似度 > 0.9）。

## 8. 验证方法

### 8.1 倾向相关性测试

`cd js-build && node test_analysis.js 1000`

**必须通过的相关性**（5 项）：
- safe ↔ tempo: r < -0.20
- hold ↔ tempo: r < -0.20
- risky ↔ tempo: r > 0.10
- dribble ↔ tempo: r > 0.10
- tackle ↔ pressing: r > 0.00（弱正即可）

**已废弃的相关性**（脱离倾向，等套路实现）：
- direct/clear/cross ↔ 任何倾向: 应该 ≈ 0

**必须通过的能力相关性**：
- 对手 GK 能力 → 我方进球: r < -0.05
- 对手精英人数 → 我方进球: r < -0.05

**真实性指标**：
- 射正率 0.32–0.40
- 转化率 0.10–0.14
- 角球出现次数 > 0

### 8.2 Klopp vs Pep A/B 验证

`scripts/ab_klopp_vs_pep.js`（待实现）：
- 同一批球员、同一阵型，分别注入 KL-* 库和 PG-* 库
- 跑 1000 场对战
- 输出 §6.3 的 6 项差异指标

**这是 Step 6 完成的验收门**。如果跑出来两套库统计差异不显著，套路系统设计有问题，回去检查。

### 8.3 通用真实性指标

每次大改后都要看一眼（即使没正式 assert）：
- 90 分钟平均事件数 350–450
- 平均比分 1-2 个进球 / 队
- 控球率分布合理（不全是 50-50 也不全是 80-20）
- 犯规位置分布与压迫倾向一致（高压队前场犯规多）

## 9. 关键文件索引

### 引擎源码（`js-build/engine/`）

| 文件 | 职责 | 是否稳定 |
|---|---|---|
| `constants.js` | 常量定义 | ✓ |
| `rng.js` | 可重放随机数 | ✓ |
| `prob.js` | 概率计算 (`calcProb`) | ✓ |
| `zones.js` | 30 区域 + 阵型 + 角色位置 | ✓ |
| `player.js` | 球员属性生成 | ✓ |
| `presets.js` | 角色属性模板 | ✓ |
| `actions.js` | 6 动作 × 23 情境 = 动作矩阵 | ✓ |
| `situations.js` | 情境判定 + 动作选择 | ✓ |
| `transitions.js` | 球权 / 后续转场 | ✓ |
| `teams.js` | 倾向 + 球员 + 球队类 | ✓（含 §4.4 Step 2 新增） |
| `match.js` | 主循环 + 摘要 | ✓（含 §4.5 Step 3 半成） |
| `index.js` | 引擎导出入口 | ✓ |
| `patterns.js` | 套路库 + 匹配器 | **待 Step 5** |

### 服务器 (`js-build/server/`)

| 文件 | 职责 |
|---|---|
| `index.js` | HTTP API：玩家 CRUD + 比赛模拟 |
| `persist.js` | 简易 JSON 持久化 |

### 前端 (`js-build/public/`)

| 文件 | 职责 |
|---|---|
| `index.html` | 管理 + 直播页（单页全用 vanilla JS） |
| `admin.html` | 球员管理面板 |

### 设计文档 (`output/`)

| 文件 | 内容 |
|---|---|
| `PRD.md` | 本文档 |
| `tactical_spec.md` | 倾向 / 套路两层规范 |
| `patterns_klopp_vs_pep.md` | 10 套路完整定义（Klopp 5 + Pep 5） |
| `patterns_v1.md` | 早期被否的草案（反例） |
| `analysis_report.md` | 数值偏离分析 |

### 验证 (`js-build/`)

| 文件 | 用途 |
|---|---|
| `test_analysis.js` | 1000 场跑批 + 倾向相关性矩阵 |
| `_players_data.json` | 持久化的球员数据 |

### 历史代码（参考用，不应继续维护）

| 文件 | 说明 |
|---|---|
| `output/match_engine_v2_1.py` | 早期 Python 引擎，已被 JS 取代 |
| `output/simulation_engine_v2.py` | Python 仿真层，参考算法 |
| `output/player_module.py` | Python 球员逻辑，参考算法 |
| `output/player_server.py` | Python HTTP，废弃 |
| `output/match-classic.html` | 早期前端，废弃 |

## 10. 待澄清问题 / 已识别风险

### 10.1 仍需用户拍板的边界

| 问题 | 候选 | 当前默认 |
|---|---|---|
| Tick 精度 | 1s / 0.5s / 0.1s | **1s**（推荐，性能足够 + 视觉够流畅） |
| 坐标系 | 30 区域中心点 / 区域 + 亚坐标 / 连续坐标 | **30 区域 + 亚坐标** (zone, dx, dy)，便于复用现有 zone 逻辑 |
| 套路取消策略 | 严格（任何偏离即 abort）/ 宽容（允许 1 步偏离） | **严格**，更易调试，等真要拟人化再放宽 |
| 训练时段总量 | 每周固定 N 个 / 与教练等级挂钩 | **固定 5 个**（后期再加教练系统） |
| 套路库容量 | 每队上限 8 / 12 / 无限 | **每队上限 12**，强迫玩家做取舍 |

### 10.2 技术风险

- **R1：套路触发率过低**。如果 trigger 条件设得太严，套路库形同虚设。Step 5 验收要看触发占总动作的比例。
- **R2：套路链式连锁**。一个套路结束后立即触发另一个，可能导致比赛全程都在套路里，倾向变成纯摆设。需要 cooldown 或"反应窗口"机制。
- **R3：可视化性能**。Step 4 之后每秒 22 个点 × 90 分钟 × 60 秒 = 11.8 万个位置点；前端要批量提交而不是每点一次 setAttribute。
- **R4：球员属性 20 项是否够**。当前以 `触球精度`, `队友识别`, `对手识别` 等为 routing 输入。如果套路要更细分（如"在压力下决断"），可能需要细分属性 — 但要顶住 FM 化的诱惑。

### 10.3 产品风险

- **P1：玩家学习曲线陡**。"套路 + 倾向 + 训练 + 状态"四件套对萌新太重。需要新手向导只暴露 1 个预设哲学。
- **P2：套路命名 / 描述要够通俗**。"3-2 出球结构"比"扇形落位" friendlier。文档已用足球迷语言写。
- **P3：无 Overall 评分是否劝退？** 球员卡片需要其他抓眼球的展示（如"上周状态"、"擅长 3 个套路"）。

---

## 附录 A：五倾向轴 — 完整影响表

| 轴 | 实现函数 | 关键代码位置 |
|---|---|---|
| `defensive_line` | `teams.js: TacticalInstructions.getVShift` | CB/FB/WB ±0.5、DM ±0.3 个 V_BAND |
| `attacking_width` | `teams.js: TacticalInstructions.getHShift` | FB/WB/W/IF ±1.0 个 H_LANE |
| `compactness` | `teams.js: TacticalInstructions.getVShift` | CB/FB/WB +0.3·compactness；ST/IF/W −0.3·compactness |
| `default_tempo` | `situations.js: selectAction` | safe×0.7 / hold×0.7 / risky×1.5 / dribble×1.3 (tempo>0) |
| `pressing_intensity` | 4 处：1) `situations.js: getPressureLevel`（门槛 += pressing×3）2) `situations.js: selectAction`（tackle×(1+pressing×0.20)）3) `match.js: _handleDefensiveAction`（success_factor=1+pressing×0.10，foul_p=base×(1+pressing×0.20)）4) 永远读**防守方**的 pressing | — |

## 附录 B：Klopp vs Pep 10 套路完整定义

见 `output/patterns_klopp_vs_pep.md`。摘要表：

**Klopp 5 套**：
- KL-01 反应式压迫（8 秒规则）— 失球瞬间最近 3 人逼抢
- KL-02 中场绞杀 → 直传转换 — CM 抢断后立刻找前锋直传
- KL-03 边卫套上 + 中场后插 — 边路三角运转
- KL-04 长传找前压点 — GK / CB 直接找前锋接应
- KL-05 三通道反击启动 — 失球转攻时三条 lane 同时前压

**Pep 5 套**：
- PG-01 3-2 出球结构 — 双 CB + 后腰 + CM 构成菱形
- PG-02 反插边卫 + 第三人 — 边卫内收当后腰，等第三人接应
- PG-03 中场三角倒脚 — 三 CM 维持三角，吸引压迫后转身出球
- PG-04 假 9 号回撤拉空间 — ST 撤回中场，IF 内切空当
- PG-05 短角球重组 — 不直接传中，重新组织阵地

详细 schema（含 trigger / expected_chain / off_ball_routines / abort_if）见对应文档。

## 附录 C：23 个情境（S01–S23）列表

由 `engine/situations.js: determineSituation` 决定。简表：

| ID | 描述 | 典型动作菜单 |
|---|---|---|
| S01 | 受压持球（己方半场） | safe/hold/risky/dribble/clear |
| S02 | 无压持球（己方半场） | safe/hold/risky/dribble/direct |
| S03 | 接球瞬间（中场） | safe/hold/dribble |
| S04 | 中场推进 | safe/hold/risky/dribble |
| S05 | 边路推进（中前场） | cross/dribble/safe |
| S06 | 边后卫前插 | cross/safe/dribble |
| S07 | 前场组织（中路） | risky/safe/dribble |
| S08 | 前场推进 | risky/safe/dribble/shot |
| S09 | 反击推进 | direct/dribble/shot |
| S10 | 禁区外射门机会 | shot |
| S11 | 直塞身后 | through_ball |
| S12 | 传中抢点 | header/volley |
| S13 | 禁区混战 | shot/clear |
| S14 | 点球 | shot |
| S15 | 抢断（中场） | tackle |
| S16 | 抢断（边路） | tackle |
| S17 | 抢断（防守三区） | tackle |
| S18 | 抢断（进攻三区） | tackle |
| S19 | 门将出击 | gk_action |
| S20 | 门将接球 | gk_action |
| S21 | 任意球 | free_kick |
| S22 | 角球 | corner |
| S23 | 界外球 | throw_in |

详细参考 `engine/situations.js` 和 `engine/actions.js`。

## 附录 D：数据 schema

### D.1 Player

```js
{
  pid: "uuid",
  name: "球员姓名",
  role: "ST_C",                   // 11 种角色之一
  role_name: "中锋",
  quality: "starter|star|legend|rotation",
  is_gk: false,
  attrs: {
    "触球精度": 14, "决断速度": 12, "队友识别": 13,
    "对手识别": 11, "力量输出": 15, "速度": 16,
    "弹跳": 12, "对抗": 13, "纪律性": 11,
    "团队导向": 14, "自信": 12, "情绪稳定性": 13,
    "集中力": 12, ... // 共 20 项
  },
  height_cm: 182,
  pattern_proficiency: {            // Step 7 引入
    "KL-01": 65, "KL-02": 40, ...
  },
  form: {                            // Step 7+ 引入
    fitness: 80,  // 0-100
    morale: 70,
    weekly_trend: +5
  }
}
```

### D.2 TacticalInstructions

```js
{
  defensive_line: 1,      // -2..2
  attacking_width: 0,     // -2..2
  pressing_intensity: 2,  // -2..2
  default_tempo: 1,       // -2..2
  compactness: 0          // -2..2
}
```

### D.3 Pattern（设计稿）

见 §6.2。

### D.4 Match Event 输出

```js
{
  sid: "S05",
  aid: "A1",
  desc: "[34'] 左边锋 边路传中",
  success: true,
  minute: 34,
  team: "home",
  tags: ["pass", "cross"],
  zone: "DEEP_A_L",
  carrier_pid: "主队_9",       // Step 3 新增
  carrier_side: "home",         // Step 3 新增
  // Step 5+ 新增：
  pattern_active: "KL-03",
  pattern_step: 2,
  pattern_actor_map: { "主队_2": "carrier", "主队_6": "third_man", "主队_9": "overlap" }
}
```

## 附录 E：本次会话改动清单

**Engine**：
- `engine/teams.js`：
  - `TacticalInstructions` 重构（删 directness、加 compactness、tempo→default_tempo）
  - `getVShift` 加入 compactness 影响
  - `Team.getPositionSnapshot()` 新增（哑原型 Step 2）
- `engine/situations.js`：`selectAction` 删除 directness 相关分支
- `engine/match.js`：
  - `matchSummary` 新增 `home_positions` / `away_positions`
  - `runMatch` 事件附加 `carrier_pid` / `carrier_side`（Step 3 完成）

**Server**：
- `server/index.js`:
  - `buildTeam` 接受 `default_tempo` / `compactness`
  - `/api/match/simulate` event 映射透传 `carrier_pid` / `carrier_side`

**Public**：
- `public/index.html`：
  - CFG / STYLES / 滑块 全部 dr→cp
  - 新增 CSS `.mp-player` + `.mp-player.carrier` 金边
  - 新增 `miniZoneToXY()` + `renderMatchPlayers()` + `moveCarrier()`
  - 每个 dot 带 id `mp-p-{side}-{pid}`，默认位置缓存 `window.__mpDefault`
  - `startMatch()` 渲染 22 个圆点
  - `play()` 每条 event 调用 `moveCarrier(side, pid, zone)`

**Tests**：
- `test_analysis.js`：TAC_DIMS 改为 `[dl,wd,tp,cp,pr]`；废弃 direct/clear/cross 相关 assert

**Docs**：
- `output/tactical_spec.md`：完全重写为两层模型
- `output/patterns_v1.md`：早期草案（被否）
- `output/patterns_klopp_vs_pep.md`：最终 10 套路
- `output/PRD.md`：本文档

