# 技术设计文档

> 参考游戏：Solitaire Associations Journey
> 文档用途：记录技术选型决策与关卡设计思路，作为开发依据

---

## 一、游戏机制理解

### 1.1 场地布局

```
┌─────────────────────────────────────────────────────────┐
│  [Stock 牌组]  [Discard 弃牌堆]    [槽1][槽2][槽3][槽4]  │
│     46张           ↑逆向抽          ← 基座槽（Foundation）│
│      ↓抽牌                                               │
│  [叠1: 2张]  [叠2: 3张]  [叠3: 4张]  [叠4: 5张]         │
│     顶牌可见    顶牌可见    顶牌可见    顶牌可见           │
└─────────────────────────────────────────────────────────┘
```

- **Tableau（面前4叠）**：共18张，按 2/3/4/5 叠放，仅顶牌可见可操作
- **Stock**：46张有序牌组，每次抽顶牌；抽过的牌进入 Discard 堆
- **Discard**：已抽弃牌，可从顶部逆向抽回；抽完 Stock 后可整体打乱重抽
- **Foundation（基座槽）**：4个，用于放置基座牌并收集同类牌，集齐则消除

### 1.2 卡牌分类

- 全局共有若干**类别**（Category），每类 3-8 张，总牌数 64 张
- 每类有且仅有 1 张**基座牌**（Base Card），如【A】【B】【C】
- 其余为**普通同类牌**，如 A1、A2、A3

### 1.3 核心操作规则

| 操作 | 条件 |
|------|------|
| Tableau 顶牌 → 另一叠顶牌 | 两张牌**同类别**（非基座牌不能作为目标） |
| Tableau 顶牌 → Foundation 槽 | 该槽中已有该类别的基座牌 |
| 基座牌 → Foundation 空槽 | 槽位空闲 |
| 同类连续牌组整体移动 | 顶部若干张同类牌视为一组，整体移动算**1次操作** |
| 从 Stock 抽牌 | 消耗 1 次操作 |

**关键约束**：基座牌在 Tableau 中时，**不接受**同类牌叠放在其上方。只有基座牌进入 Foundation 槽后，才能接收同类牌。

> **[评注]** 可移动组的完整定义需补充两种情形：
>
> - **情形 A**（原有）：顶牌为非基座牌时，向下连续统计同类非基座牌，构成可移动组
> - **情形 B**（补充）：顶牌为基座牌时，基座牌本身 + 其下方连续同类非基座牌共同构成可移动组
>   例：叠底→顶 = `[X, A1, A2, 【A】]`，可移动组为 `[A1, A2, 【A】]`，可整体拖入空 Foundation 槽；【A】自动成为槽底座，A1/A2 自动收入
>
> **[评注]** 显示规则补充：Tableau 中可移动组内的所有牌均应**正面朝上**显示，组以下的牌保持**正面朝下**。（原文仅提"只能看见最表面的一张"，为初始布局描述，合并叠加后规则有所扩展）

### 1.4 胜负判定

- **胜利**：在步数上限内，所有类别均通过 Foundation 槽消除
- **失败**：步数耗尽，仍有未消除的类别

---

## 二、可解性分析

### 2.1 核心模型：依赖图

游戏的可解性本质上是一张**有向依赖图**，节点为各类别，边为"必须先解决谁"的依赖关系。

```
定义：若类别 X 的基座牌【X】在 Tableau 中，
     且其上方压着 Y 类牌，
     且这些 Y 类牌在全局没有其他可合并的落脚点，
     则 X 对 Y 存在「硬依赖」：必须先处理 Y，才能取出【X】

图中出现「环」= 死局（数学上不可解）
图中无环   = 理论可解
```

### 2.2 死锁的直观示例

```
叠1（bottom→top）: [【A】][B1][B2]
叠2（bottom→top）: [【B】][A1][A2]
Stock: 空

想取【A】→ 需移走 B1/B2 → B1/B2 只能放到其他 B 类牌或【B】进槽后
想取【B】→ 需移走 A1/A2 → A1/A2 只能放到其他 A 类牌或【A】进槽后

依赖图：A → B → A   ← 成环，死局
```

> **[评注]** 情形 B 使「基座牌被同类牌压住」的情形减少了一类死锁可能：若基座牌在顶部，即使下方有同类牌，整组仍可一起移走，不构成死锁。死锁分析中「自锁」的判定条件应排除此情形。

