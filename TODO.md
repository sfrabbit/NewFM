# TODO — 决策模型待实现/待扩展项

## 射门意愿（shootWillingness）
- **当前**：默认值2.0，所有球员统一
- **待实现**：
  - 战术开关：教练指令 `shoot_more` / `shoot_less` 修改系数
  - 球员个性：`团队导向`低 + `自信`高 → 更倾向射门（自私型射手）
  - 位置影响：中锋可用比后卫更高的射门意愿基线值
- **涉及文件**：`situations.js` → `zoneBaseline(shootWillingness)`
- **依赖模块**：球员个性系统、战术指令系统（均未实现）

## 抢断决策重设计
- **当前**：压力阈值 + 随机数触发，无防守球员因素
- **待实现**：
  - 防守方球员主动决策，而非"进攻方压力大到一定值就自动触发抢断"
  - 决策因子：防守球员的防守技术、侵略性、战术指令（压迫强度）
  - 角色→球员职能映射：中卫优先在禁区内抢断，中场在中圈拦截
  - 将来角色标签（非当前role名）可override抢断倾向
- **涉及文件**：`situations.js` → `determineSituation` tackle 分支
- **依赖模块**：角色/职能系统、战术指令系统（均未实现）

## 争顶触发（空间位置）
- **当前**：pContest=0.08 硬编码概率
- **待实现**：利用22人真实坐标 + 球坐标，当球在空中且 ≥2名球员在 N 米范围内时自动触发争顶
- **涉及文件**：`situations.js` → `determineSituation` + `match.js` → `_playerCoords`
- **N 取值**：需研究（1m或0.5m）

## selectAction 子类型权重精简 ✅ 已完成
- **传球**：离散 4 种类型 → 连续 riskLevel(0-1)，属性+情境决定，pass.js 参数连续插值
- **盘带**：5 种离散 weights(21 个魔数) → 连续 dribbleStyle(0-1)，属性+情境决定
- **射门**：4 种离散 weights(26 个魔数) → 高空球物理强制(凌空/头球)，地面球连续 shootStyle(0-1)
- 删除了 `weightedRandom` 工具函数

## 100场决策审计修复 ✅ 已完成
- **问题**：audit_decisions.js 在 `origStep()` 之前读取 `ball_zone`，但 `step()` 内部 `_pickNonGkCarrier()` 可能在 `determineSituation` 之前修改 `ball_zone`（当 `ball_carrier === null` 时）
- **修复**：audit 改为在 `origStep()` 返回后使用 `result.zone`（即决策时的实际 zone）
- **发现**：原 "MID_D shoot" 异常全部是误判——实际决策时球已在 DEEP_A/MID_A，audit 错误关联到了上一步结束时的 MID_D
- **当前异常**（47个）：
  - BOX_D dribble（31次）：禁区盘带，需评估是否物理合理
  - BOX_A hiXG dribble（16次）：禁区高xG低压力盘带，可能应优先射门

## shootUtility 个性化 ✅ 待实现
- **问题**：当前 `shootUtility = xG` 线性，CM和ST在35米射门概率一样=2.46%
- **正确方案**（非阈值拍脑袋，基于物理现实+个人+战术）：
  - `shootWillingness` 预留参数，默认 0，将来由战术系统/个性系统填入正值或负值
  - 比赛时间压力：最后 10 分钟，shootWillingness 自动提高
  - 球员属性：`自信`越高、`团队`越低 → 越倾向射门
  - 不按"角色"做判断（角色不是固定标签）
- **涉及文件**：`situations.js` → `shootUtility` + `decisionProbs`
- **依赖模块**：战术指令系统、球员个性系统（均未实现，但预留接口）
