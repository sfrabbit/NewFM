# 套路库 v1 — 10 个基础攻防套路

基于最近 20 年（2005-2025）主流足球的常见战术逻辑。每个套路严守 **2-4 人协同** 上限，
其余球员按倾向默认行为；套路被引擎激活时**覆盖该 2-4 人的动作选择**。

文档约定：
- `参与` = 被套路指挥的具体角色，2-4 人
- `触发` = 引擎检测到该情境/条件时尝试激活套路
- `情境链` = 期望的 sid → action → 下一情境 序列
- `中止` = 实际情境转移与期望不符，套路放弃，回归倾向驱动
- `关键属性` = 该步执行者的成功率主要由这些属性决定

---

## 进攻套路（6 个）

### ATK-01 · 边路套上传中 (Overlap + Cross)

> **现实参照**：阿诺德/罗伯逊在利物浦、戴维斯在拜仁、坎塞洛在曼城。
> 边锋内切吸引边后卫，本队边后卫从外道高速套上接球传中。
> 用了 20 年仍然是边路最经典的进攻组织方式。

```js
{
  id: "ATK_01_overlap_cross",
  name: "边路套上传中",
  involved: ["W_L|W_R", "FB_L|FB_R"],  // 同侧边锋 + 边后卫
  trigger: {
    initial_sid: "S06",        // 边路进攻
    carrier_role: "W_*",
    lane: ["L", "R"]
  },
  chain: [
    { step: 1, sid: "S06", actor: "W",
      preferred_action: "A4" /* dribble 内切 */,
      key_attrs: ["控制技巧", "速度", "对手识别"],
      success_transition_to: "S05" /* 半空间 */ },

    { step: 2, sid: "S05", actor: "W",
      preferred_action: "A2" /* pass 回敲套上的 FB */,
      key_attrs: ["触球精度", "队友识别"],
      success_transition_to: "S06" /* 球回到边路, 但持球者是 FB */ },

    { step: 3, sid: "S06", actor: "FB",
      preferred_action: "A1" /* cross 传中 */,
      key_attrs: ["触球精度", "决断速度"],
      success_transition_to: "S13" /* 禁区混战 */ }
  ],
  abort_if: "carrier_changed_to_non_involved || ball_lost",
  on_success: "进入 S13, 套路结束, 后续由 S13 自身处理"
}
```

---

### ATK-02 · 二过一 (One-Two / Wall Pass)

> **现实参照**：所有时代都用，瓜迪奥拉时代被推到极致；伊涅斯塔、莫德里奇的招牌。
> 控球者短传给接应队友，接应者一脚回敲到控球者跑动方向，越过盯防球员。

```js
{
  id: "ATK_02_one_two",
  name: "二过一",
  involved: ["CARRIER", "WALL"],  // 控球者 + 撞墙队友, 角色不限
  trigger: {
    initial_sid: ["S04", "S05", "S03"],
    pressure: "high",   // 高压力下二过一价值最大
    nearby_teammate: true
  },
  chain: [
    { step: 1, sid: "*", actor: "CARRIER",
      preferred_action: "pass_to_wall",
      key_attrs: ["触球精度", "决断速度", "对手识别"],
      success_transition_to: "*" /* 接应者所在情境 */ },

    { step: 2, sid: "*", actor: "WALL",
      preferred_action: "one_touch_return",
      key_attrs: ["触球精度", "队友识别", "决断速度"],
      success_transition_to: "S07" /* 控球者跑到前方接球, 形成直塞机会 */ }
  ],
  abort_if: "wall_pressured_by_2+_defenders || carrier_didnt_run",
  on_success: "进入 S07, 控球者接球继续推进"
}
```

---

### ATK-03 · 中前场直塞反越位 (Through Ball Behind)

> **现实参照**：哈维-梅西、贝尔纳多-哈兰德、莫德里奇-本泽马。
> 中前场拿球队员看到前锋反越位启动的瞬间，地面直塞穿过防线。

```js
{
  id: "ATK_03_through_ball",
  name: "中前场直塞反越位",
  involved: ["PASSER", "STRIKER"],
  trigger: {
    initial_sid: "S07",  // 直塞机会
    carrier_role: ["CM_C", "AM_*", "CM_*"],
    striker_role: ["ST_*", "IF_*", "W_*"]
  },
  chain: [
    { step: 1, sid: "S07", actor: "PASSER",
      preferred_action: "A1" /* risky 地面直塞 */,
      key_attrs: ["触球精度", "队友识别", "决断速度"],
      success_transition_to: "S11" /* 射门时机, 单刀 */ },

    { step: 2, sid: "S11", actor: "STRIKER",
      preferred_action: "A1" /* shot 单刀射门 */,
      key_attrs: ["力量输出", "控制技巧", "集中力"],
      success_transition_to: "S19" /* GK 扑救 */ }
  ],
  abort_if: "offside || pass_intercepted || striker_too_late",
  on_success: "进入 S19, 射门已发生"
}
```

