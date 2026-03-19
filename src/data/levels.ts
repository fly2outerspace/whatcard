import type { LevelData } from '../types/game'
import { generateFromConfig, CATEGORY_NAMES } from '../game/LevelGenerator'
import type { LevelConfig, CategoryDef, GenerationStats } from '../game/LevelGenerator'

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
}

// Source: schedule.md Phase 5 — P5-1（与 Phase 3_d 表同步）。不设 seed：每次进入/重试本关都会重新洗牌。
const PRESETS: LevelPreset[] = [
  { name: '第1关', movesLimit: 36, counts: [6, 5, 4, 4] },
  { name: '第2关', movesLimit: 80, counts: [7, 6, 6, 5, 5, 4, 4] },
  { name: '第3关', movesLimit: 110, counts: [7, 7, 8, 6, 5, 5, 4, 4, 4] },
  { name: '第4关', movesLimit: 110, counts: [4, 7, 6, 6, 5, 5, 5, 4, 4, 4] },
  { name: '第5关', movesLimit: 110, counts: [3, 4, 5, 4, 4, 3, 4, 4, 7, 8, 4] },
  { name: '第6关', movesLimit: 150, counts: [8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 4] },
  { name: '第7关', movesLimit: 70, counts: [6, 4, 4, 4, 4, 4, 4, 4, 5] },
  { name: '第8关', movesLimit: 110, counts: [7, 5, 5, 4, 4, 4, 3, 4, 3, 5, 7] },
  { name: '第9关', movesLimit: 140, counts: [4, 4, 6, 5, 8, 7, 7, 8, 6, 5, 4] },
  { name: '第10关', movesLimit: 140, counts: [4, 4, 4, 4, 4, 4, 5, 5, 7, 8, 7, 8] },
]

export const LEVEL_CONFIGS: LevelConfig[] = PRESETS.map(p => ({
  categories: categoriesFromCounts(p.counts),
  movesLimit: p.movesLimit,
}))

/** Fresh shuffle for campaign level `level` (1-based). Same category counts + movesLimit each time; seed from PRNG time default in `generateFromConfig`. */
export function generateCampaignLevel(level: number): LevelData & { stats: GenerationStats } {
  const idx = Math.max(0, Math.min(PRESETS.length - 1, level - 1))
  const preset = PRESETS[idx]
  const generated = generateFromConfig(LEVEL_CONFIGS[idx])
  return {
    ...generated,
    id: `level-${level}`,
    name: preset.name,
  }
}
