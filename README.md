# Whatcard

浏览器端卡牌分类接龙 Demo（Vite + TypeScript + GSAP）。玩法与关卡设计说明见仓库内 `engineer.md`、`design.md`；开发排期见 `schedule.md`。

## 环境要求

- **Node.js** 18+ 或 20+（LTS 推荐）
- **npm** 10+（或使用 `pnpm` / `yarn`，下列命令需对应替换）

## 快速开始

```bash
# 进入项目目录
cd whatcard

# 安装依赖
npm install

# 启动开发服务器（热更新）
npm run dev
```

终端会打印本地地址，一般为 **http://localhost:5173/**。在浏览器中打开即可游玩。

> **开发调试**：开发模式下会显示折叠调试面板（关卡参数、贪心 Bot 等），由 `import.meta.env.DEV` 控制；生产构建不包含该面板。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 检查 + 产出 `dist/` 静态资源 |
| `npm run preview` | 本地预览生产构建（需先 `npm run build`） |

## 目录结构（简要）

```
whatcard/
├── index.html          # 入口 HTML
├── src/
│   ├── main.ts         # 应用入口、关卡与 overlay 流程
│   ├── style.css       # 全局样式
│   ├── animations/     # GSAP 动效
│   ├── data/levels.ts  # 10 关战役配置与生成入口
│   ├── game/           # 状态机、移动校验、关卡生成、Bot
│   ├── types/          # 类型定义
│   └── ui/             # 渲染、拖拽、点击、菜单、调试面板
├── design.md           # 设计文档
├── engineer.md         # 题目 / 需求背景
└── schedule.md         # 开发排期与阶段说明
```

## 常见问题

- **局域网 / 其他设备访问**：需把参数传给 Vite，而不是 npm。使用 `npm run dev -- --host`（中间两个短横线不可省略）；若写成 `npm run dev --host`，`--host` 只会被 npm 吃掉，Vite 收不到。
- **端口被占用**：在项目根目录新建 `vite.config.ts` 并设置 `server.port`，或临时使用 `npx vite --port 3000`。
- **依赖安装失败**：检查 Node 版本；可删除 `node_modules` 与锁文件后重新 `npm install`。

## 许可证

私有项目（`package.json` 中 `"private": true`）。
