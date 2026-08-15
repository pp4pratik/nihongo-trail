// Default UserMeta seeded on first launch, when no meta record exists yet.
// getMeta() always returns a UserMeta (§12.7), never undefined, so the
// store seeds sensible defaults rather than pushing "no meta yet" onto
// every caller.

import { generatorParameters } from 'ts-fsrs'
import type { UserMeta } from '@/types'

export function createDefaultMeta(now: Date): UserMeta {
  return {
    createdAt: now.toISOString(),
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: now.toISOString().slice(0, 10),
    streakFreezes: 0,
    hearts: 5, // §9.4
    heartsLastRegenAt: now.toISOString(),
    dailyGoalXp: 30, // Casual, §9.5 default
    earnedBadgeIds: [],
    newItemsPerDay: 5, // §8.7
    requestRetention: 0.9, // §8.3
    fsrsParameters: [...generatorParameters().w],
    settings: {
      theme: 'dark', // §14.4 default
      audioAutoplay: false,
      silentMode: false,
      furiganaEnabled: true,
      fillInBlankMode: 'tap',
    },
  }
}
