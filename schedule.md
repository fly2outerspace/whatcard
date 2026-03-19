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

> **[评注]** 可移动组规则在开发过程中有修正，最终定义见 `src/game/MoveValidator.ts` 中 `getMovableGroup()`：
> 顶牌为基座牌时，基座牌 + 其下方连续同类非基座牌共同构成组，可整体移入空 Foundation 槽。

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

> **[评注]** 渲染规则在开发过程中有修正：原文"只能看见最表面的一张"为初始布局的描述；合并叠加后，可移动组内所有牌均正面朝上显示，实现见 `CardRenderer.ts` 中 `getVisibleStartDepth()`。

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
- [ ] `game/DifficultyAnalyzer.ts`：依赖图分析，计算难度分 ← **[评注] 已放弃，不实现，见 v2 技术备注**
- [ ] 补充 10 关关卡数据，体现难度递进（参考 design.md §3.5）
- [ ] 关卡选择界面
- [ ] 通关后进入下一关流程

---

## 当前优先级

```
现在做 → M1（项目初始化）
```

---
---

# ⚠️ 排期 v2（当前版本）

> 上方 v1 排期已完成 Phase 1，Phase 2 / Phase 3 规划**不再使用**，由下方 v2 替代。
> v1 内容保留作为开发记录，不做修改。

## 阶段概览（v2）

```
Phase 1  ✅  Pipeline           → 6张牌闭环，规则全部跑通（已完成）
Phase 2  ✅  倒推生成验证        → 生成算法 + 菜单入口（已完成）
Phase 3_a   多类别配置系统      → 支持 ABCDE 五类 × 不同深度，调试面板
Phase 3_b   难度系统验证        → 贪心 Bot 测通关率，确认参数有效性
Phase 3_c   Shuffle 发牌+标定   → Shuffle→Deal（递增高度）+ Bot 标定 movesLimit
Phase 3_d   关卡曲线设计        → 10关固定关卡 + 无限随机关卡
Phase 4  ✅  表现层              → 动效、手感、布局与信息展示（已完成）
Phase 5     补充与调整          → 关卡微调、移动端、业务字段、小丑牌
```

> **[技术备注]** 原 v2 Phase 3 中的「依赖图分析 / DifficultyAnalyzer」已降级，不作为主要难度控制手段。
> 理由：倒推生成法本身已保证无死局，依赖图的核心用途（死锁检测）不再需要；stock 顺序对玩家是隐藏信息，依赖图无法衡量；实际难度用**贪心 Bot 通关率**验证，比理论图更可靠。
> 参数旋钮以 `movesBack`、类别数、各类牌数、步数余量比为主。

---

## Phase 2 — 倒推生成验证

> 目标：在 2 类别场景下，验证倒推生成法能产出可解布局；同时建立菜单入口供后续迭代使用。
> 本阶段不设难度控制，只要求生成结果可解。

### M6 — 倒推生成算法

- [ ] `game/LevelGenerator.ts`：
  - 定义「反向操作」集合（从胜利状态逆向执行 N 步）
  - 实现 `generateLevel(categories, movesBack)`：接受类别定义与反向步数，返回 `LevelData`
  - 反向操作需保证每步均合法（不产生不可达状态）
  - 生成结果附带 `theoreticalMinMoves = movesBack`，作为步数上限参考
- [ ] 在控制台验证：生成 10 个布局，用 `getAllValidMoves()` 确认每个布局初始有合法移动可走

**验收**：生成的布局在完全已知信息下，可以用贪心策略（或手动操作）完成通关。

---

### M7 — 菜单系统

- [ ] 左上角常驻菜单按钮（汉堡图标或 `☰`），不遮挡游戏区域
- [ ] 点击后出现**半透明遮罩 + 居中菜单面板**，面板包含：
  - **`↺` 重新生成**按钮：调用 `LevelGenerator` 生成全新布局并重置步数，关闭菜单，立即开始新局
  - **`▶ 继续`** 按钮：关闭菜单，返回当前游戏