---

### ATK-04 · 中锋回做+后插上 (Striker Drop + Late Run)

> **现实参照**：贝尔纳多-亨德森、哈兰德-德布劳内的"假9伪9联动"、
> C罗-埃辛时代的中场后插。Klopp、Tuchel 喜欢用这套撕开退守阵型。

```js
{
  id: "ATK_04_drop_and_run",
  name: "中锋回做后插上",
  involved: ["ST", "DROP_RECEIVER", "LATE_RUNNER"],  // 3 人
  trigger: {
    initial_sid: "S08",  // 前锋背身拿球
    striker_role: "ST_*"
  },
  chain: [
    { step: 1, sid: "S08", actor: "ST",
      preferred_action: "A3" /* pass 转身回做 */,
      key_attrs: ["对抗", "触球精度", "队友识别"],
      success_transition_to: "S04" /* 球到回撤接应的中场 */ },

    { step: 2, sid: "S04", actor: "DROP_RECEIVER",
      preferred_action: "A4" /* risky 直塞 */ ,
      key_attrs: ["触球精度", "队友识别", "对手识别"],
      success_transition_to: "S07" },

    { step: 3, sid: "S07", actor: "LATE_RUNNER",
      preferred_action: "A1" /* risky 接球 */,
      key_attrs: ["决断速度", "速度", "控制技巧"],
      success_transition_to: "S11" }
  ],
  abort_if: "striker_lost_ball_in_back_to_goal || no_late_runner_arrived",
  on_success: "进入 S11, 后插上球员获得射门机会"
}
```

---

### ATK-05 · 长传转移 (Switch of Play)

> **现实参照**：阿隆索时代皇马、阿诺德式后腰长传、坎特/罗德里的转移。
> 一侧被压迫到只剩一条路时，后腰一脚长传越过两个 lane 找远端边锋。

```js
{
  id: "ATK_05_switch_play",
  name: "长传转移",
  involved: ["LIBERO", "FAR_WINGER"],
  trigger: {
    initial_sid: "S04",  // 中场控制
    carrier_role: ["DM_C", "CM_*", "CB_*"],
    pressure: "high",
    same_side_overload: true   // 同侧人多压迫
  },
  chain: [
    { step: 1, sid: "S04", actor: "LIBERO",
      preferred_action: "A3" /* direct 长传转移 */,
      key_attrs: ["触球精度", "力量输出", "对手识别"],
      success_transition_to: "S06" /* 球到远端边路 */ },

    { step: 2, sid: "S06", actor: "FAR_WINGER",
      preferred_action: "A4" /* dribble 突破 */ ,
      key_attrs: ["控制技巧", "速度"],
      success_transition_to: "S05" /* 内切 */ }
  ],
  abort_if: "long_ball_short || winger_not_in_position",
  on_success: "进入 S05/S06, 远端展开新一轮进攻"
}
```

---

### ATK-06 · 后场短传出球 (Short Build-up from Back)

> **现实参照**：瓜迪奥拉自巴萨开始的招牌、阿尔特塔阿森纳、德泽尔比布莱顿。
> 门将-中卫-后腰形成三角，吸引对方高位压迫后通过精确短传破防。
> 高风险高回报：成功则直接进入对方半场无防守状态。

```js
{
  id: "ATK_06_short_build_up",
  name: "后场短传出球",
  involved: ["GK", "CB", "DM"],  // 3 人三角
  trigger: {
    initial_sid: ["S20", "S01", "S02"]
  },
  chain: [
    { step: 1, sid: "S20", actor: "GK",
      preferred_action: "A3" /* safe 短传后卫 */,
      key_attrs: ["触球精度", "决断速度"],
      success_transition_to: "S02" /* 后卫接球, 假设无高压 */ },

    { step: 2, sid: "S02", actor: "CB",
      preferred_action: "A1" /* safe 短传到 DM */,
      key_attrs: ["触球精度", "队友识别", "集中力"],
      success_transition_to: "S03" /* 中场接应 */ },

    { step: 3, sid: "S03", actor: "DM",
      preferred_action: "A3" /* pass 分边 */,
      key_attrs: ["对手识别", "触球精度", "足球理解"],
      success_transition_to: "S06" /* 球到边路 */ }
  ],
  abort_if: "any_step_under_high_pressure || lost_ball",
  on_success: "进入 S06, 已建立中前场进攻",
  failure_consequence: "极高危险 — 后场失球意味着对手直接面对门将"
}
```

