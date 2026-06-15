# 最高工作法则 — FM 战术引擎

> **每次开始工作前必须先阅读本文。**

---

## 一、物理现实第一

- 足球的一切决策由物理条件驱动：距离球门、防守压力、角度、球高
- 球员属性不决定"该做什么"，只决定"做了之后做得好不好"
- 研究先于编码——搜学术文献（Google Scholar、xG 模型、xT/VAEP 研究）找依据，不拍脑袋
- "角色"不是固定标签——同一球员在不同战术部署下行为不同。将来会有的"职能标签"是战术系统的一部分

---

## 二、记录一切

### 每次修改前
1. `git add -A && git commit -m "snapshot: xxx"` — 先备份再动手
2. 更新 `TODO.md` 如果有新的待办项

### 每次修改后
1. `node tools/build.cjs && node test_1000_matches.js` — 跑测试验证
2. 读取输出，确认关键分布未崩塌
3. 告诉用户改了哪些文件、删了多少行、加了什么

### 文件职责
| 文件 | 作用 |
|------|------|
| `RULES.md` | **本文** — 每次工作前必读 |
| `TODO.md` | 待实现/待扩展项，含依赖模块标记 |
| `WORK_LOG.md` | 每次工作日志（可选，大改动时记录） |
| `PARAMETER_AUDIT.md` | 拍脑袋系数审计（可选） |

---

## 三、决策架构（当前状态）

```
        物理条件        战术指令(将来)     球员属性(执行层)
        ────────        ────────────       ──────────────
        
距离→xG   ──→ 射门效用  shootWillingness   shoot.js (脚法)
zone     ──→ 传球效用                     pass.js (精度)
pressure ──→ 盘带效用                     dribble.js (成功率)
defDist  ──→ 抢断检查                     tackle.js (断球率)
coords   ──→ 争顶检查(将来)               contest.js

decisionProbs = softmax(shootU, passU, dribbleU)
```

射门/传球/盘带三行独立计算效用值，不互加减，用 softmax 比较。

---

## 四、当前待办（TODO.md 中详细记录）

1. **shootWillingness** — 战术指令+球员个性驱动（等战术/个性系统）
2. **抢断重设计** — 防守球员主动决策，非压力触发（等角色/职能系统）
3. **争顶触发** — 22人坐标距离检测触发（等坐标系统完善）
4. **selectAction 精简** — 盘带/射门子类型权重精简

---

## 五、Git 备份

```bash
# 快速备份
git add -A && git commit -m "snapshot: <描述>"

# 回退单个文件
git checkout <commit> -- engine/situations.js
```

仓库路径：`C:\Users\admin\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a291dd73a6e4bdd52475c17\fm-tactical-engine`