- [ ] 点击遮罩空白区域等同于「继续」，关闭菜单
- [ ] 菜单打开时游戏暂停（不响应点击/拖拽事件）

**验收**：点击重新生成后，棋盘刷新为全新布局，步数重置，可正常游玩至胜负；继续按钮和点击遮罩均能关闭菜单恢复游戏。

---

### Phase 2 验收标准

```
✅ 倒推生成法能产出 2 类别的可解布局
✅ 菜单可正常开关
✅ 重新生成后新局可玩通
✅ 退出按钮有响应（即使浏览器拦截也不报错）
```

---

## Phase 3_a — 多类别配置系统 ✅ 已验收

> 目标：让生成器支持多类别与各类别不同牌数，并提供调试面板可实时调整、重新生成。

> **[评注 — 倒推生成法修正，已实现]** Phase 3_a 开发中发现原倒推算法的 `f2t` 操作沿用了正向游戏的同类别约束，导致 Tableau 全为纯类别堆叠、游戏无挑战性。
> **修正**：`f2t` 改为允许放到任意叠（无类别约束），模拟初始随机发牌；`t2t` 保持同类别约束不变。
> 见 `src/game/LevelGenerator.ts` `getValidReverseMoves()`。

> **[评注 — t2s 操作，已实现]** 发现 `movesBack` 设定值与实际反推步数（`appliedMoves`）不符：Foundation 清空后，只剩 `t2t` 可用，但混叠后同类别顶牌稀少，`t2t` 很快耗尽，循环提前终止。
> **根本原因**：反向操作集在 Foundation 清空后严重收窄，无法持续混乱。
> **修正**：新增 `t2s`（Tableau 顶牌 → Stock 头部），对应正向操作「玩家从 Stock 抽牌放到 Tableau」的逆转。`t2s` 在任何 Tableau 叠非空时均可用，使 Foundation 清空后操作集保持充足，`appliedMoves` 能真正逼近 `movesBack`。
> 调试面板新增「t2s 计数」展示，可直观观察该阶段的混乱程度。
> 见 `src/game/LevelGenerator.ts`。

> **[评注 — 步数上限精确累计，已实现]** 旧方案 `movesLimit = ceil(appliedMoves × 2.0) + 8` 中 2.0 是模糊倍率，根本原因是 `t2t` 在反推时可整体移动 N 张牌（1 步），而正向游戏受 `faceUp` 约束，这 N 张牌须逐张翻开移动（N 步）。
> **修正**：倒推循环中对每步精确累加前向代价：`f2t` / `f2s` / `t2s` 各计 1，`t2t` 计 `groupSize`，求和得 `preciseCost`（= 考虑 faceUp 后的理论最少步数）。`movesLimit = preciseCost + moveBuffer`，`moveBuffer` 为可配置的固定整数（默认 10），取代原来的浮点倍率和固定偏移。
> `LevelConfig.movesLimitMultiplier` 已移除，替换为 `moveBuffer`；调试面板同步更新，展示 `preciseCost` 和 `moveBuffer`。
> 见 `src/game/LevelGenerator.ts`，`GenerationStats.preciseCost`；亦见 design.md §3.2 评注。

### M8 — 扩展生成器配置

- [x] 扩展 `CategoryDef`：每个类别独立 `cardCount`（调试面板 2–8 张）
- [x] 扩展 `generateFromConfig` / `LevelConfig`：`movesBack`、`moveBuffer`、`seed`
- [x] 多类别场景下生成器正常产出布局（含 12 类调试上限）
- [x] 总牌数较多时 tableau / stock 分配见 `tableauStackCount`
- [x] **新增 `t2s` 反向操作**：Tableau 顶牌 → Stock 头部，解决 Foundation 清空后 `appliedMoves < movesBack` 的问题

