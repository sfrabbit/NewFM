# 套路库 v2 — 克洛普 vs 瓜迪奥拉

两种现代足球极端哲学的套路化表达，每个套路严格 ≥ 3 人。
设计意图：通过对比验证套路系统能否**真正捕捉哲学差异**。

## 哲学概述

| 维度 | 克洛普 (Klopp) | 瓜迪奥拉 (Guardiola) |
|---|---|---|
| 核心信条 | Heavy Metal · 反抢即反击 | Juego de Posición · 控球即防守 |
| 关键数字 | 8 秒反抢规则 | 4-3-3 → 3-2-5 进攻结构 |
| 节奏 | 垂直、快、暴力 | 横向、慢、精确 |
| 控球率目标 | 50-55%（够用就行） | 65%+（控球是手段也是目的） |
| 后场处理 | 长传找跑动 | 短传出球三角 |
| 中场角色 | 绞肉机（断球器） | 节拍器（组织者） |
| 边路角色 | 边锋内切 + 边后卫高速套上 | 边锋拉宽 + 边后卫内收 |
| 前锋角色 | 速度型反越位 | 假 9 回撤组织 |
| 推荐倾向值 | dl:+2 wd:0 tp:+2 cp:+2 pr:+2 | dl:+1 wd:-1 tp:-2 cp:+1 pr:0 |

---

## 克洛普 · 压迫哲学 5 套路

### KL-01 · 边路反抢陷阱 (Counter-Press on Loss)

> 8 秒规则的具体化：丢球瞬间不退防，最近 3 人立即反抢。利物浦招牌。

```js
{
  id: "KL_01_counter_press",
  philosophy: "klopp",
  involved: ["LOSER", "SAME_SIDE_FB", "NEAREST_CM"],  // 刚丢球者 + 同侧 FB + 最近中场
  trigger: {
    just_lost_ball: true,
    ball_zone_v: ["MID_A", "DEEP_A"],   // 高位丢球才反抢
    seconds_since_loss: "<= 8"
  },
  chain: [
    { step: 1, sid: "S15", actor: "LOSER",
      preferred_action: "A1" /* immediate pressure */,
      key_attrs: ["决断速度", "对抗", "对手识别"],
      success_transition_to: "S15" /* 仍在对抗 */ },
    { step: 2, sid: "S15", actor: "SAME_SIDE_FB",
      preferred_action: "A3" /* 上前包夹 */,
      key_attrs: ["速度", "对抗", "决断速度"],
      success_transition_to: "S16" },
    { step: 3, sid: "S16", actor: "NEAREST_CM",
      preferred_action: "A1" /* tackle */,
      key_attrs: ["防守技术", "对抗"],
      success_transition_to: "S09" /* 反抢成功立刻反击 */ }
  ],
  abort_if: "8_seconds_elapsed || opponent_long_ball",
  on_success: "进入 S09, 高位断球反击"
}
```

---

### KL-02 · 中场绞肉机 (Heavy Metal Midfield Trap)

> 双 8 号 + 6 号围困对方中场组织者，不给抬头空间。

```js
{
  id: "KL_02_midfield_grinder",
  philosophy: "klopp",
  involved: ["FIRST_PRESSER", "8_LEFT", "8_RIGHT"],  // 3 名中场围猎
  trigger: {
    opponent_carrier_role: ["DM_*", "CM_*"],
    ball_zone_v: ["MID_D", "MID_A"],
    own_pressing_intensity: ">= 1"
  },
  chain: [
    { step: 1, sid: "S15", actor: "FIRST_PRESSER",
      preferred_action: "A1" /* 直接上抢 */,
      key_attrs: ["决断速度", "对抗"],
      success_transition_to: "S15" },
    { step: 2, sid: "S15", actor: "8_LEFT",
      preferred_action: "A3" /* 封左侧传球线 */,
      key_attrs: ["足球理解", "对手识别"],
      success_transition_to: "S15" },
    { step: 3, sid: "S16", actor: "8_RIGHT",
      preferred_action: "A1" /* 封右侧或身后 */,
      key_attrs: ["集中力", "防守技术"],
      success_transition_to: "S09" /* 抢断成功 */ }
  ],
  abort_if: "opponent_one_touch_escape || pivot_turns_successfully",
  on_success: "中场断球, 直接反击"
}
```

