import type { LevelData, Card } from '../types/game'

function card(id: string, category: string, isBase: boolean): Card {
  const label = isBase ? `【${category}】` : `${category}${id.split('-')[1]}`
  return { id, category, isBase, label, faceUp: false }  // initGameState sets actual faceUp
}

/**
 * Level 1 — Tutorial (6 cards, 2 categories)
 *
 * Category A: 【A】, A1, A2
 * Category B: 【B】, B1, B2
 *
 * Tableau (18-card area, here reduced to 6):
 *   Stack0 (2 cards): bottom→top = [A1, 【B】]
 *   Stack1 (2 cards): bottom→top = [B1, A2]
 *   Stack2 empty
 *   Stack3 empty
 *
 * Stock (2 cards): [【A】, B2]   (index 0 = next to draw)
 *
 * Solvable path:
 *   1. Draw 【A】 from stock → place in foundation slot 0
 *   2. Move A2 (top of stack1) → foundation slot 0
 *   3. Move 【B】 (top of stack0) → foundation slot 1
 *   4. Move B1 (now top of stack1) → foundation slot 1
 *   5. Draw B2 from stock → foundation slot 1  (B eliminates!)
 *   6. Move A1 (now top of stack0) → foundation slot 0  (A eliminates!)
 *   Total: 6 moves. movesLimit = 20.
 */
export const level1: LevelData = {
  id: 'level-1',
  name: '第1关 — 入门',
  movesLimit: 20,
  tableau: [
    [card('A-1', 'A', false), card('B-base', 'B', true)],   // stack 0
    [card('B-1', 'B', false), card('A-2', 'A', false)],     // stack 1
    [],                                                        // stack 2
    [],                                                        // stack 3
  ],
  stock: [
    card('A-base', 'A', true),
    card('B-2', 'B', false),
  ],
}

/**
 * Level 2 — 3 categories, Stock plays a bigger role
 *
 * Category A: 【A】, A1, A2
 * Category B: 【B】, B1, B2
 * Category C: 【C】, C1, C2
 *
 * Tableau:
 *   Stack0: [C1, A1]
 *   Stack1: [A2, 【C】]
 *   Stack2: [B1, C2]
 *   Stack3: []
 *
 * Stock: [【A】, 【B】, B2]
 */
export const level2: LevelData = {
  id: 'level-2',
  name: '第2关 — 三分类',
  movesLimit: 30,
  tableau: [
    [card('C-1', 'C', false), card('A-1', 'A', false)],
    [card('A-2', 'A', false), card('C-base', 'C', true)],
    [card('B-1', 'B', false), card('C-2', 'C', false)],
    [],
  ],
  stock: [
    card('A-base', 'A', true),
    card('B-base', 'B', true),
    card('B-2', 'B', false),
  ],
}

export const LEVELS: LevelData[] = [level1, level2]