> **牌数分配规则**：tableau 固定 4 叠（2/3/4/5 张），共 14 张；其余牌进入 stock。
> 若总牌数 < 14，tableau 叠数和深度自动缩减；此规则需在生成器中明确实现。

### M9 — 调试面板

> 仅在开发阶段可见（`import.meta.env.DEV`）。

- [x] 折叠调试面板：类别数 **2–12**、每类牌数 **2–8**、`movesBack` **8–150**、`moveBuffer` **0–150**、随机种子
- [x] 「生成并应用」、统计区（含 `preciseCost` / `movesLimit` / `t2sCount` 等）
- [x] Phase 3_b：「贪心 Bot ×100」按钮，弹窗显示通关率（供填写标定表）

---

### M9b — 卡牌翻开状态（faceUp）✅

**规则**（已实现）：
- Tableau 仅顶牌翻开；移走顶牌后下一张翻开；Stock 全背面，抽出后翻开进 Discard
- 背面牌不可移动、不参与合并

**实现范围**：
- [x] `types/game.ts`：`faceUp`
- [x] `GameState.ts` / `MoveValidator.ts` / `LevelGenerator` / `CardRenderer.ts`

**Phase 3_a 验收**：✅ 调试面板可从少量类到多类、多牌数生成并正常游玩。

---

## Phase 3_b — 难度系统验证（进行中）

> 目标：用贪心 Bot 标定参数；**每一档**要求：**类别总数 > 8**，生成局 **步数上限（movesLimit）> 100**（以调试面板统计为准，可调 `movesBack` / `moveBuffer`）。

> **实现顺序（已定）**  
> 1. 调试面板：`movesBack` 上限 **150**、每类牌数上限 **8**、类别数上限 **12**（`CATEGORY_NAMES` A–L）  
> 2. `GreedyBot.ts`：贪心策略 + 批量测试  
> 3. 难度表格 + `data/difficultyPresets.ts` 初版预设（实测列留空）

> **[技术备注]** 贪心策略：优先最优 Foundation 走法（含消除）→ 能翻开底牌的 Tableau 移动 → 其余合法移动 → 抽 Stock → Stock 空则洗牌进 Stock。

> **[Bot 职责]** 仅**难度标定**，不参与可解性证明（倒推生成已保证可解）。

> **[评注 — Stock 代价漏算 bug，已修复]** 发现所有会进入 Stock 的反向操作（`f2s`、`t2s`、以及生成结束时 flush 进 Stock 的剩余牌）均只按 1 步计入 `preciseCost`，但正向游戏中使用一张 Stock 牌的最少代价是 **2 步**：① 点击 Stock 翻到 Discard（1 步）② 从 Discard 移动到目标（1 步）。漏算导致 movesBack 设置偏低时 movesLimit 远小于实际所需（例如 movesBack=8、58 张牌 flush 进 Stock，理论最少需 58×2+8=124 步，但原来 movesLimit 仅约 28 步），局面结构性不可完成。
> **修复**：`f2s` / `t2s` 代价改为 2；flush 段落 `preciseCost += flushedCount * 2`。
> 见 `src/game/LevelGenerator.ts`。

### M10 — 贪心 Bot ✅

- [x] `game/GreedyBot.ts`：`runGreedyBot` / `runGreedyBotDetailed`、`batchGreedyTest(config, 100)`
- [x] 调试面板「🤖 贪心 Bot ×100（当前参数）」→ `alert` 通关率、胜局用步统计