### 2.3 依赖图算法（伪代码）

```typescript
// 构建依赖图
function buildDependencyGraph(tableau, stock): Map<Category, Set<Category>> {
  const deps = new Map()

  for each stack in tableau:
    for each card at position depth:
      if card.isBase:
        const blockers = stack.cards above depth
        for each blocker in blockers:
          if !canEscape(blocker.category, elsewhere in tableau/stock):
            deps[card.category].add(blocker.category)  // 硬依赖

  return deps
}

// 检测成环（DFS）
function detectCycle(deps): { hasCycle: boolean, chain: Category[] } {
  // 标准 DFS 三色法：未访问 → 访问中 → 已完成
  // 访问中节点被再次访问 = 发现环
}

// 求合法解锁顺序（Kahn 拓扑排序）
function getUnlockOrder(deps): Category[] | null {
  // 返回 null 表示有环（不可解）
  // 返回数组表示一种合法的解锁顺序
}
```

### 2.4 理论最少步数

```
M_min = 64（每张牌至少移动一次）+ D（解除障碍所需的额外移动）

设定步数上限 130 步，即留出约 66 步的「操作余量」用于处理障碍。
余量越小 → 难度越高；余量越大 → 难度越低。
```

---

## 三、关卡设计方案

### 3.1 倒推生成法（Backward Generation）

业界标准方案，**100% 保证可解**，无需运行时验证。

```
1. 从「胜利状态」出发
   所有牌都已在 Foundation 槽中，分类消除完毕

2. 执行 N 步「反向操作」
   - 将 Foundation 中的牌逆向放回 Tableau 或 Stock
   - 逆向放置时遵守合法性约束

3. N 步反向操作后得到的布局 = 初始局面
   且该局面理论最少步数 = N

4. 调整 N 与参数旋钮 → 控制难度
```

**优点**：
- 生成速度极快（毫秒级），无需搜索
- 难度完全可控
- 天然规避死局

### 3.2 难度参数旋钮

| 旋钮 | 简单 | 中等 | 困难 |
|------|------|------|------|
| 反向步数 N | 低（布局接近有序） | 中 | 高（布局高度混乱） |
| 基座牌埋藏深度 | 顶部或 Stock 前段 | 中段 | 底部或 Stock 后段 |
| 类别间交叉程度 | 同类牌集中在同叠 | 适度分散 | 高度混叠 |
| 步数上限 / M_min 比值 | ≥ 2.0 | 1.3-2.0 | 1.1-1.3 |

### 3.3 目标通关率参考

| 难度档 | 首次通关率目标 |
|--------|--------------|
| 简单（第1-3关） | 80%+ |
| 普通 | 55-70% |
| 困难 | 30-45% |
| 挑战关 | 15-25% |

### 3.4 难度验证：Bot 测试

```
贪心 Bot：每步选当前最优操作（模拟普通玩家）
  通关率 ≈ 目标玩家通关率 → 关卡质量合格

随机 Bot：随机走合法操作（模拟新手）
  通关率 < 20% → 关卡有足够挑战性

最优 Bot：A* 搜索（完全信息）
  必须通关 → 确认关卡存在解
```

### 3.5 10 关难度曲线设计

```
关卡  类别数  每类牌数  步数上限  难度档     设计重点
─────────────────────────────────────────────────────
1      2       3-4      60       教学      基座牌暴露在顶部，演示核心机制
2      2       4-5      70       教学      引入 Stock 抽牌
3      3       3-4      90       简单      三类别，基座牌容易获取
4      3       4-5      100      简单      引入同类牌整组移动
5      4       3-4      110      普通      四槽全部激活，步骤数紧凑
6      4       4-5      115      普通      类别间存在软依赖
7      4       5-6      118      困难      基座牌埋入中层，需规划顺序
8      5       4-5      120      困难      5个类别，槽位调度有压力
9      5       5-6      122      挑战      唯一正确的解锁顺序
10     5       6-7      125      挑战      高交叉度，步数余量极小
```

---

## 四、技术选型

### 4.1 结论

```
Vite + TypeScript + GSAP（纯 Web，无前端框架）
```

### 4.2 选型理由

**Vite**
- 开发服务器启动 < 1秒，热更新即时，迭代效率高
- 构建产物为纯静态文件，直接部署至 GitHub Pages，评审零门槛访问

