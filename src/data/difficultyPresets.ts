import type { LevelConfig } from '../game/LevelGenerator'
import { uniformCategories } from '../game/LevelGenerator'

/**
 * Phase 3_b calibration presets: every tier uses **>8 categories** and parameters chosen so
 * typical generated `movesLimit` (preciseCost + moveBuffer) stays **>100** — verify in debug stats.
 *
 * Fill the "实测 Bot 通关率" column after running 100 greedy-bot trials in the dev panel.
 */
export const DIFFICULTY_CALIBRATION_TABLE: {
  tier: string
  targetPassRate: string
  measuredPassRate: string // placeholder for copy-paste from bot popup
  config: LevelConfig
}[] = [
  {
    tier: '简单',
    targetPassRate: '80%+',
    measuredPassRate: '（填写）',
    config: {
      categories: uniformCategories(9, 4),
      movesLimit: 140,
    },
  },
  {
    tier: '普通',
    targetPassRate: '55–70%',
    measuredPassRate: '（填写）',
    config: {
      categories: uniformCategories(10, 5),
      movesLimit: 160,
    },
  },
  {
    tier: '困难',
    targetPassRate: '30–45%',
    measuredPassRate: '（填写）',
    config: {
      categories: uniformCategories(11, 5),
      movesLimit: 175,
    },
  },
  {
    tier: '挑战',
    targetPassRate: '15–25%',
    measuredPassRate: '（填写）',
    config: {
      categories: uniformCategories(12, 6),
      movesLimit: 190,
    },
  },
]
