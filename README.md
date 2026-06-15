# 足球战术模拟引擎 (Football Tactical Engine)

可解释的足球战术模拟引擎，基于 30 区域球场模型（6 纵区 × 5 横道），模拟完整的 90 分钟比赛。

## 项目结构

```
├── engine/          # 纯 JS 引擎模块
│   ├── zones.js     # 30区域球场、阵型、角色定位
│   ├── teams.js     # 战术指令、球队、球员
│   ├── match.js     # 比赛主循环
│   ├── actions.js   # 23种情境的动作定义
│   ├── situations.js # 情境判定 + 动作选择
│   ├── transitions.js # 球权转移解析
│   ├── player.js    # 球员属性生成 + 球队构建器
│   ├── prob.js      # 概率计算
│   ├── rng.js       # 伪随机数生成器 (Mulberry32)
│   ├── constants.js # 属性常量
│   ├── presets.js   # 位置模板 + 球队模板
│   └── index.js     # 统一导出
├── server/          # Node.js HTTP 服务器
│   ├── index.js     # REST API (/api/match/simulate, /api/players)
│   └── persist.js   # 数据持久化 (MySQL / 内存)
├── public/          # 前端界面
│   ├── index.html   # 比赛页面 (阵型配置 → 动画播放 → 赛后统计)
│   └── admin.html   # 管理中心 (球员 CRUD)
└── design_docs/     # 设计文档
    ├── PRD.md
    ├── tactical_spec.md
    └── patterns_*.md
```

## 快速启动

```bash
npm install
PORT=8080 node server/index.js
```

打开 `http://localhost:8080`

## 技术栈

- **后端**: Node.js 原生 HTTP 服务器
- **引擎**: 纯 JS，无第三方依赖
- **前端**: 原生 HTML/CSS/JS + SVG
- **数据库**: MySQL (可选，默认内存存储)
- **可移植**: 架构适配 Tauri / Steam 发布
