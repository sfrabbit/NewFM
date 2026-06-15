# 逻辑依赖图谱 (Logic Dependency Graph)

## 图谱说明

本文档记录引擎中所有核心假设、推导、实现之间的依赖关系。

**格式**：
- `→` 表示推导依赖（A → B 表示 B 依赖 A）
- `⇒` 表示分类/分支关系
- `[文件:行号]` 表示实现位置
- `⚠️` 标记高影响节点（变更会级联影响多个下游）

---

## 第一层：核心物理假设（根基层）

### H1: 连续逻辑原则
```
H1: 所有判断基于连续变量，无硬编码阈值
    → H1.1: 距离/角度/压力用连续函数
    → H1.2: 属性影响用加权公式而非分段
    → H1.3: 结果概率平滑过渡
    
实现位置:
- [pass.js:15-25] 传球成功率连续模型
- [dribble.js:20-30] 盘带突破连续模型
- [shoot.js:25-35] 射门转化率连续模型
- [tackle.js:30-40] 抢断胜率连续模型
- [contest.js:35-45] 争顶胜率连续模型

下游影响:
→ 所有模块的阈值判断逻辑
→ 测试验证的单调性检查
```

### H2: 物理推导优先原则
```
H2: 公式从物理过程推导，非数据拟合
    → H2.1: 每个参数必须有物理含义
    → H2.2: 数据仅用于事后验证，不参与公式构造
    → H2.3: 无法物理解释的差异需重新审视模型

实现位置:
- [pass.js:8-12] 物理推导注释
- [tackle.js:8-18] 脚速竞赛模型
- [contest.js:12-28] 双质点碰撞模型

下游影响:
→ 所有公式参数的定义
→ 校准锚点的选择标准
```

### H3: 情境分类原则
```
H3: 情境由物理状态决定，非位置/角色硬编码
    → H3.1: 对手控球状态是关键区分
    → H3.2: 中性球争夺 vs 主动抢断 物理本质不同
    → H3.3: 意图（争球权/解围）是同一物理起点的分支

实现位置:
- [situations.js:127-145] 情境判断逻辑

下游影响:
→ 模块划分（tackle vs contest）
→ 路由规则
→ 属性权重分配
```

---

## 第二层：核心概念定义

### C1: Tackle（抢断）定义 ⚠️
```
C1: Tackle = 防守方对持球者的主动抢断
    物理本质: 脚速竞赛
    触发条件: matchContext.opponent_has_ball === true
    
    C1.1: 防守方有先手优势（initiative = 0.93）
        → C1.1.1: 同等属性下防守方略优
        → [tackle.js:54] INITIATIVE常量
    
    C1.2: 关键属性权重
        → C1.2.1: tackling 40%（出脚准确度）
        → C1.2.2: burst 35%（逼近加速度）
        → C1.2.3: aggression 25%（时机判断）
        → [tackle.js:52-53] TACKLE_ATTRS
    
    C1.3: 犯规概率模型
        → C1.3.1: 技术/侵略比决定基础犯规率
        → C1.3.2: 速度增加犯规风险
        → [tackle.js:75-86] tackleFoulProb

依赖上游:
- H1（连续逻辑）
- H2（物理推导）
- H3.1（对手控球状态区分）

下游影响:
→ [situations.js:130-134] 路由到tackle模块
→ [tackle.test.js] 测试验证逻辑
```

### C2: Contest（争顶）定义 ⚠️
```
C2: Contest = 双方对中性球的争夺
    物理本质: 双质点碰撞 / 垂直竞赛
    触发条件: matchContext.opponent_has_ball === false（中性球）
    
    C2.1: 子类型区分
        → C2.1.1: aerial（空中争顶）
            - 物理: 垂直跳跃竞赛 + 空中稳定
            - 属性: jumping 50%, strength 30%, heading 20%
            - [contest.js:47-51] CONTEST_TYPES.aerial
        
        → C2.1.2: shoulder（身体卡位）
            - 物理: 双质点水平碰撞
            - 属性: strength 55%, balance 45%
            - [contest.js:54-60] CONTEST_TYPES.shoulder
    
    C2.2: 意图分支（同一物理起点）
        → C2.2.1: possession（争球权）
            - 目标: 控制球权
            - 结果: win/lose 二元
        
        → C2.2.2: clearance（解围）
            - 目标: 破坏球出危险区
            - 结果: success/partial/fail 三元
            - 依赖: C2.2.2.1 解围质量系数
            - [contest.js:115-155] clearanceResult

依赖上游:
- H1（连续逻辑）
- H2（物理推导）
- H3.2（中性球状态区分）
- H3.3（意图分支）

下游影响:
→ [situations.js:137-145] 路由到contest模块
→ [contest.test.js] 测试验证逻辑
→ [clear.js] 旧解围模块（将被contest替代）
```

