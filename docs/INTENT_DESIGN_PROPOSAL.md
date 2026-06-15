# 6模块意图判断添加方案

## 核心原则

**意图判断不是额外加成，而是前置决策层。**

当前流程：物理能力 → 结果  
目标流程：意图预判 → 物理执行 → 结果

---

## 各模块意图判断设计

### 1. Pass模块（传球）

**当前缺失：**
- 传球者是否识别防守者的拦截意图？
- 传球者是否预判队友的跑位意图？

**添加方案：**
```javascript
// 新增：传球意图判断层
function passIntent(passerAttrs, context) {
  const oppRecog = passerAttrs.opponentRecognition || 10;
  const teammateRecog = passerAttrs.teammateRecognition || 10;
  
  // 1. 识别防守漏洞（基于footballUnderstanding）
  const gapRecognition = (passerAttrs.footballUnderstanding || 10) / 20;
  
  // 2. 预判队友跑位（基于teammateRecognition）
  const runAnticipation = teammateRecog / 20;
  
  // 3. 预判防守者拦截意图（基于opponentRecognition）
  const interceptAnticipation = oppRecog / 20;
  
  return {
    // 传球路线质量修正（识别漏洞 + 预判跑位 - 被拦截风险）
    routeQuality: gapRecognition * 0.4 + runAnticipation * 0.4 - interceptAnticipation * 0.2,
    // 时机选择（早传/晚传）
    timing: runAnticipation > 0.6 ? 'early' : 'normal'
  };
}

// 整合到主函数
function pass(passerAttrs, passType, context, defenderAttrs) {
  const intent = passIntent(passerAttrs, context);
  
  // 原物理计算
  const baseQuality = passQuality(passerAttrs, passType, context);
  
  // 意图修正
  const finalQuality = baseQuality * (1 + intent.routeQuality * 0.3);
  
  // ... rest of calculation
}
```

---

### 2. Dribble模块（盘带）

**当前缺失：**
- 盘带者是否预判防守者的上抢时机？
- 盘带者是否识别防守者的重心偏向？

**添加方案：**
```javascript
// 新增：盘带意图判断层
function dribbleIntent(dribblerAttrs, context) {
  const oppRecog = dribblerAttrs.opponentRecognition || 10;
  const footballUnderstanding = dribblerAttrs.footballUnderstanding || 10;
  
  // 1. 预判防守者上抢时机
  const tackleAnticipation = oppRecog / 20;
  
  // 2. 识别防守阵型漏洞
  const gapRecognition = footballUnderstanding / 20;
  
  // 3. 选择突破方向（基于预判）
  const direction = tackleAnticipation > 0.6 ? 'awayFromTackle' : 'gap';
  
  return {
    anticipationBonus: tackleAnticipation * 0.25,
    gapBonus: gapRecognition * 0.20,
    direction
  };
}
```

---

### 3. Shoot模块（射门）

**当前缺失：**
- 射门者选择射门角度的决策过程
- 射门者是否预判门将的站位倾向？

**添加方案：**
```javascript
// 新增：射门意图判断层
function shootIntent(shooterAttrs, context) {
  const oppRecog = shooterAttrs.opponentRecognition || 10;
  const footballUnderstanding = shooterAttrs.footballUnderstanding || 10;
  
  // 1. 识别门将站位漏洞
  const keeperWeakness = oppRecog / 20;
  
  // 2. 选择射门角度（近角/远角/挑射）
  const angleChoice = keeperWeakness > 0.6 ? 'farPost' : 'nearPost';
  
  // 3. 预判门将预判（博弈）
  const mindGame = footballUnderstanding / 20;
  
  return {
    targetAccuracy: keeperWeakness * 0.30,
    unpredictability: mindGame * 0.20
  };
}
```

---

### 4. Tackle模块（抢断）

**当前缺失：**
- 防守者是否预判持球者的下一步动作？
- 防守者是否识别持球者的护球习惯？

**添加方案：**
```javascript
// 新增：抢断意图判断层
function tackleIntent(defenderAttrs, context) {
  const oppRecog = defenderAttrs.opponentRecognition || 10;
  const footballUnderstanding = defenderAttrs.footballUnderstanding || 10;
  
  // 1. 预判持球者下一步动作
  const actionPrediction = oppRecog / 20;
  
  // 2. 选择抢断时机
  const timing = footballUnderstanding / 20;
  
  return {
    // 预判正确时大幅提升成功率
    predictionBonus: actionPrediction * 0.35,
    // 时机选择影响犯规概率
    timingQuality: timing * 0.20
  };
}
```

---

### 5. Contest模块（争顶）

**当前缺失：**
- 是否预判球的落点？
- 是否识别对手的起跳时机？

**添加方案：**
```javascript
// 新增：争顶意图判断层
function contestIntent(playerAttrs, context) {
  const footballUnderstanding = playerAttrs.footballUnderstanding || 10;
  const oppRecog = playerAttrs.opponentRecognition || 10;
  
  // 1. 预判落点（基于footballUnderstanding）
  const landingPrediction = footballUnderstanding / 20;
  
  // 2. 预判对手起跳时机
  const jumpAnticipation = oppRecog / 20;
  
  return {
    positioningBonus: landingPrediction * 0.30,
    timingBonus: jumpAnticipation * 0.25
  };
}
```

---

### 6. Save模块（门将扑救）

**已部分实现**，需完善：
```javascript
// 当前已实现：预判修正
// 需添加：与射门者的博弈

function saveIntent(gkAttrs, shotContext) {
  const oppRecog = gkAttrs.opponentRecognition || 10;
  const footballUnderstanding = gkAttrs.footballUnderstanding || 10;
  
  // 1. 预判射门方向（已实现）
  const directionGuess = anticipationSuccess(gkAttrs, shotContext);
  
  // 2. 识别射门者习惯（新增）
  const habitRecognition = oppRecog / 20;
  
  // 3. 站位选择（基于footballUnderstanding）
  const positioning = footballUnderstanding / 20;
  
  return {
    guessAccuracy: directionGuess,
    habitBonus: habitRecognition * 0.15,
    positioningBonus: positioning * 0.10
  };
}
```

---

## 统一接口设计

每个模块添加统一的意图层接口：

```javascript
// 模块统一结构
module.exports = {
  // 原物理计算函数
  passQuality, dribbleSuccess, shootAccuracy, 
  tackleWinProb, contestWinProb, saveSuccessProb,
  
  // 新增：意图判断层
  passIntent, dribbleIntent, shootIntent,
  tackleIntent, contestIntent, saveIntent,
  
  // 整合后的主函数
  pass, dribble, shoot, tackle, contest, save
};
```

---

## 实施建议

### 阶段1：先添加save模块（已完成基础）
- 已有意图预判框架
- 只需完善与射门者的博弈

### 阶段2：添加shoot模块
- 射门角度选择是关键
- 与save模块形成博弈对

### 阶段3：添加pass和dribble
- 涉及队友识别
- 需要设计队友跑位模型

### 阶段4：添加tackle和contest
- 相对简单（双方对抗）
- 可复用其他模块的模式

---

## 关键问题（需用户决策）

1. **队友跑位模型**：是否需要单独设计队友AI，还是简化处理？

2. **博弈深度**：意图判断是一层还是多层？（例如：我猜你猜我猜...）

3. **属性权重**：footballUnderstanding / teammateRecognition / opponentRecognition 的相对重要性？

4. **验证方式**：意图判断的效果如何测试？（比物理结果更难量化）
