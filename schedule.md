# 开发排期

## 目标策略

先打通 **Pipeline**（最小可玩闭环），再逐步扩充内容与表现。

```
Phase 1: Pipeline   → 6张牌可以完整玩一局（抽牌、拖拽、归类、胜负）
Phase 2: 表现层     → 动效、手感打磨
Phase 3: 内容扩充   → 10关、难度曲线
```

---

## Phase 1 — Pipeline（打通闭环）

> 目标：用 2 个类别、6 张牌，跑通从开始到胜利/失败的完整流程。
> 期间不关注美观，只关注逻辑正确。

### M1 — 项目初始化

- [ ] Vite + TypeScript 脚手架
- [ ] 安装 GSAP
- [ ] HTML 基础骨架（tableau 区、stock 区、foundation 区）
- [ ] CSS reset + 区域占位布局
- [ ] 确认本地开发服务器正常运行

**验收**：浏览器打开，能看到各区域的空占位。

---

### M2 — 核心数据结构与游戏逻辑

> 纯 TypeScript，不碰 DOM，可单独测试。

- [ ] `types/game.ts`：定义 Card、Stack、Foundation、GameState
- [ ] `game/GameState.ts`：
  - 从关卡数据初始化状态
  - `drawFromStock()`：从 Stock 抽一张到 Discard
  - `drawFromDiscard()`：从 Discard 顶部抽回
  - `applyMove(from, to)`：执行一次移动，更新状态
  - `checkWin()` / `checkLoss()`
- [ ] `game/MoveValidator.ts`：
  - `isValidMove(from, to, state)`：判断是否合法
  - 覆盖所有规则（同类叠加、基座牌约束、Foundation 条件）
- [ ] `data/levels.ts`：写一个最小关卡（2类别，6张牌）

**验收**：在 `main.ts` 中手动调用，控制台输出状态变化正确。

---

### M3 — 基础渲染

> 把 GameState 映射到 DOM，不需要动画。

- [ ] `ui/CardRenderer.ts`：
  - 根据 GameState 渲染 tableau 的每一叠
  - 渲染 Stock 顶牌（不可见时显示牌背）
  - 渲染 Discard 顶牌
  - 渲染 Foundation 槽（空槽 / 已有基座牌 / 已收集数量）
- [ ] 渲染剩余步数
- [ ] GameState 变化后，调用 `sync()` 刷新整个 DOM

**验收**：初始关卡布局能正确渲染在页面上，手动修改数据后 DOM 同步更新。

---

### M4 — 点击交互（先不做拖拽）

> 用点击代替拖拽验证逻辑正确性，更快。

- [ ] 点击 tableau 顶牌 → 选中高亮
- [ ] 再点击目标（另一叠顶牌 / Foundation 槽）→ 执行移动
- [ ] 点击 Stock → 抽牌
- [ ] 点击 Discard → 逆向抽回
- [ ] 移动后步数 -1，DOM 刷新
- [ ] 触发胜利/失败时显示提示

**验收**：用最小关卡（6张牌）通过点击操作完成一局游戏，胜负判定正确。

---

### M5 — 拖拽交互

> 在 M4 的逻辑基础上，用拖拽替代点击操作。

- [ ] `ui/DragHandler.ts`：Pointer Events（统一 mouse + touch）
  - `pointerdown`：拾起顶牌或整组同类牌，生成拖拽影子跟随指针
  - `pointermove`：移动影子，实时检测鼠标下方的合法目标并高亮
  - `pointerup`：
    - 命中合法目标 → 执行 `applyMove()`，刷新 DOM
    - 未命中 → 影子消失，恢复原位
- [ ] `ui/SnapHandler.ts`：计算当前指针下最近的合法放置目标

**验收**：拖拽可以完整替代点击完成一局，无逻辑错误，无卡死状态。

---

### Phase 1 验收标准

```
✅ 6张牌，2个类别，一局游戏可以从头玩到胜利
✅ 所有移动规则正确（包括基座牌约束）
✅ 步数正确递减，耗尽判负
✅ 拖拽可用，放置有视觉反馈
✅ 无控制台报错
```

---

## Phase 2 — 表现层（手感与动效）

> Pipeline 跑通后再做，顺序可根据实际情况调整。

- [ ] `animations/CardAnimations.ts`：封装所有 GSAP 动画
  - 拾起动画（放大 + 阴影）
  - 飞行落定（`back.out` 缓动）
  - 弹回原位（`elastic.out`）
  - 翻牌（Y 轴旋转）
  - 类别消除（卡牌飞散 + 槽位清空）
  - 胜利 / 失败动效
- [ ] 移动端适配（viewport、touch 防止页面滚动）
- [ ] 整体 UI 视觉设计（卡牌样式、背景、字体）

---

## Phase 3 — 内容扩充（多关卡）

> 表现层稳定后再做。

- [ ] `game/LevelGenerator.ts`：倒推生成法实现
- [ ] `game/DifficultyAnalyzer.ts`：依赖图分析，计算难度分
- [ ] 补充 10 关关卡数据，体现难度递进（参考 design.md §3.5）
- [ ] 关卡选择界面
- [ ] 通关后进入下一关流程

---

## 当前优先级

```
现在做 → M1（项目初始化）
```