### C3: 属性定义
```
C3: 球员属性体系（20属性 + 身高）

    C3.1: 技术属性
        → C3.1.1: passing（传球准确度）
            - 用于: [pass.js] 传球成功率
        → C3.1.2: tackling（铲球准确度）
            - 用于: [tackle.js] 抢断胜率、犯规率
        → C3.1.3: heading（头球技术）
            - 用于: [contest.js] 争顶、解围
    
    C3.2: 身体属性
        → C3.2.1: jumping（垂直弹跳）
            - 用于: [contest.js] 空中争顶
        → C3.2.2: strength（力量）
            - 用于: [contest.js] 卡位、空中稳定
        → C3.2.3: burst（爆发力）
            - 用于: [tackle.js] 逼近速度
    
    C3.3: 心理属性
        → C3.3.1: aggression（侵略性）
            - 用于: [tackle.js] 犯规概率
        → C3.3.2: composure（冷静度）
            - 用于: [contest.js] 解围质量

依赖上游:
- H2（物理含义要求）

下游影响:
→ 所有模块的属性权重
→ 球员数据结构设计
→ AI训练目标定义
```

---

## 第三层：模块实现

### M1: 传球模块 (pass.js)
```
M1: 传球成功率计算
    
    M1.1: 输入
        → M1.1.1: 传球者属性（passing, vision, composure）
        → M1.1.2: 接球者属性（positioning, anticipation）
        → M1.1.3: 上下文（distance, pressure, passType）
    
    M1.2: 核心公式
        → M1.2.1: baseAccuracy = f(distance)  // 距离衰减
        → M1.2.2: pressureMod = g(defDist, defInLane)  // 压力修正
        → M1.2.3: finalAccuracy = baseAccuracy × pressureMod × attrFactor
    
    M1.3: 输出
        → M1.3.1: successProb
        → M1.3.2: interceptionProb

依赖上游:
- H1（连续逻辑）
- H2（物理推导）
- C3.1（技术属性定义）

下游影响:
→ [situations.js:70-120] 传球情境路由
→ [match.js] 比赛流程传球判定
```

### M2: 盘带模块 (dribble.js)
```
M2: 盘带突破成功率计算
    
    M2.1: 输入
        → M2.1.1: 盘带者属性（dribbling, agility, balance）
        → M2.1.2: 防守者属性（tackling, positioning）
        → M2.1.3: 上下文（space, pressure, direction）
    
    M2.2: 核心公式
        → M2.2.1: spaceFactor = f(space)  // 空间优势
        → M2.2.2: duelProb = g(dribbling, tackling)  // 对抗胜率
        → M2.2.3: successProb = spaceFactor × duelProb × momentumMod

依赖上游:
- H1（连续逻辑）
- H2（物理推导）
- C3（属性定义）

下游影响:
→ [situations.js] 盘带情境路由
```

### M3: 射门模块 (shoot.js)
```
M3: 射门转化率计算
    
    M3.1: 输入
        → M3.1.1: 射门者属性（finishing, longShots, composure）
        → M3.1.2: 门将属性（reflexes, positioning, height）
        → M3.1.3: 上下文（distance, angle, pressure, setPiece）
    
    M3.2: 核心公式
        → M3.2.1: angleFactor = f(angle)  // 角度收窄
        → M3.2.2: distanceFactor = g(distance)  // 距离衰减
        → M3.2.3: blockFactor = h(defDist, defInLane)  // 封堵修正
        → M3.2.4: finalProb = angleFactor × distanceFactor × (1 - blockFactor) × attrDiff
    
    M3.3: 特殊处理
        → M3.3.1: setPiece === 'penalty' → PK专用逻辑
        → M3.3.2: setPiece === 'freeKick' → FK专用逻辑（含墙）

依赖上游:
- H1（连续逻辑）
- H2（物理推导）
- C3（属性定义）

下游影响:
→ [situations.js:61-64, 110-112, 125-129] 射门情境路由
→ [match.js] 进球判定
```

