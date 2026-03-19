import type { LevelData } from '../types/game'
import { generateFromConfig, CATEGORY_NAMES } from '../game/LevelGenerator'
import type { LevelConfig, CategoryDef } from '../game/LevelGenerator'

function categoriesFromCounts(counts: number[]): CategoryDef[] {
  return counts.map((cardCount, i) => ({
    name: CATEGORY_NAMES[i],
    cardCount,
  }))
}

interface LevelPreset {
  name: string
  movesLimit: number
  counts: number[]
  seed: number
}

// Source: Phase 3_d table in schedule.md (fixed campaign presets).
const PRESETS: LevelPreset[] = [
  { name: '第1关', movesLimit: 30, counts: [5, 4, 3, 3], seed: 1001 },
  { name: '第2关', movesLimit: 80, counts: [7, 6, 6, 6, 5, 4, 3], seed: 1002 },
  { name: '第3关', movesLimit: 130, counts: [7, 7, 8, 6, 5, 5, 5, 4, 3], seed: 1003 },
  { name: '第4关', movesLimit: 120, counts: [7, 7, 8, 6, 5, 5, 5, 4, 3], seed: 1004 },
  { name: '第5关', movesLimit: 130, counts: [7, 7, 8, 6, 5, 5, 5, 4, 6], seed: 1005 },
  { name: '第6关', movesLimit: 180, counts: [8, 8, 7, 7, 7, 6, 6, 5, 4, 3, 3], seed: 1006 },
  { name: '第7关', movesLimit: 80, counts: [5, 5, 5, 3, 3, 3, 3, 4, 3, 3], seed: 1007 },
  { name: '第8关', movesLimit: 120, counts: [7, 5, 5, 4, 4, 4, 3, 4, 3, 5, 7], seed: 1008 },
  { name: '第9关', movesLimit: 150, counts: [3, 4, 6, 6, 8, 7, 7, 8, 6, 5, 4], seed: 1009 },
  { name: '第10关', movesLimit: 150, counts: [3, 4, 4, 4, 4, 4, 4, 5, 8, 8, 8, 8], seed: 1010 },
]

export const LEVEL_CONFIGS: LevelConfig[] = PRESETS.map(p => ({
  categories: categoriesFromCounts(p.counts),
  movesLimit: p.movesLimit,
  seed: p.seed,
}))

export const LEVELS: LevelData[] = PRESETS.map((preset, idx) => {
  const generated = generateFromConfig(LEVEL_CONFIGS[idx])
  return {
    ...generated,
    id: `level-${idx + 1}`,
    name: preset.name,
  }
})