---

### KL-03 · 内切套上前插三人组 (Mané-Robertson-Wijnaldum 模板)

> 边锋内切吸引整条防线 → 边后卫高速套上 → 中场斜插肋部。
> 利物浦 18-20 赛季最经典进攻套路。

```js
{
  id: "KL_03_winger_overlap_run",
  philosophy: "klopp",
  involved: ["W", "FB_SAME_SIDE", "CM_SAME_SIDE"],
  trigger: {
    initial_sid: "S06",
    carrier_role: "W_*",
    ball_zone_v: ["MID_A", "DEEP_A"]
  },
  chain: [
    { step: 1, sid: "S06", actor: "W",
      preferred_action: "A4" /* dribble 内切 */,
      key_attrs: ["控制技巧", "速度"],
      success_transition_to: "S05" },
    { step: 2, sid: "S05", actor: "FB_SAME_SIDE",
      preferred_action: "高速套上无球跑动",
      key_attrs: ["速度", "耐力", "队友识别"],
      success_transition_to: "S05" /* FB 接到 W 的回敲 */ },
    { step: 3, sid: "S05", actor: "CM_SAME_SIDE",
      preferred_action: "斜插肋部接传中",
      key_attrs: ["决断速度", "速度", "对手识别"],
      success_transition_to: "S13" /* 禁区混战 */ }
  ],
  abort_if: "winger_lost_ball_on_cut || FB_didnt_overlap",
  on_success: "进入 S13, 3 人形成禁区前/内点冲击"
}
```

---

### KL-04 · 长传找冲刺前锋 (Direct Verticality)

> 范戴克→萨拉赫模板。后场断球后不组织，直接长传越过中场找前锋纵深。

```js
{
  id: "KL_04_direct_long_ball",
  philosophy: "klopp",
  involved: ["LONG_PASSER", "RUNNING_STRIKER", "SUPPORTING_W"],
  trigger: {
    initial_sid: ["S01", "S02", "S15"],
    own_default_tempo: ">= 1",
    opponent_defense_high: true  /* 对方防线高才有空间 */
  },
  chain: [
    { step: 1, sid: "*", actor: "LONG_PASSER" /* CB 或 DM */,
      preferred_action: "A2" /* direct 长传 */,
      key_attrs: ["触球精度", "力量输出", "对手识别"],
      success_transition_to: "S11" /* 前锋单刀 */ },
    { step: 2, sid: "S11", actor: "RUNNING_STRIKER",
      preferred_action: "A1" /* shot 射门 */,
      key_attrs: ["速度", "力量输出", "控制技巧"],
      success_transition_to: "S19" },
    { step: 3, sid: "S09", actor: "SUPPORTING_W" /* 同侧边锋斜插辅助 */,
      preferred_action: "高速跟进备战二点",
      key_attrs: ["速度", "决断速度"],
      success_transition_to: "S13" }
  ],
  abort_if: "long_ball_short || striker_offside",
  on_success: "S11 单刀或 S13 第二落点"
}
```

---

### KL-05 · 三路反击推进 (3-Lane Counter)

> 拦截瞬间，边锋 + 中锋 + 远端边锋同时启动，三条 lane 同时压上撕扯防线。

```js
{
  id: "KL_05_three_lane_counter",
  philosophy: "klopp",
  involved: ["INTERCEPTOR", "NEAR_RUNNER", "FAR_RUNNER"],
  trigger: {
    initial_sid: "S16",
    just_won_ball: true,
    opponent_shape_disorganized: true
  },
  chain: [
    { step: 1, sid: "S16", actor: "INTERCEPTOR",
      preferred_action: "A3" /* 一脚出球 */,
      key_attrs: ["触球精度", "决断速度", "队友识别"],
      success_transition_to: "S09" },
    { step: 2, sid: "S09", actor: "NEAR_RUNNER" /* 通常 W 或 ST */,
      preferred_action: "A1" /* dribble 高速推进 */,
      key_attrs: ["速度", "控制技巧"],
      success_transition_to: "S07" },
    { step: 3, sid: "S07", actor: "FAR_RUNNER" /* 远端边锋斜跑接应 */,
      preferred_action: "A1" /* 接传冲刺 */,
      key_attrs: ["速度", "队友识别"],
      success_transition_to: "S11" }
  ],
  abort_if: "no_outlet_options || opponent_recovers_shape",
  on_success: "S11 射门, 反击完成"
}
```