### M4: 抢断模块 (tackle.js) ⚠️
```
M4: 抢断成功率计算
    
    M4.1: 输入
        → M4.1.1: 防守者属性（tackling, burst, aggression）
        → M4.1.2: 持球者属性（control, balance）
        → M4.1.3: 上下文（speedDiff, fatigue, distance）
    
    M4.2: 核心公式
        → M4.2.1: defFootSpeed = tackling×0.4 + burst×0.35 + aggression×0.25
        → M4.2.2: carMoveSpeed = control×0.55 + balance×0.45
        → M4.2.3: winProb = defFootSpeed / (defFootSpeed + carMoveSpeed×0.93) × speedMod × fatigueMod
    
    M4.3: 犯规概率
        → M4.3.1: baseFoul = 0.25 / (1 + tackling/aggression)
        → M4.3.2: finalFoul = baseFoul + |speedDiff| × 0.02

依赖上游:
- H1（连续逻辑）
- H2（物理推导：脚速竞赛）
- H3.1（对手控球状态）
- C1（tackle定义）
- C3（属性定义）

下游影响:
→ [situations.js:130-134, 156-160] 抢断情境路由
→ [match.js] 球权转换判定
→ [tackle.test.js] 测试验证
```

### M5: 争顶模块 (contest.js) ⚠️
```
M5: 争顶成功率计算
    
    M5.1: 输入
        → M5.1.1: 攻击者属性（依子类型而定）
        → M5.1.2: 防守者属性（依子类型而定）
        → M5.1.3: 上下文（ballHeight, pressure, fatigue, intent）
    
    M5.2: 子类型公式
        → M5.2.1: aerial
            - atkScore = jumping×0.5 + strength×0.3 + heading×0.2
            - winProb = atkScore / (atkScore + defScore) × heightMod × fatigueMod
        
        → M5.2.2: shoulder
            - atkScore = strength×0.55 + balance×0.45
            - winProb = atkScore / (atkScore + defScore) × heightMod × fatigueMod
    
    M5.3: 意图分支
        → M5.3.1: intent === 'possession'
            - 结果: {winProb, loseProb}
        
        → M5.3.2: intent === 'clearance'
            - contestProb = 争顶胜率（vs虚拟对手）
            - clearQuality = (clearScore/12) × 0.6 × pressureFactor
            - success = contestProb × clearQuality
            - 结果: {success, partial, fail}

依赖上游:
- H1（连续逻辑）
- H2（物理推导：双质点碰撞/垂直竞赛）
- H3.2（中性球状态）
- H3.3（意图分支）
- C2（contest定义）
- C3（属性定义）

下游影响:
→ [situations.js:137-145, 156-160] 争顶情境路由
→ [match.js] 球权争夺判定
→ [contest.test.js] 测试验证
→ 替代 [clear.js] 旧解围模块
```

### M6: 门将模块 (save.js)
```
M6: 门将决策与扑救
    
    M6.1: 输入
        → M6.1.1: 门将属性（reflexes, positioning, handling）
        → M6.1.2: 射门上下文（distance, angle, shotPower）
        → M6.1.3: 比赛状态（score, time, pressure）
    
    M6.2: 决策分支
        → M6.2.1: catch（直接接球）
        → M6.2.2: parry（击出）
        → M6.2.3: tipOver（托出横梁）
        → M6.2.4: distribution（出球）

依赖上游:
- H1（连续逻辑）
- H2（物理推导）
- C3（属性定义）

下游影响:
→ [situations.js] 门将情境路由
→ [match.js] 射门结果判定
```

---

## 第四层：情境路由 (situations.js)

### R1: 情境判断逻辑 ⚠️
```
R1: determineSituation函数
    
    R1.1: 死球状态（最高优先级）
        → R1.1.1: setPiece === 'penalty' → S14
        → R1.1.2: setPiece === 'corner' → S22
        → R1.1.3: setPiece === 'free_kick' → S21
        → R1.1.4: setPiece === 'throw_in' → S23
    
    R1.2: 门将持球
        → R1.2.1: carrierRole === 'GK' → S20
    
    R1.3: 区域 + 角色 + 压力 综合判断
        → R1.3.1: v === 'BOX_D'（禁区防守）
            - 防守角色 + 高压 → S18 (contest: clearance)
            - 进攻角色 → S12/S11 (shoot/dribble)
        
        → R1.3.2: v === 'MID_D' || v === 'MID_A'（中场）
            - matchContext.opponent_has_ball === true → S15 (tackle)
            - matchContext.opponent_has_ball === false → S16 (contest)
            - 转换状态 → S09 (dribble)
        
        → R1.3.3: v === 'BOX_A' || v === 'DEEP_A'（前场）
            - 进攻角色 → S11/S08 (shoot/pass)
            - matchContext.is_breaking_away → S17 (tackle/contest)

依赖上游:
- C1（tackle定义：需要opponent_has_ball）
- C2（contest定义：需要中性球状态）
- M1-M6（各模块存在性）

下游影响:
→ [match.js] 主比赛流程
→ 所有模块的调用触发点
```