**TypeScript**
- 类型定义作为整个代码库的"说明书"
- 核心类型（`Card`、`Stack`、`GameState`）一旦定义，所有模块保持一致
- 有效防止数据结构使用错误

**GSAP**
- 行业标准动画库，专为复杂交互动效设计
- 时间轴（Timeline）API 适合编排"翻牌 → 移动 → 吸附"这类多阶段动画
- `ease: "back.out"` 等内置缓动曲线直接提供优质手感

**不使用 React/Vue 的原因**
- 卡牌游戏是命令式逻辑（拖动、放置、触发动画），React 是声明式渲染
- GSAP 直接操作 DOM 节点；React 的 reconciler 会重置被 GSAP 修改的样式
- 混用会引入大量 `useRef` / `useEffect` 的边界处理，增加不必要复杂度

### 4.3 部署方式

```
npm run build → dist/ → GitHub Pages
访问：https://{username}.github.io/{repo-name}
```

---

## 五、项目架构

### 5.1 目录结构

```
src/
├── types/
│   └── game.ts              # 全局类型定义（Card, Stack, GameState 等）
│
├── game/                    # 纯逻辑层，不接触 DOM
│   ├── GameState.ts         # 游戏状态与状态转移
│   ├── MoveValidator.ts     # 合法移动判断
│   ├── LevelGenerator.ts    # 倒推生成关卡
│   └── DifficultyAnalyzer.ts # 依赖图分析、难度评分
│
├── ui/                      # 渲染与交互层
│   ├── CardRenderer.ts      # 创建/更新卡牌 DOM 元素
│   ├── DragHandler.ts       # Pointer Events 拖拽交互
│   └── SnapHandler.ts       # 吸附目标判断与归位
│
├── animations/
│   └── CardAnimations.ts    # 所有 GSAP 动画封装
│
├── data/
│   └── levels.ts            # 10 关关卡数据
│
└── main.ts                  # 入口，初始化游戏
```

### 5.2 核心数据类型

```typescript
interface Card {
  id: string
  category: string        // 'A' | 'B' | 'C' ...
  isBase: boolean         // 是否为基座牌
  isVisible: boolean      // 是否可见（Tableau 中非顶牌为 false）
}

interface Stack {
  id: string
  cards: Card[]           // index 0 = 底部，index length-1 = 顶部
}

interface Foundation {
  id: string
  category: string | null // null = 空槽
  cards: Card[]           // 已收集的同类牌
}

interface GameState {
  tableau: Stack[]        // 面前 4 叠
  stock: Card[]           // 牌组，index 0 = 下一张待抽
  discard: Card[]         // 弃牌堆，index length-1 = 顶部
  foundations: Foundation[] // 4 个基座槽
  movesLeft: number
  isWon: boolean
  isLost: boolean
}
```

### 5.3 层间关系

```
         用户操作（拖拽/点击）
               ↓
        DragHandler / SnapHandler
               ↓
        MoveValidator.isValid()   ← 查询 GameState
               ↓（合法）
        GameState.applyMove()     ← 更新状态
               ↓
        CardRenderer.sync()       ← 同步 DOM
               ↓
        CardAnimations.play()     ← 播放 GSAP 动画
```

游戏逻辑层（`game/`）与渲染层（`ui/`、`animations/`）**严格分离**，逻辑层可独立测试，渲染层可独立替换。

---

## 六、交互与动效方案

### 6.1 拖拽实现

使用 **Pointer Events API**（统一处理鼠标和触摸）：

```
pointerdown → 记录起始位置，克隆卡牌元素跟随指针
pointermove → 移动克隆元素，实时高亮合法放置目标
pointerup   → 判断最近合法目标：
                合法 → applyMove() + 飞行动画到目标位置
                非法 → 弹回动画回到原位
```

### 6.2 关键动画节点

| 时机 | 动画 |
|------|------|
| 卡牌拖起 | 轻微放大 + 阴影增强（提起感） |
| 悬停合法目标 | 目标槽高亮，轻微上移 |
| 放置成功 | 飞行到目标位，`ease: "back.out(1.2)"` 落定感 |
| 放置失败 | 弹回原位，`ease: "elastic.out"` |
| 翻牌（新顶牌显示） | Y 轴旋转 180° 翻转 |
| 类别消除 | 卡牌依次飞出 + 粒子/光效 + 槽位清空 |
| 步数耗尽 | 全局轻微抖动 + 失败遮罩淡入 |
| 胜利 | 消除动画完成后，胜利动效播放 |