---

## 瓜迪奥拉 · 控球哲学 5 套路

### PG-01 · 3-2 后场出球结构 (Build-up with Inverted Pivot)

> 罗德里下沉，与双 CB 形成三人后场+1 接应。瓜帅曼城招牌出球形态。

```js
{
  id: "PG_01_3_2_build_up",
  philosophy: "guardiola",
  involved: ["GK", "CB_BOTH", "DROP_DM", "ROAMING_CM"],  // 4 人
  trigger: {
    initial_sid: ["S20", "S01", "S02"],
    own_default_tempo: "<= 0",
    own_compactness: ">= 0"
  },
  chain: [
    { step: 1, sid: "S20", actor: "GK",
      preferred_action: "A3" /* 短传给 CB */,
      key_attrs: ["触球精度", "集中力", "对手识别"],
      success_transition_to: "S02" },
    { step: 2, sid: "S02", actor: "CB",
      preferred_action: "A1" /* 短传给下沉 DM */,
      key_attrs: ["触球精度", "队友识别", "决断速度"],
      success_transition_to: "S03" },
    { step: 3, sid: "S03", actor: "DROP_DM",
      preferred_action: "A1" /* 一脚转移对侧 */,
      key_attrs: ["足球理解", "触球精度", "对手识别"],
      success_transition_to: "S04" /* 中场控制阶段 */ },
    { step: 4, sid: "S04", actor: "ROAMING_CM",
      preferred_action: "A1" /* 接球继续组织 */,
      key_attrs: ["足球理解", "队友识别"],
      success_transition_to: "S04" /* 套路结束, 进入正常组织 */ }
  ],
  abort_if: "any_step_under_high_pressure || pass_lost",
  on_success: "建立中前场组织, 阵型已成 3-2-5",
  failure_consequence: "后场失球, 对手单刀"
}
```

---

### PG-02 · 内收边后卫 + 第三人 (Inverted FB + Third Man)

> 坎塞洛/沃克内收成中场，边锋拉宽，中场前插制造数量优势。

```js
{
  id: "PG_02_inverted_fb_third_man",
  philosophy: "guardiola",
  involved: ["INVERTED_FB", "WIDE_W", "ARRIVING_AM"],
  trigger: {
    initial_sid: "S04",
    ball_zone_v: ["MID_D", "MID_A"],
    own_attacking_width: "<= 0"  /* 必须有内收倾向 */
  },
  chain: [
    { step: 1, sid: "S04", actor: "INVERTED_FB" /* 已内收到中路 */,
      preferred_action: "A1" /* safe 短传给拉宽边锋 */,
      key_attrs: ["触球精度", "队友识别"],
      success_transition_to: "S06" },
    { step: 2, sid: "S06", actor: "WIDE_W",
      preferred_action: "A3" /* pass 一脚回给 */,
      key_attrs: ["触球精度", "对手识别", "决断速度"],
      success_transition_to: "S05" /* 球到半空间 */ },
    { step: 3, sid: "S05", actor: "ARRIVING_AM" /* 第三人前插 */,
      preferred_action: "A2" /* pass 直塞或继续推进 */,
      key_attrs: ["决断速度", "队友识别", "足球理解"],
      success_transition_to: "S07" }
  ],
  abort_if: "winger_didnt_widen || third_man_didnt_arrive",
  on_success: "进入 S07, 通过第三人原理打入禁区前沿"
}
```

---

### PG-03 · 中场菱形三角推进 (Tiki-Taka Triangle)

> 哈维-伊涅斯塔-布斯克茨, 现在罗德里-B 席-福登。
> 三人短传循环, 用第三人原理逐步推进, 不冒险长传。

