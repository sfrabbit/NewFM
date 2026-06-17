# TODO — 决策模型待实现/待扩展项

## 战术预留参数（已实现接口，默认=0）✅
- **shootWillingness** → `shootUtility(xg, personalModifier)` 通过 `personalModifier` 介入
- **passTendency** → `passUtility(v, pressure, passTendency)` 通过 `Math.exp(passTendency)` 乘入
- **dribbleTendency** → `dribbleUtility(v, pressure, xg, dribbleTendency)` 通过 `Math.exp(dribbleTendency)` 乘入
- **状态**：接口已实现，默认=0
- **待实现**：三个参数均由战术系统中对应字段填入（如 `shoot_more`/`shoot_less`、`dribble_more`/`hold_ball` 等）。当前 `determineSituation` 中均传 `0`
- **涉及文件**：`situations.js` → `decisionProbs` + 三个 utility 函数
- **依赖模块**：战术指令系统（未实现）

## 22人真实坐标可视化 ✅ 已完成
- **后端**：`match.js` 中 `_playerCoords` 追踪22人真实坐标（米制），每步更新
- **后端**：`matchSummary()` 返回 `home_positions`/`away_positions` 包含 `x, y` 真实坐标
- **后端**：每个事件包含 `carrier_x`, `carrier_y` 供前端使用
- **前端**：`index.html` 新增 `realCoordToSVG(x, y)` 函数映射米制坐标到SVG像素
- **前端**：`renderMatchPlayers()` 优先使用后端真实坐标，fallback到zone-based
- **前端**：`moveCarrier()` 支持使用真实坐标移动持球者
- **涉及文件**：`match.js`, `public/index.html`

### 位置系统修复记录
**问题**：客队球员位置错误（CB出现在对方半场、宽度不足等）
**修复**：
1. `_initPlayerCoords`：客队初始化时翻转y坐标（`y: -y`），确保`FB_L`始终站在左边
2. `movement.js`：添加`attackDirection`参数，使用本地坐标系计算（攻击方向总是+x）
3. 修复`calculateTargetPosition`中防守位置的符号（负值=后场）
**验证**：`test_player_positions.js` 所有阵型（4-3-3, 4-4-2, 3-5-2, 4-2-3-1）位置分布符合现实逻辑

### 移动系统修复记录
**问题**：球员跑动距离过低（CM只有2.7km，应为11.5km）
**修复**：
1. `updatePlayerPositions`：球员在dt时间内持续移动（模拟无球跑动），而不是只移动到目标位置
2. 添加位置类型速度因子：`GK:0.25, CB:0.70, FB:0.85, WB:0.90, CM:0.75, WM:0.85, ST:0.70`
3. `_stepMovementPlayers`：将每个事件分成5个子步，让移动更平滑
4. 动态时间乘数：短比赛使用乘数4，完整比赛使用乘数1
**验证**：`test_movement_realism.js` 所有阵型所有位置跑动距离符合现实范围（GK 4-5km,  outfield 10-13km）

### 2D可视化系统 ✅ 已完成
**功能**：前端战术图显示22人实时位置
**实现**：
1. 后端：`matchSummary()` 返回 `home_positions`/`away_positions` 包含 `x, y` 真实坐标
2. 前端：`realCoordToSVG(x, y)` 将米制坐标映射到SVG像素坐标
3. 前端：`renderMatchPlayers()` 使用真实坐标渲染球员位置
4. 前端：`moveCarrier()` 使用真实坐标移动持球者
**坐标映射**：
- 后端：x ∈ [-52.5, 52.5], y ∈ [-34, 34]（米）
- 前端：viewBox="0 0 60 95"（SVG像素）
- 映射公式：`xPct = (x + 52.5) / 105 * 100`, `yPct = (y + 34) / 68 * 100`
**验证**：`test_2d_visualization.js` 坐标传输正确，SVG坐标在有效范围内

## 射门意愿（shootWillingness）✅ 已预留
- **当前**：`shootWillingness=0`，所有球员统一。通过 `personalModifier` 组合了：
  - `shootWillingness`（战术预留，=0）
  - `timePressureBonus`（80'后自动生效）
  - `(自信-10)*0.02 + (10-团队)*0.02`（球员个性）
- **待实现**：战术开关填入 `shootWillingness`
- **依赖模块**：战术指令系统（未实现）

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
