# 工作记录 - FM战术引擎

## 关键信息

### 腾讯云部署
- **地址**: https://newfm-270069-8-1443065697.sh.run.tcloudbase.com/
- **战术页面**: https://newfm-270069-8-1443065697.sh.run.tcloudbase.com/match-classic
- **管理后台**: https://newfm-270069-8-1443065697.sh.run.tcloudbase.com/
- **环境ID**: newfm-270069-8

### 本地服务
- **端口**: 8080
- **启动命令**: `$env:PORT='8080'; node server/index.js`
- **地址**: http://localhost:8080
- **战术页面**: http://localhost:8080/match-classic

### 备份规则（强制执行）
**任何修改前必须先备份！**

1. 备份位置: `backups/` 目录
2. 命名格式: `{文件名}.{日期}.{序号}.bak`
3. 修改前检查清单:
   - [ ] 已创建备份
   - [ ] 备份文件已验证存在
   - [ ] 修改内容已记录

### 正确版本前端代码
- **文件**: `backups/cloud_match.html` (65088 bytes)
- **来源**: 从腾讯云下载
- **关键特征**: 包含"自动补位"和"清空人选"按钮，阵型正确

### 项目结构（清理后）
```
fm-tactical-engine/
├── engine/                  # 引擎核心
│   ├── index.js             # 主入口
│   ├── constants.js         # 属性定义
│   ├── rng.js / presets.js  # 工具
│   ├── zones.js / teams.js  # 球场/球队模型
│   ├── player.js / prob.js  # 球员/概率计算
│   ├── situations.js        # 情境判断（调用6模块）
│   ├── match.js             # 比赛引擎（使用新6模块）
│   ├── pass.js              # 传球（意图判断层完整）
│   ├── dribble.js           # 盘带（意图判断层完整）
│   ├── shoot.js             # 射门（意图判断层完整）
│   ├── tackle.js            # 抢断（意图判断层完整）
│   ├── contest.js           # 争顶（意图判断层完整）
│   ├── save.js              # 门将（意图判断层完整）
│   └── tests/               # 测试文件
├── server/                  # REST API
├── public/                  # 前端
├── backups/                 # 备份目录
│   └── old_engine/          # 旧模块备份
├── docs/                    # 文档
├── tools/                   # 构建工具
└── WORK_LOG.md              # 本文档
```

### 已删除的旧模块（已备份到 backups/old_engine/）
- `engine/actions.js` — 旧的S01-S23动作定义
- `engine/transitions.js` — 旧的球权转移逻辑
- `engine/backup_old/` — 旧的clear/duel模块

### 6大核心模块（第二轮修改完成）

| 模块 | 文件 | 意图判断层 | 关键属性 |
|------|------|-----------|---------|
| 传球 | pass.js | 视野扫描→识别漏洞→预判跑位 | 足球理解、队友识别、对手识别、决断速度 |
| 盘带 | dribble.js | 阅读防守者→假动作→空间评估 | 对手识别、足球理解、决断速度 |
| 射门 | shoot.js | 阅读门将→角度选择→博弈 | 对手识别、足球理解、决断速度 |
| 抢断 | tackle.js | 阅读持球者→预判动作→时机 | 对手识别、足球理解、决断速度 |
| 争顶 | contest.js | 预判落点→提前移动→卡位 | 足球理解、决断速度、对手识别 |
| 门将 | save.js | 读取射门者线索→预判方向 | 对手识别、足球理解、决断速度 |

### 属性定义（20属性+身高）

**技术属性**: 控球、盘带、传球、射门、头球、定位球
**身体属性**: 速度、爆发力、平衡、力量、弹跳
**精神属性**: 侵略性、勇敢、集中、决断
**感知属性**: 足球理解、视野、队友识别、对手识别
**执行属性**: 决断速度
**身体**: 身高

### 工作规范（强制执行）

1. **备份优先**: 任何修改前必须先备份原文件到 backups/
2. **记录保存**: 所有关键信息必须记录到 WORK_LOG.md
3. **检查点规则**: 任何修改前必须回答 CHECKPOINT_RULE.md 中的问题
4. **物理逻辑优先**: 不能因为结果不符合预期就修改物理公式
5. **属性匹配**: 所有判定必须在20属性+身高中找到对应
6. **组合方式**: 使用属性组合实现复杂判定，不新增属性

### 重要文档

- `CHECKPOINT_RULE.md` - 强制检查点规则
- `BACKUP_RULE.md` - 备份规则
- `docs/REALITY_RESEARCH_6_MODULES.md` - 6模块现实研究
- `docs/ATTR_MATCHING_ANALYSIS.md` - 属性匹配分析
- `docs/INTENT_DESIGN_PROPOSAL.md` - 意图设计提案
- `docs/LOGIC_DEPENDENCY_GRAPH.md` - 逻辑依赖图谱

---

**最后更新**: 2026-06-15
**状态**: 6大模块第二轮修改完成，前端已替换正确版本，比赛引擎已迁移到新6模块