> **[评注 — Tableau 叠深度上限，已实现]** 原生成器对 f2t 无深度限制，导致随机分布下某叠可能堆积远多于其他叠，视觉不平衡。
> **实现**：新增 `computeTableauMaxDepths(totalCards, stackCount)` 按 **18/64 标准比例**（原始游戏 64 张中 18 张在 Tableau = 3+4+5+6）计算各叠上限，确保右叠 ≥ 左叠。算法优先尝试等差数列（如 64 张 → [3,4,5,6]），无法整除时退化为"均分+余数补右"。`getValidReverseMoves` 的 f2t 候选新增 `stack.length < maxDepths[si]` 过滤，满叠不再接受 f2t。调试面板统计新增「叠上限 L→R」行。
> **已知限制**：这些是**天花板**，不是保证值。`movesBack` 较小时，f2t 次数不足以填满各叠，实际 Tableau 牌数可能少于上限（某叠可能为空）。此场景暂不特殊处理，可在后续通过"flush 前强制填满 Tableau"来解决（优先级低，待定）。
> 见 `src/game/LevelGenerator.ts`，`computeTableauMaxDepths`。

> **[评注 — Bot 策略优先级 bug，已修复]** 原策略优先级：Foundation → 翻底牌 → **任意合法走法（t2t）→ 抽 Stock**。这导致只要 Tableau 里有任何合法的 t2t 走法（哪怕毫无意义），Bot 就永远不去抽 Stock，Stock 里的关键牌（基座牌等）永远出不来，通关率降至 0–1%。
>
> **第二个 bug**：当 Stock/Discard 耗尽、只剩 t2t 走法时，`moves[0]` 可能是 stackA→stackB，下一轮又变成 stackB→stackA，无限来回循环，耗光所有步数。
>
> **修复**：  
> ① 优先级改为：Foundation → 翻底牌 → **抽 Stock → 洗牌 → 任意 t2t（最后手段）**；  
> ② 新增 `LastAction` 追踪，t2t 走法若与上一步互为逆转则跳过，彻底消除循环。  
> 见 `src/game/GreedyBot.ts`。

### M11 — 难度参数标定（待你填表）

- [ ] 按下面各档在面板中对齐参数（或从 `DIFFICULTY_CALIBRATION_TABLE` 抄 `config`），各跑 Bot×100，将 **实测 Bot 通关率** 填入表内 / `difficultyPresets.ts` 的 `measuredPassRate`
- [ ] 若与目标区间偏差 > 15%，调整 `movesBack`、`moveBuffer` 或牌数后重测

  | 档位 | 类别数 | 各类牌数（约） | movesBack | moveBuffer | 目标 Bot 通关率 | 实测 Bot 通关率（填写） |
  |------|--------|----------------|-----------|------------|-----------------|-------------------------|
  | 简单 | 9      | 4              | 95        | 28         | 80%+            |                         |
  | 普通 | 10     | 5              | 110       | 22         | 55–70%          |                         |
  | 困难 | 11     | 5              | 125       | 18         | 30–45%          |                         |
  | 挑战 | 12     | 6              | 140       | 15         | 15–25%          |                         |

  > 生成后请在面板统计中确认 **步数上限 > 100**；不足则增大 `movesBack` 或 `moveBuffer`。

- [x] 初版预设已写入 `data/difficultyPresets.ts`（`DIFFICULTY_CALIBRATION_TABLE`）

**Phase 3_b 验收**：在约定参数下 Bot×100 可稳定弹出结果；四档实测通关率填表完毕且梯度合理（允许迭代调参）。

---

## ⚠️ Phase 3（增量改版说明）

> **[方向变更]** Phase 3 的“倒推生成”路径停止作为主线。Phase 3 重新设计为 **Phase 3_c**：采用「Shuffle → Deal」的前向发牌，调试面板用于手动调参（类别数/每类牌数/总步数/seed），贪心 Bot 用于标定合理 movesLimit。
>
> **注意**：Phase 3_a / Phase 3_b 内容保留作为历史记录与实现归档（包括 faceUp、精确步数累计、Bot 修复等）。后续开发以 Phase 3_c 为准。

---

## Phase 3_c — Shuffle 发牌 + Bot 标定（当前执行）