```js
{
  id: "PG_03_midfield_triangle",
  philosophy: "guardiola",
  involved: ["DM", "CM_LEFT", "AM_OR_CM_RIGHT"],
  trigger: {
    initial_sid: ["S03", "S04"],
    ball_zone_v: ["MID_D", "MID_A"],
    own_default_tempo: "<= 0"
  },
  chain: [
    { step: 1, sid: "S03|S04", actor: "DM",
      preferred_action: "A1" /* safe 短传给 8 号 */,
      key_attrs: ["触球精度", "队友识别"],
      success_transition_to: "S04" },
    { step: 2, sid: "S04", actor: "CM_LEFT",
      preferred_action: "A1" /* 一脚回给 DM 或 fwd */,
      key_attrs: ["触球精度", "决断速度", "足球理解"],
      success_transition_to: "S04" },
    { step: 3, sid: "S04", actor: "AM_OR_CM_RIGHT" /* 第三人 */,
      preferred_action: "A3" /* direct 推进或转移 */,
      key_attrs: ["足球理解", "对手识别", "触球精度"],
      success_transition_to: "S05" /* 进入半空间 */ }
  ],
  abort_if: "any_pass_lost || triangle_broken_by_press",
  on_success: "进入 S05, 阵型已推进到 MID_A 半空间"
}
```

---

### PG-04 · 假 9 回撤 + 内锋包抄 (False 9 + IF Inversion)

> 梅西/费尔米诺/福登/哈兰德（偶尔）。中锋回撤吸引中卫前压, 双内锋反向插入空当。

```js
{
  id: "PG_04_false_9",
  philosophy: "guardiola",
  involved: ["FALSE_9", "IF_LEFT_OR_RIGHT", "FEEDING_AM"],
  trigger: {
    initial_sid: "S08",
    striker_role: "ST_*",
    opponent_cb_high: true  /* 对方 CB 不会跟上来才容易 */
  },
  chain: [
    { step: 1, sid: "S08", actor: "FALSE_9",
      preferred_action: "A1" /* hold 回撤护球 */,
      key_attrs: ["触球精度", "对抗", "足球理解"],
      success_transition_to: "S03|S04" /* 吸引 CB 跟出 */ },
    { step: 2, sid: "S04", actor: "FEEDING_AM",
      preferred_action: "A4" /* risky 直塞内锋插入空当 */,
      key_attrs: ["触球精度", "对手识别", "决断速度"],
      success_transition_to: "S07" },
    { step: 3, sid: "S07", actor: "IF_LEFT_OR_RIGHT",
      preferred_action: "A1" /* 接球, 通常已是单刀或近射 */,
      key_attrs: ["速度", "控制技巧", "决断速度"],
      success_transition_to: "S11" }
  ],
  abort_if: "CB_didnt_step_up || no_IF_invasion",
  on_success: "S11 射门, 通常是好机会"
}
```

---

### PG-05 · 短角球三人重组 (Short Corner Reorganize)

> 瓜帅角球招牌：不直接传, 先短传重组阵型再选择传中路线。
> 利用对方禁区防守阵型混乱的几秒。

```js
{
  id: "PG_05_short_corner_reorg",
  philosophy: "guardiola",
  involved: ["CORNER_TAKER", "NEAR_RECEIVER", "CROSS_DELIVERER"],
  trigger: {
    set_piece: "corner"
  },
  chain: [
    { step: 1, sid: "S22", actor: "CORNER_TAKER",
      preferred_action: "A3" /* safe 短传 */,
      key_attrs: ["触球精度", "决断速度"],
      success_transition_to: "S22" /* 仍是角球阶段 */ },
    { step: 2, sid: "S22", actor: "NEAR_RECEIVER",
      preferred_action: "A3" /* 短传回 */,
      key_attrs: ["触球精度", "对抗"],
      success_transition_to: "S06" /* 球到边路, 已脱离角球 */ },
    { step: 3, sid: "S06", actor: "CROSS_DELIVERER",
      preferred_action: "A1" /* 调整后传中 */,
      key_attrs: ["触球精度", "对手识别"],
      success_transition_to: "S13" }
  ],
  abort_if: "first_short_pass_intercepted",
  on_success: "S13 禁区混战, 但对手已乱"
}
```

