/**
 * Dynamic Scoring Engine for Rewired CTF.
 *
 * Points awarded for solving a challenge are calculated dynamically based on:
 * 1. Solve-Order Rank (First Blood / Unlock sequence):
 *    - 1st solver (First Blood): 100% of base points (full bounty)
 *    - 2nd solver: 90% of base points
 *    - 3rd solver: 80% of base points
 *    - 4th solver: 70% of base points
 *    - 5th solver: 60% of base points
 *    - 6th+ solver: 50% guaranteed minimum floor
 *
 * 2. Kahoot-Style Contest Clock Speed Bonus:
 *    - Teams that capture flags early while the contest window is wide open
 *      receive up to a +5% speed bonus added to their decayed score, rewarding rapid unlocks.
 */

export interface DynamicScoreBreakdown {
  basePoints: number;
  solveRank: number; // 1-based order (1 = first blood)
  awardedPoints: number;
  rankMultiplier: number;
  timeBonusPoints: number;
  isFirstBlood: boolean;
}

export function calculateDynamicPoints(
  basePoints: number,
  solveRank: number,
  timeRemainingSeconds?: number | null,
  totalDurationSeconds?: number | null
): DynamicScoreBreakdown {
  const safeBase = Math.max(1, Number(basePoints) || 100);
  const safeRank = Math.max(1, Number(solveRank) || 1);
  const isFirstBlood = safeRank === 1;

  // 1. Solve-Order Multiplier
  let rankMultiplier: number;
  switch (safeRank) {
    case 1:
      rankMultiplier = 1.0;
      break;
    case 2:
      rankMultiplier = 0.90;
      break;
    case 3:
      rankMultiplier = 0.80;
      break;
    case 4:
      rankMultiplier = 0.70;
      break;
    case 5:
      rankMultiplier = 0.60;
      break;
    default:
      rankMultiplier = 0.50; // Guaranteed 50% floor
      break;
  }

  // 2. Kahoot-Style Speed Bonus (up to +5% for early solves)
  let timeBonusPoints = 0;
  if (
    !isFirstBlood &&
    timeRemainingSeconds !== undefined &&
    timeRemainingSeconds !== null &&
    totalDurationSeconds !== undefined &&
    totalDurationSeconds !== null &&
    totalDurationSeconds > 0
  ) {
    const timeRatio = Math.max(0, Math.min(1, timeRemainingSeconds / totalDurationSeconds));
    timeBonusPoints = Math.round(safeBase * 0.05 * timeRatio);
  }

  // 3. Final Awarded Points Calculation
  let awardedPoints: number;
  if (isFirstBlood) {
    // First Blood always gets 100% of the challenge's bounty
    awardedPoints = safeBase;
  } else {
    const calculated = Math.round(safeBase * rankMultiplier) + timeBonusPoints;
    const minFloor = Math.max(1, Math.round(safeBase * 0.50));
    awardedPoints = Math.min(safeBase, Math.max(minFloor, calculated));
  }

  return {
    basePoints: safeBase,
    solveRank: safeRank,
    awardedPoints,
    rankMultiplier,
    timeBonusPoints,
    isFirstBlood,
  };
}