> 目标：生成方式改为“洗牌后发牌”，让布局看起来更随机、更接近玩家直觉；保留贪心 Bot，用于标定合理的总步数上限（movesLimit）。

### C1 — 生成器重构（Shuffle → Deal）✅

- [x] 移除倒推生成相关参数：`movesBack` / `moveBuffer` / reverse moves 集合
- [x] 生成流程：构造完整牌堆 → seeded shuffle → 先发 Tableau（左→右递增高度）→ 剩余进 Stock
- [x] Tableau 目标牌数按 18/64 标准比例：`tableauTotal = floor(totalCards * 18 / 64)`，并分配为右≥左的梯形深度

### C2 — 调试面板重构（用于手工调参）✅

- [x] 保留：类别数量（A/B/C…）、每类牌数（独立可调）
- [x] 新增：总步数上限（movesLimit）、随机种子（seed）
- [x] 移除：倒推生成相关输入（movesBack、moveBuffer 等）

### C3 — 保留贪心 Bot（用于 movesLimit 标定）✅

- [x] 保留「🤖 贪心 Bot ×100」按钮与弹窗通关率

**Phase 3_c 验收**：同 seed 可复现；Tableau 高度右≥左；Bot×100 可稳定输出通关率。

---

## Phase 3_d — 关卡曲线设计

> 目标：基于标定参数，设计 10 关固定关卡 + 无限随机关卡系统。

### M12 — 10 关固定关卡

- [x] 基于标定结果，设计 10 关难度曲线（参数见下表）
- [x] 每关用固定 seed 生成，保证每次打开都是同一布局
- [x] 写入 `data/levels.ts`：将表格参数固化为 `LEVEL_CONFIGS` / `LEVELS`
- [x] 菜单支持 1–10 关选择（独立页面式选关 UI）
- [x] 通关后弹窗确认“进入下一关”（非自动跳转）
- [x] 失败后可“重试本关”
- [x] 本地缓存当前关卡进度（无缓存默认第1关；有缓存恢复进度）
- [x] 调试面板新增强制胜利/失败；并可对齐当前关卡参数后临时微调生成（不写回产品配置）

> **10 关参数记录表（待填写）**
>
> 说明：`类别卡牌数` 使用类似 `120 / 7/5/5/3/1` 的格式，含义为 `总步数 / A/B/C/D/E...`。

| 关卡 | 总步数（movesLimit） | 类别卡牌数（A/B/C/...） | bot通关率 | 备注 |
|------|-----------------------|--------------------------|------|------|
| 1 | 30 | 5/4/3/3 | 100% |  |
| 2 | 80 | 7/6/6/6/5/4/3 | 80% |  |
| 3 | 130 | 7/7/8/6/5/5/5/4/3 | 84% |  |
| 4 | 120 |  7/7/8/6/5/5/5/4/3 | 61% |  |
| 5 | 130 | 7/7/8/6/5/5/5/4/6 | 55% |  |
| 6 | 180 | 8/8/7/7/7/6/6/5/4/3/3 | 52% |  |
| 7 | 80 | 5/5/5/3/3/3/3/4/3/3 | 53% |  |
| 8 | 120 | 7/5/5/4/4/4/3/4/3/5/7 | 39% |  |
| 9 | 150 | 3/4/6/6/8/7/7/8/6/5/4 | 10% |  |
| 10 | 150 | 3/4/4/4/4/4/4/5/8/8/8/8 | 8% |  |



**Phase 3_d 验收**：✅ 10关可顺序通关，难度递进明显；选关、进度缓存、确认跳关均已完成

---

## Phase 4 — 表现层 ✅ 已完成

> 目标：在玩法与关卡稳定后，补齐动效、布局与卡牌信息展示，统一手感与可读性（对应 v2 阶段概览「表现层」）。

### P4-1 — GSAP 动画（`animations/CardAnimations.ts`）

