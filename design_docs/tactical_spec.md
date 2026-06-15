# 球队倾向 + 套路 执行标准 (Tendency + Pattern Spec)

本文档定义引擎里**倾向 (Tendency)**和**套路 (Pattern)**两层的语义、影响范围和具体实现。
两层职责严格分离，任何后续修改都应保持本规范不变。

## 顶层分层

```
情境 (S01-S23)        ← 客观状态：球在哪、谁拿球、压力如何（不变）
   ↓
动作 (A1-A6)          ← 该情境下可选动作（不变）
   ↓
倾向 (Tendency)       ← 默认/被动：球员站哪、无套路时的偏好
   ↓                  ← 套路一旦激活，覆盖倾向
套路 (Pattern)        ← 主动/触发：2-4 人协同剧本（待 Phase 1 实施）
   ↓
风格签名 (Signature)  ← 球队套路库 + 倾向涌现出的标签（待 Phase 6）
```

## 两层职责定死

| 层 | 名称 | 性质 | 何时生效 | 决定什么 |
|---|---|---|---|---|
| 底层 | **倾向** | 持续/被动 | 永远在 | 球员**站在哪**、无套路时的**默认反应** |
| 上层 | **套路** | 触发/主动 | 匹配条件时 | **怎么做**、走哪条路线、传给谁 |

**优先级**：套路一旦触发，覆盖倾向；没有匹配套路时，退化为倾向驱动（这是当前引擎行为）。

---

## 五个倾向维度（Final）

| 维度 | 范围 | 语义 | 影响 | 不影响 |
|---|---|---|---|---|
| **defensive_line** | -2 低位 / +2 高位 | 后卫线纵向落位 | CB/FB/WB V_BAND ±0.5；DM ±0.3 | 是否抢断、力度多大 |
| **attacking_width** | -2 收缩 / +2 拉边 | 边路横向铺开度 | FB/WB/W/IF H_LANE ±1.0 | 是否选择传中 |
| **pressing_intensity** | -2 缩防 / +2 紧逼 | 防守对抗激进度 | 仅当防守球员**已经在该区域时**：抢断动作权重↑、抢断成功率↑、犯规率↑、"高压力"判定门槛放宽 | 球员落位 |
| **default_tempo** | -2 慢 / +2 快 | **无套路时**的默认节奏 | `safe`/`hold` 权重↓ (tempo>0)；`risky`/`dribble` 权重↑ | 球员位置 |
| **compactness** | -2 散开 / +2 紧凑 | 球员间距：高 = 球队抱团 | CB/FB/WB V_BAND +0.3 (前压)；ST/IF/W V_BAND -0.3 (回撤)；中场不变 | 横向宽度（那是 width 的事） |

### 已删除
- `attacking_directness` — 直接/解围/传中偏好将由**套路库的组成**自动表达，不再是独立 slider。

---

## 关键反例（澄清歧义）

- **低位防守 + 高压迫**：球员仍在己方半场（defensive_line），但在己方区域里更主动出脚抢断、犯规更多。**不会**"压到对方禁区"。
- **高位防守 + 低压迫**：球员前压（defensive_line），但接触球时更被动、宁可让对方拿球也不轻易上抢。
- **高紧凑 + 高宽度**：边卫水平拉边、纵向上紧靠中场（球队像个矩形被压扁但拉长）。
- **慢节奏 + 高压迫**：球员退守本方半场后耐心倒脚（默认 tempo 影响动作），但对方接近时全力压迫。

---

## 实现位置

| 维度 | 实现函数 | 关键代码 |
|---|---|---|
| defensive_line | `teams.js: TacticalInstructions.getVShift` | CB/FB/WB ±0.5、DM ±0.3 个 V_BAND |
| attacking_width | `teams.js: TacticalInstructions.getHShift` | FB/WB/W/IF ±1.0 个 H_LANE |
| compactness | `teams.js: TacticalInstructions.getVShift` | CB/FB/WB +0.3*compactness；ST/IF/W -0.3*compactness |
| default_tempo | `situations.js: selectAction` | safe×0.7 / hold×0.7 / risky×1.5 / dribble×1.3 (tempo>0) |
| pressing_intensity | 1. `situations.js: getPressureLevel`：门槛 += pressing×3<br>2. `situations.js: selectAction`：tackle×(1+pressing×0.20)<br>3. `match.js: _handleDefensiveAction`：success_factor=1+pressing×0.10、foul_p=base×(1+pressing×0.20)<br>4. 始终读取**防守方**的 pressing（不是进攻方） | 见各处 |

---

## 球员能力 → 行为成功率

任何 `calcProb` 调用都用 `myScore / (myScore + w * oppScore)` 形式，其中 myScore 是行为执行者的相关属性加权和。这保证：
- 谁更强谁更可能成功
- 倾向只调权重和触发频率，不绕过球员能力

特殊：
- **门将扑救**：`gkScore = 力量输出(0.6)+触球精度(0.4)` (GK 模板里这两项分别代表"瞬间反应"和"手感")；`wSave = 0.55` (混战中 0.45)
- **抢断成功后犯规**：基础 3% + (20-纪律性)×0.9%，再 × (1 + defender_pressing × 0.20)

---

## 套路层 (Pattern) — 待 Phase 1 实施

### 套路定义约束
- **必须 2-4 个被点名球员**协同（1 人 = 个人动作；5+ 人 = 体系，应该是倾向范畴）
- 套路只**指挥被点名球员**；其余 7-9 个球员按倾向默认行为
- 套路本质是**几个情境的有意图串联**：情境是底层不可少的事实层
- 套路示例：
  - 套边（边后卫 + 边锋，2 人）
  - 前锋反跑 + 中场后插上（控球者 + 前锋 + 中场，3 人）
  - 二过一（2 人 + 1 防守者环境）
  - 压迫盯人 + 协防换位（压迫者 + 被换位者 + 协防者，3 人）

### 套路 schema (草案)
```js
"三人组边路撞墙": {
  trigger: { initial_situation: "S06", h: ["L","R"] },
  expected_chain: [
    { sid: "S06", preferred_action: "A2",
      executor_attrs: ["触球精度", "队友识别"],
      success_transition_to: "S07" },
    { sid: "S07", preferred_action: "A1",
      executor_attrs: ["触球精度", "决断速度"],
      success_transition_to: "S05" },
    { sid: "S05", preferred_action: "A1",
      executor_attrs: ["触球精度", "对手识别"],
      success_transition_to: "S13" }
  ],
  abort_if: "actual_next_situation !== success_transition_to",
  proficiency_per_player: { /* pid -> 0-100 */ }
}
```

### 套路矛盾处理
玩家可能设矛盾的倾向+套路（如低位防守 + 高位压迫陷阱套路）：
- **允许且套路完全覆盖**：套路触发时球员前压执行，结束后回到低位。还原"低位防守球队偶尔变招"。

---

## 校验指标（每次修改后必须跑）

`node test_analysis.js 1000`，预期：
- `safe ↔ tempo` r < -0.20 ✓
- `hold ↔ tempo` r < -0.20 ✓
- `risky ↔ tempo` r > 0.10 ✓
- `dribble ↔ tempo` r > 0.10 ✓
- `tackle ↔ pressing` r > 0.05 ✓
- `direct`/`clear`/`cross` ↔ 任何倾向 r 接近 0（已脱离倾向，待套路）
- 对手门将能力 → 我方进球 r < -0.05 ✓
- 对手精英人数 → 我方进球 r < -0.05 ✓
- 射正率 0.32~0.40
- 转化率 0.10~0.14
- 角球出现 > 0