---

## 头碰头：当克洛普遇见瓜迪奥拉

最有意思的部分。**两个体系在同一情境节点上做完全相反的选择**。

| 情境节点 | 克洛普选择 | 瓜迪奥拉选择 | 谁赢取决于 |
|---|---|---|---|
| **S02 后场低压出球** | KL-04 长传跳过中场 | PG-01 3-2 短传组织 | 我方 GK/CB 长传 vs 短传属性、对方压迫强度 |
| **S04 中场控制（对方拿球）** | KL-02 三人绞肉机 | （无套路, 退守倾向）| Klopp 压迫成功率 vs Pep 中场属性 |
| **S04 中场控制（我方拿球）** | （无套路, 直传纵深倾向）| PG-03 菱形传递 | Pep 中场属性 vs Klopp 压迫强度 |
| **S06 边路** | KL-03 内切+套上+前插 | PG-02 内收+第三人 | 边卫属性差异（速度 vs 视野） |
| **S08 前锋背身** | （无套路, 个人选择）| PG-04 假 9 联动 | Pep 中锋视野/对抗 + 内锋速度 |
| **刚丢球瞬间** | KL-01 8 秒反抢 | （无套路, 倾向直接退守保持阵型）| Klopp 反抢效率 vs Pep 出球控球能力 |
| **角球** | （无套路, 直接传中）| PG-05 短角球重组 | Pep 套路熟练度 vs Klopp 防角球能力 |

### 这张表能验证套路系统是否成立

如果引擎跑 Klopp vs Pep 1000 场, 应该看到：

1. **Klopp 控球率 < Pep**（PG-01/PG-03 提升 Pep 控球，KL-04 主动放弃控球）
2. **Klopp 失球率高但反击进球多**（KL-01 反抢失败 → 单刀，KL-05 反击成功率高）
3. **Pep 短传成功率高但被反抢丢的球多**（PG-01 失败时灾难性）
4. **Klopp 比赛节奏快**（少传球多直传）
5. **Pep 比赛节奏慢但禁区前次数多**（PG-02/PG-03 切入半空间）
6. **两队都打瓜帅式后场出球**（PG-01）时控球率会拉平 → 说明套路是关键差异源

如果跑出来的数据**没有显示这些差异**, 说明套路系统在引擎里没起到效果, 还是属性主导, 那就要回头检查 `proficiency` 影响系数和 `matchPattern` 的覆盖逻辑。

---

## 下一步建议

1. **挑 KL-01 (反抢) + KL-03 (套上前插) + PG-01 (3-2 出球) + PG-03 (菱形)** 4 个先做 Phase 1 引擎集成
2. 建两个测试队伍：
   - 红队：克洛普倾向 + 5 套 KL 套路, 球员训练完成度 80%
   - 蓝队：瓜帅倾向 + 5 套 PG 套路, 球员训练完成度 80%
3. 跑 100 场对决, 看上表的 6 个预测是否成立
4. **如果数据呼应预测 → 套路系统验证成功, 进入 Phase 2 扩展**
5. 如果不呼应 → 引擎缺陷诊断, 重新设计 `proficiency` 调制

---

## 当前 schema 暴露的不足（需要 Phase 1 之前明确）

1. `actor` 字段允许 `"W"`, `"FB_SAME_SIDE"`, `"INVERTED_FB"` 等**语义角色**, 不是 raw 角色 ID。需要一个"角色匹配器"把语义角色映射到具体球员。
2. `trigger` 里有 `just_lost_ball`, `seconds_since_loss`, `opponent_cb_high` 这种**临时状态**, 当前引擎没有这些状态变量。需要在 GameState 里增加。
3. `success_transition_to` 写 `"S04"` 不够, 应该是 `["S04", "MID_A", "C"]` 这种 sid+region 联合判定。
4. `preferred_action` 有些是 `"A1"`, 有些是文字描述 `"高速套上无球跑动"` — 后者需要新增 action 类型, 或承认"该步骤不是动作而是跑位"（要新建 movement 一等公民）。

这些问题不影响 schema 落地，但要在 Phase 1 之前在 spec 里写明。