- [x] `animateLift`：拖动开始，幽灵组轻微放大（scale 1→1.07）
- [x] `animateFlyTo`：合法落点，幽灵飞向目标（`back.out`，落定后更新状态）
- [x] `animateSnapBack`：非法落点回位（`power3.out`，与真实牌对齐）
- [x] `animateCardFlip`：Tableau 顶牌翻开，Y 轴旋转入场 + 淡入
- [x] `animateStockDraw`：Stock→Discard，三段式 scaleX 翻面（约 70ms）
- [x] `animateElimination`：集齐消除，槽体 scale 脉冲 + `elastic.out`，`.eliminating` 金边约 600ms
- [x] `animateWinOverlay`：胜利面板自缩小偏下弹跳入场（`back.out(2.2)`）
- [x] `animateLoseOverlay`：`#app` 横向抖动 + 失败面板淡入
- [x] `animateMovesWarning`：剩余步数 ≤10 时计数器脉冲（scale 至约 1.18）

---

### P4-2 — 卡牌标签与遮挡（`ui/CardRenderer.ts` + `style.css`）

- [x] `card-peek` + `is-covered`：纵向叠放时顶部条带可读（`--card-overlap`）；幽灵组内非顶牌同步
- [x] `card-fan-label` + `fan-covered`：Discard 扇形横向遮挡时侧向小字（旋转 90°）
- [x] `card-label`：主标签居中；被上述覆盖类时隐藏
- [x] 移除早期 `.card-category` 灰字分类行

---

### P4-3 — Foundation 槽展示（`ui/CardRenderer.ts` + `style.css`）

- [x] 仅基座：槽内只渲染基座牌
- [x] 有进度：顶牌为非基座；基座以 `.foundation-cat-badge` 书签式露出（主色底）
- [x] `.foundation-progress`：`已收集/总需求`，总需求由 `computeCategoryTotal` 动态计算

---

### P4-4 — Stock 与 Discard（`ui/CardRenderer.ts` + `style.css`）

- [x] Stock：最多 4 层背面（`.stock-back-layer`，`--stock-layer-step`）；张数减少时层数递减；`#stock-pile` `min-height` 防布局跳动
- [x] Discard：最近 3 张扇形（`--card-fan`），新牌居左覆盖；下层 `fan-covered` + 侧标，不参与交互

---

### P4-5 — 布局与尺寸（`style.css`、`index.html`）

- [x] 牌面 `108×144`（约 1.5×），`CardRenderer` / `DragHandler` 硬编码同步
- [x] 页面三行：菜单 + 步数 → Discard + Stock（右对齐）→ Foundation + Tableau
- [x] Foundation / Tableau 横向滑动（隐藏滚动条，支持触摸）
- [x] `.card.selected` 去掉 `translateY` 与阴影变化，减轻长列在屏底的遮挡感

---

### P4-6 — 拖拽与点选（`ui/DragHandler.ts`、`ui/ClickHandler.ts`）

- [x] 可从可移动组内任意已翻开牌起拖，幽灵按抓取深度对齐、无跳变
- [x] `getDragDropProbe` 以 `movingCards[0]`（幽灵 `top:0`）中心探测落点，长组不误触下方列
- [x] 点选与拖动一致：点组内任一张即选中整组

---

> **[评注 — Stock 回收牌序，已修复]** `GameState.reshuffleDiscard` 曾将弃牌 `.reverse()` 写回 Stock，新一巡抽牌顺序与开局相反。正向路径为 `drawFromStock` 用 `shift()`、`discard.push()` 追加，弃牌顺序已与初始 `level.stock` 一致，应原样写回、勿 reverse。见 `src/game/GameState.ts`。

**Phase 4 验收**：✅ GSAP 动效覆盖拖放、抽牌、翻牌、消除与胜败；标签与 Foundation/Stock/Discard 展示可读；布局与交互规则与当前逻辑一致；reshuffle 牌序修复已落地。