---

## 防守套路（4 个）

### DEF-01 · 高位边路诱导包夹 (High Press Side Trap)

> **现实参照**：克洛普利物浦、波切蒂诺热刺、纳格尔斯曼莱比锡。
> 第一压迫者故意切断中路传球线，强迫对方传向边路；
> 同侧边后卫 + 中场上前包夹。靠边线作为"第十二个防守者"。

```js
{
  id: "DEF_01_press_side_trap",
  name: "高位边路诱导包夹",
  involved: ["FIRST_PRESSER", "FB", "CM"],  // 3 人
  trigger: {
    opponent_sid: ["S01", "S02"],   // 对方在后场出球
    own_pressing_intensity: ">= 1",  // 倾向上要求高压
    opponent_carrier_role: ["GK", "CB_*"]
  },
  chain: [
    { step: 1, sid: "S15", actor: "FIRST_PRESSER" /* 通常 ST 或 W */,
      preferred_action: "A1" /* tackle, 但意图是切断中路 */,
      key_attrs: ["决断速度", "对手识别", "足球理解"],
      success_transition_to: "S15" /* 对方被迫传边, 仍在己方半场 */ },

    { step: 2, sid: "S15", actor: "FB",
      preferred_action: "A3" /* tackle 上前包夹 */,
      key_attrs: ["对抗", "防守技术", "速度"],
      success_transition_to: "S16" /* 抢断尝试 */ },

    { step: 3, sid: "S16", actor: "CM" /* 协防到位 */,
      preferred_action: "A1" /* tackle */,
      key_attrs: ["防守技术", "对抗", "集中力"],
      success_transition_to: "S09" /* 反击启动 */ }
  ],
  abort_if: "opponent_long_ball_over_press",
  on_success: "断球进入 S09, 反击启动"
}
```

---

### DEF-02 · 中场拦截转反击 (Midfield Interception → Counter)

> **现实参照**：穆里尼奥早期切尔西、孔蒂尤文/切尔西、西蒙尼马竞。
> 不一定高位，但中场断球瞬间立刻直传纵深，趁对方阵型未回防时反击。
> "断球即反击"是过去 20 年防反球队的命脉。

```js
{
  id: "DEF_02_interception_counter",
  name: "中场拦截转反击",
  involved: ["INTERCEPTOR", "OUTLET"],  // 拦截者 + 直接接应的反击出口
  trigger: {
    initial_sid: ["S15", "S16"],
    defender_role: ["DM_*", "CM_*", "FB_*"]
  },
  chain: [
    { step: 1, sid: "S15", actor: "INTERCEPTOR",
      preferred_action: "A3" /* tackle 干净抢断 */,
      key_attrs: ["防守技术", "决断速度", "对手识别"],
      success_transition_to: "S16" },

    { step: 2, sid: "S16", actor: "INTERCEPTOR",
      preferred_action: "A3" /* pass 一脚出球 */,
      key_attrs: ["触球精度", "队友识别", "决断速度"],
      success_transition_to: "S09" /* 反击 */ },

    { step: 3, sid: "S09", actor: "OUTLET" /* 通常 W 或 ST 拉边 */,
      preferred_action: "A1" /* dribble 高速推进 */,
      key_attrs: ["速度", "控制技巧", "决断速度"],
      success_transition_to: "S07|S11" }
  ],
  abort_if: "no_outlet_visible || interception_messy",
  on_success: "进入 S07 或 S11, 反击进入决断阶段",
  notes: "和 ATK_03/ATK_04 可以无缝衔接 — 反击套路出口接进攻套路入口"
}
```

---

### DEF-03 · 越位陷阱 (Offside Trap)

> **现实参照**：本格尔阿森纳、海因克斯拜仁、阿尔特塔阿森纳新版（萨利巴-加布里埃尔的统一前压）。
> 后卫线在对方传球瞬间整体压上 2-3 米，让前锋陷入越位。
> 风险极高，被破解一次就是单刀。

```js
{
  id: "DEF_03_offside_trap",
  name: "越位陷阱",
  involved: ["CB_LEADER", "CB_PAIR", "FB"],  // 防线领袖 + 同侧后卫
  trigger: {
    opponent_sid: ["S07"],   // 对方即将打直塞
    own_defensive_line: ">= 0",   // 必须不是低位才能玩
    own_compactness: ">= 0"       // 阵型不能太散
  },
  chain: [
    { step: 1, sid: "S15", actor: "CB_LEADER",
      preferred_action: "step_up_synchronized",
      key_attrs: ["决断速度", "队友识别", "足球理解", "集中力"],
      success_transition_to: "S17" /* 对方越位, 球权切换 */ }
  ],
  abort_if: "one_defender_didnt_step_up || timing_off",
  on_success: "判越位, 球权切换",
  failure_consequence: "前锋单刀 — S11 给对方"
}
```