---

## 第五层：测试验证

### T1: 测试设计原则
```
T1: 测试验证物理逻辑，非数值锚点
    
    T1.1: 单调性测试
        → T1.1.1: 属性提升 → 表现提升
        → T1.1.2: 条件恶化 → 表现下降
    
    T1.2: 对称性测试
        → T1.2.1: 交换双方属性 → 胜率互补
    
    T1.3: 边界测试
        → T1.3.1: 极端属性组合
        → T1.3.2: 概率上下限检查
    
    T1.4: 物理一致性
        → T1.4.1: 结果符合物理直觉
        → T1.4.2: 参数变化方向正确

依赖上游:
- H2（物理推导优先）
- 各模块的公式定义

下游影响:
→ 模块正确性验证
→ 回归测试防护
```

### T2: 模块测试映射
```
T2: 测试文件与模块对应
    
    T2.1: [tests/pass.test.js] → M1
    T2.2: [tests/dribble.test.js] → M2
    T2.3: [tests/shoot.test.js] → M3
    T2.4: [tests/tackle.test.js] → M4
    T2.5: [tests/contest.test.js] → M5
    T2.6: [tests/save.test.js] → M6

变更影响:
- 任何模块公式变更 → 对应测试必须重新验证
- 任何假设变更 → 所有依赖该假设的测试必须重新设计
```

---

## 变更影响分析示例

### 示例1: C1（tackle定义）变更
```
如果 C1 定义改变（如 initiative 系数调整）:

直接影响:
→ M4.2.3: winProb公式需重新推导
→ M4.3: 犯规概率可能需要同步调整

测试影响:
→ T2.4: [tests/tackle.test.js] 必须重新设计
    - 先手优势测试的期望值改变
    - 边界测试的通过标准改变

路由影响:
→ R1.3.2: 虽然路由逻辑不变，但触发后的行为改变

验证要求:
- 重新推导 M4 的所有公式
- 重新设计 T2.4 的测试用例
- 验证 R1 的路由结果在新模型下是否合理
```

### 示例2: H3（情境分类原则）变更
```
如果 H3.2/H3.3 改变（中性球 vs 持球 的区分标准改变）:

直接影响:
→ C1 和 C2 的边界需要重新定义
→ R1.3.2 的路由逻辑需要重写

级联影响:
→ M4 和 M5 的适用范围需要重新划分
→ [situations.js] 中所有情境判断需要重新审视

测试影响:
→ T2.4 和 T2.5 都需要重新设计
→ 边界案例测试需要重新设计

验证要求:
- 重新定义 C1 和 C2 的边界
- 重写 R1 的路由逻辑
- 重新推导 M4 和 M5 的公式
- 重新设计所有相关测试
```

---

## 维护指南

### 添加新节点
1. 确定节点层级（假设/概念/模块/路由/测试）
2. 标注上游依赖（指向根基层的箭头）
3. 标注下游影响（被哪些节点依赖）
4. 更新相关节点的依赖列表

### 变更节点
1. 在节点标注 `[变更日期]`
2. 列出所有下游受影响节点
3. 按执行清单逐项处理
4. 更新测试验证结果

### 删除节点
1. 确认无下游依赖，或下游已更新
2. 在删除节点标注 `[已废弃，替代方案：XXX]`
3. 更新上游节点的下游影响列表

---

## 当前图谱状态

**最后更新**: 2026-06-15

**近期变更**:
- C1（tackle）从 C2（duel）中分离
- C2 重新定义（contest = aerial + shoulder + clearance意图分支）
- M4（tackle.js）新建
- M5（contest.js）重写
- R1（situations.js）路由逻辑更新
- T2.4, T2.5 测试重新设计

**待处理节点**: 无

**验证状态**: 
- ✅ M1-M3, M6: 测试通过
- ✅ M4: 12/12 测试通过
- ✅ M5: 14/14 测试通过