---

## Phase 5 — 补充与调整

> 目标：在 Phase 3_d / 4 交付物稳定后，做难度与体验的迭代

### P5-1 — 关卡难度调整

> 下表由 **Phase 3_d「10 关参数记录表」** 原样复制，供 Phase 5 微调；定稿后同步 `data/levels.ts`（`LEVEL_CONFIGS` / `LEVELS`）与（若仍使用）标定备注列。

> 说明：`类别卡牌数` 格式为 `总步数 / A/B/C/D/E...`（与 Phase 3_d 一致）。

| 关卡 | 总步数（movesLimit） | 类别卡牌数（A/B/C/...） | bot通关率 | 备注 |
|------|-----------------------|--------------------------|-----------|------|
| 1 | 30 | 5/4/3/3 | 100% |  |
| 2 | 80 | 7/6/6/6/5/4/3 | 80% |  |
| 3 | 110 | 7/7/8/6/5/5/5/4/3 | 60% |  |
| 4 | 120 | 6/8/7/6/5/4/4/4/3/3 | 50% |  |
| 5 | 110 | 3/4/5/4/4/3/4/4/7/8/4 | 40% |  |
| 6 | 150 | 8/8/7/7/7/6/6/5/4/3/3 | 30% |  |
| 7 | 70 | 5/5/5/3/3/3/3/4/3/3 | 12% |  |
| 8 | 110 | 7/5/5/4/4/4/3/4/3/5/7 | 15% |  |
| 9 | 140 | 3/4/6/6/8/7/7/8/6/5/4 | 12% |  |
| 10 | 140 | 3/4/4/4/4/4/4/5/8/8/8/8 | 8% |  |

- [ ] 按上表（或你微调后的版本）重跑 Bot / 实机试玩，确认梯度与单关体验
- [ ] 将定稿参数写回产品与关卡数据；更新本表「备注」列记录变更要点（可选）

---

### P5-2 — 移动端验证

- [ ] 真机覆盖：常见 iOS / Android 浏览器与 WebView（若有）；横竖屏策略与 `viewport` 行为确认
- [ ] 触摸：拖拽、滚动（Foundation / Tableau 横滑）、菜单与弹窗不触发整页滚动或误触
- [ ] 布局：小屏下牌面、扇形 Discard、步数与菜单不挤压重叠；安全区（刘海、Home 条）留白
- [ ] 性能：长局、多类别时动画与 `sync` 是否掉帧；必要时做 Profiling 与降级策略（动效开关等，待定）

---

### P5-3 — 卡片内容业务位

> 在现有「类别 + 展示标签」之外，为**运营 / 业务**预留可配置字段（文案、图、外链、活动 ID 等），具体字段以产品为准。

- [ ] 数据模型：`types/game.ts`（或关卡数据源）扩展业务字段；明确哪些参与渲染、哪些仅埋点/跳转
- [ ] 渲染：`CardRenderer` / Foundation badge 等可读业务位；空值与过长文案的截断与样式
- [ ] 数据源：`levels` 或独立配置与构建流程（若将来接 CMS，预留加载约定）

---

### P5-4 — 小丑牌

> **规则与范围待定**：例如是否独立花色、能否当万能牌替代基座类别、是否参与生成与步数等。开工前在 `design.md` 或本段下补充「规则摘要」后再拆任务。

- [ ] 玩法定稿：小丑与 Foundation / Tableau / Stock 的交互、胜利条件是否变化
- [ ] 逻辑：`MoveValidator`、`GameState`、（若需要）生成器对小丑的合法移动与结算
- [ ] 表现：牌面样式、动效与文案；与 P5-3 业务位的关系（若小丑也有独立配置）

---

**Phase 5 验收**（待本阶段开工后填写）：关卡表定稿并已同步代码；移动端清单项通过；业务位按约定展示；小丑牌规则闭环可玩。