---

### DEF-04 · 协防换位 (Defensive Cover Swap)

> **现实参照**：边后卫上抢失败被过, 中后卫横移补位, 后腰回撤填空。
> 不是花哨的招式, 但顶级球队（皇马、曼城、阿森纳）每场都在做。
> "看不见的套路", 决定一支队伍防守的下限。

```js
{
  id: "DEF_04_cover_swap",
  name: "协防换位",
  involved: ["BEATEN_FB", "COVER_CB", "FILL_DM"],  // 3 人
  trigger: {
    initial_sid: "S15",
    defender_just_beaten: "FB_*",   // 边后卫刚被过
    opponent_in_zone: "MID_A_*|DEEP_A_*"
  },
  chain: [
    { step: 1, sid: "S17", actor: "COVER_CB",
      preferred_action: "A2" /* tackle 横移补位 */,
      key_attrs: ["速度", "防守技术", "决断速度"],
      success_transition_to: "S15" /* 重新建立对抗 */ },

    { step: 2, sid: "S15", actor: "COVER_CB",
      preferred_action: "A1" /* tackle 上抢 */,
      key_attrs: ["防守技术", "对抗", "集中力"],
      success_transition_to: "S16" },

    { step: 3, sid: "*", actor: "FILL_DM",
      preferred_action: "drop_to_cover_cb_space",
      key_attrs: ["足球理解", "集中力", "队友识别"],
      success_transition_to: "*" /* 阵型重新平衡 */ }
  ],
  abort_if: "cover_cb_too_slow || no_dm_to_fill",
  on_success: "防守阵型重新成形, 没有送出明显空当",
  failure_consequence: "禁区空当 — 对方进入 S11/S13"
}
```

---

## 结构性观察

### 当前情境字典 (S01-S23) 的覆盖度评估

10 个套路中能完全用现有情境表达的：**ATK_02, ATK_03, ATK_04, ATK_05, ATK_06, DEF_02**（6 个）

需要新概念/动作的：
- **ATK_01** 第 2 步"回敲套上 FB" — 现有 S05_A2 (pass) 没区分接应者是谁；引擎需要记住"FB 当前是套上状态"
- **DEF_01** 步骤 1 "切断中路 + 强迫向边" — 现有 S15 的 tackle 动作没有"意图区分"；需要新 action subtype 或新 sid (S24_press_trap)
- **DEF_03** "防线统一前压制造越位" — 现有引擎根本没建模越位；要么新增 sid，要么用一个简单几率代替
- **DEF_04** 步骤 3 "拖后中场回撤填空" — 现有引擎没有"非控球者主动跑位"的概念

### 暴露的引擎缺口（按优先级）

1. **跑位/接应作为一等公民** — 套路里很多步骤的执行者**不持球**，引擎现在只算持球者
2. **意图区分** — 同一个 action (tackle, pass) 在不同套路里意图不同, 需要 sub-tag
3. **越位规则** — 完全没建模
4. **球员动态状态** — "刚刚被过的边后卫"、"已经套上的边后卫" 这种短期状态没有

### Schema 共性提炼（成为正式 schema 的基础）

每个套路至少要有：
- `id`、`name`
- `involved`: 2-4 个角色占位符（用 `|` 表示候选, `*` 表示通配）
- `trigger`: 初始情境 + 角色限定 + 全局倾向条件 + 球员相对位置
- `chain`: 步骤数组, 每步 {sid, actor, preferred_action, key_attrs, success_transition_to}
- `abort_if`: 中止条件
- `on_success` / `failure_consequence`: 退出语义

---

## 下一步建议

1. **挑这 10 个里 2-3 个最直接的（建议 ATK_03 直塞 + ATK_06 后场出球 + DEF_02 拦截反击）做 Phase 1 引擎集成**：
   - 它们完全在现有情境字典里
   - 已能验证 schema、`matchPattern` 主循环、`proficiency` 调制是否跑通
2. **暴露的引擎缺口（跑位/越位/状态）作为 Phase 2-3 的扩展任务**，不阻塞 Phase 1
3. **跟你确认 schema 后**，把 10 个套路全部转为 JSON 格式数据文件，作为后续编辑器和扩展库的种子
