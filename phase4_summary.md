## Phase 4 — 表现层完成记录

---

### 一、动画系统（`src/animations/CardAnimations.ts`，使用 GSAP）

| 函数 | 触发时机 | 效果描述 |
|------|----------|----------|
| `animateLift` | 拖动开始时，作用于幽灵牌组容器 | 整组牌轻微放大（scale 1→1.07），模拟从桌面拾起的感觉 |
| `animateFlyTo` | 拖动松手且落点有效时，作用于幽灵牌组容器 | 幽灵牌飞向目标位置后触发状态更新（`back.out` 缓动，有轻微弹性回弹） |
| `animateSnapBack` | 拖动松手但落点无效时，作用于幽灵牌组容器 | 幽灵牌准确飞回原位（`power3.out`，无超调），复原时与真实牌完全对齐 |
| `animateCardFlip` | tableau 顶部牌翻开时（被压在下面的牌在移走后露出），作用于单张牌 | Y 轴旋转入场（rotationY -90→0，淡入），模拟翻牌 |
| `animateStockDraw` | 点击 stock 堆抽牌时，作用于弃牌区新出现的正面牌 | 三段式翻面：① 牌从 stock 位置向左飞出同时 scaleX 压缩到 0（约 35ms）→ ② 一帧白线（中间态）→ ③ scaleX 展开恢复到 1 并落在 discard 位置（约 35ms），总时长约 70ms 近似"一帧翻面" |
| `animateElimination` | 某分类集齐全部牌消除时，作用于 foundation 槽容器 | 槽快速放大（scale 1→1.35）后弹性收回（`elastic.out`），同时临时加 CSS 类 `.eliminating` 产生金色光晕边框，600ms 后移除 |
| `animateWinOverlay` | 获胜条件触发时，作用于胜利面板内容 | 内容从缩小+偏下位置弹跳入场（`back.out(2.2)`） |
| `animateLoseOverlay` | 步数归零触发失败时，作用于整个 `#app` 和失败面板内容 | 整个棋盘左右震动（7 段 keyframe 抖动），之后失败面板淡入 |
| `animateMovesWarning` | 步数降到 ≤10 时，作用于步数计数器 | 计数器脉冲放大（scale 1→1.18 来回），提醒玩家步数紧张 |

---

### 二、卡牌信息显示（`src/ui/CardRenderer.ts` + `src/style.css`）

#### 2.1 三层标签结构

每张已翻开的牌在 DOM 创建时包含三个 span：

- **`card-peek`**：默认隐藏。当牌被 tableau 中上方的牌垂直覆盖时（加 `is-covered` 类），显示在牌的顶部条带内（高度 = `--card-overlap`），让玩家通过堆叠仍能看到标签内容。幽灵牌组中非顶部牌同样加 `is-covered`，保证拖动时显示一致。
- **`card-fan-label`**：默认隐藏。当牌在 discard 横向扇形展示中被左侧牌水平覆盖时（加 `fan-covered` 类），显示在牌的右侧可见区域，文字旋转 90°（头朝右、底朝左），类似 tableau 的 peek 效果。
- **`card-label`**：居中大字，正常显示牌的主标签（如 A4、B2）。被 `is-covered` 或 `fan-covered` 覆盖时自动隐藏。

移除了早期版本中卡牌下方的灰色小字分类标识（`.card-category`）。

---

### 三、Foundation 槽信息（`src/ui/CardRenderer.ts` + `src/style.css`）

- **仅有基座牌时**：槽内只渲染基座牌本身，视觉不变。
- **有同类牌入槽后**：
  - 渲染最顶部的非基座牌。
  - 基座牌以**书签式 badge**（`.foundation-cat-badge`）的形式从顶部牌上方探出，底边贴合顶部牌顶边，背景色使用该分类的主色；内容不预设格式，支持任意业务字段。
  - 顶部牌右上角显示**进度徽章**（`.foundation-progress`），格式为 `已收集/总需求`（如 `2/5`），总需求通过 `computeCategoryTotal` 遍历全局状态动态计算，消除前始终准确。

---

### 四、Stock 与 Discard 区域（`src/ui/CardRenderer.ts` + `src/style.css`）

#### 4.1 Stock 牌堆厚度

- 渲染最多 4 层背面牌（`.stock-back-layer`），每层向下偏移 `--stock-layer-step`（4px），形成视觉厚度。
- 当库存降到 3 / 2 / 1 张时，层数同步减少，厚度递减。
- `#stock-pile` 的 `min-height` 随层数动态设置，确保 stock 区域高度稳定，不会因变薄而带动下方 tableau 区域跳动。

#### 4.2 Discard 横向扇形展示

- 始终展示最近 3 张牌，横向平铺：最新一张在最左（最上层），较旧的牌向右依次偏移 `--card-fan`（38px）叠在后面。
- 新牌抵达时，最旧的可见牌从渲染中移除，其余牌向右退一格，新牌覆盖在最左侧——整个过程是一帧状态更新，视觉上同步切换。
- 下层两张牌加 `fan-covered` 类，显示旋转的 `card-fan-label`，不响应交互。

---

### 五、整体布局与尺寸（`src/style.css`、`index.html`）

- 卡牌尺寸从原始基准 `72×96px` 放大至 `108×144px`（约 1.5×），所有 JS 中的硬编码常量（`CardRenderer.ts`、`DragHandler.ts`）同步更新。
- 页面结构调整为三行：
  - **第 1 行**：菜单按钮（左）+ 剩余步数（紧跟其后）
  - **第 2 行**：stock 区域靠右对齐（discard 在左、stock 堆在右）
  - **第 3 行起**：foundation 基座槽 + tableau 牌列
- Foundation 和 tableau 区域均支持横向滑动（隐藏滚动条，触摸滑动）。
- 去除点选高亮的位移和光晕效果（`.card.selected` 不再有 `translateY` 和 `box-shadow` 变化），避免长牌组在页面底部被上方区域遮挡。

---

### 六、交互逻辑改进（`src/ui/DragHandler.ts`、`src/ui/ClickHandler.ts`）

- **任意位置拖动**：可从可移动组内任意已翻开的牌开始拖动，不再要求必须从最顶一张（最下层可见牌）开始。幽灵牌初始位置按抓取深度对齐，手指下方的牌不会跳变。
- **落点以最底层（被遮住的那张）为准**：`getDragDropProbe` 取 `movingCards[0]`（幽灵 `top:0` 位置）的中心作为落点探测坐标，用被遮住的那张对准目标槽/目标列，避免长牌组的探测点蔓延到屏幕下方其他列。
- 点选逻辑（`ClickHandler`）与拖动规则一致：点击可移动组内任意一张即可选中整组。

---

### 七、Bug 修复（`src/game/GameState.ts`）

- **stock 用尽后回收牌序反转**：`reshuffleDiscard` 原先在弃牌堆写回 stock 时执行了 `.reverse()`，导致新一轮抽牌顺序与开局完全相反。由于 `drawFromStock` 用 `shift()`（从前端取牌）配合 `discard.push()`（加到末尾），弃牌数组的顺序本就与初始 `level.stock` 一致，应原样写回，不需要 reverse。
