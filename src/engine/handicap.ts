import { golfRound } from './round';
import type { AllowanceRule, Course, Tee } from './types';

export const HI_MIN = -5.0;
export const HI_MAX = 54.0;

/** Clamp a Handicap Index into the legal WHS range and fix it to one decimal. */
export function normaliseIndex(hi: number): number {
  const clamped = Math.min(HI_MAX, Math.max(HI_MIN, hi));
  return Number(clamped.toFixed(1));
}

/**
 * Course Handicap = round( HI x (Slope / 113) + (CR - Par) )
 *
 * Returns null when the tee has no CR/Slope yet (White and Red ship blank).
 */
export function courseHandicap(
  handicapIndex: number,
  tee: Pick<Tee, 'cr' | 'slope'>,
  coursePar: number,
): number | null {
  if (tee.cr == null || tee.slope == null) return null;
  const hi = normaliseIndex(handicapIndex);
  return golfRound(hi * (tee.slope / 113) + (tee.cr - coursePar));
}

/** Playing Handicap = round( Course Handicap x format allowance ). */
export function playingHandicap(courseHcp: number, factor: number): number {
  return golfRound(courseHcp * factor);
}

/**
 * Stroke allocation by Stroke Index.
 *
 *   PH >= 0 : one stroke where SI <= PH, a second where SI <= PH-18,
 *             a third where SI <= PH-36.
 *   PH <  0 : strokes are given back from SI 18 downward —
 *             one stroke deducted where SI >= 19 - |PH|.
 *
 * Returns 18 entries aligned to hole order (index 0 = hole 1).
 */
export function allocateStrokes(playingHcp: number, strokeIndex: number[]): number[] {
  return strokeIndex.map((si) => {
    if (playingHcp >= 0) {
      let s = 0;
      if (si <= playingHcp) s += 1;
      if (si <= playingHcp - 18) s += 1;
      if (si <= playingHcp - 36) s += 1;
      return s;
    }
    const give = Math.abs(playingHcp);
    return si >= 19 - give ? -1 : 0;
  });
}

/** Net score on a hole = gross - strokes received. */
export function netScore(gross: number, strokesReceived: number): number {
  return gross - strokesReceived;
}

/**
 * Net Double Bogey = par + 2 + strokes received.
 * Handicap-posting figures only — never the live competition score.
 */
export function netDoubleBogey(par: number, strokesReceived: number): number {
  return par + 2 + strokesReceived;
}

/**
 * Adjusted Gross Score for handicap posting: each hole capped at Net Double Bogey.
 * A hole not played (null) is treated as net par per WHS, i.e. par + strokes received.
 */
export function adjustedGrossScore(
  gross: (number | null)[],
  par: number[],
  strokes: number[],
): number {
  return gross.reduce<number>((total, g, i) => {
    const cap = netDoubleBogey(par[i], strokes[i]);
    if (g == null) return total + par[i] + strokes[i];
    return total + Math.min(g, cap);
  }, 0);
}

/** Score Differential = (113 / Slope) x (Adjusted Gross Score - CR). */
export function scoreDifferential(ags: number, cr: number, slope: number): number {
  return Number(((113 / slope) * (ags - cr)).toFixed(1));
}

// ---------------------------------------------------------------------------
// Allowances
// ---------------------------------------------------------------------------

/**
 * Apply a format allowance to a set of Course Handicaps, yielding Playing Handicaps.
 *
 * `combined`, `weighted` and `ordered` rules collapse a team to a single figure and
 * therefore return a one-element array.
 */
export function applyAllowance(courseHcps: number[], rule: AllowanceRule): number[] {
  switch (rule.kind) {
    case 'flat':
      return courseHcps.map((ch) => playingHandicap(ch, rule.factor));

    case 'combined': {
      const sum = courseHcps.reduce((a, b) => a + b, 0);
      return [golfRound(sum * rule.factor)];
    }

    case 'weighted': {
      const sorted = [...courseHcps].sort((a, b) => a - b);
      const low = sorted[0] ?? 0;
      const high = sorted[sorted.length - 1] ?? 0;
      return [golfRound(low * rule.lowFactor + high * rule.highFactor)];
    }

    case 'ordered': {
      const sorted = [...courseHcps].sort((a, b) => a - b);
      const total = sorted.reduce(
        (acc, ch, i) => acc + ch * (rule.factors[i] ?? 0),
        0,
      );
      return [golfRound(total)];
    }
  }
}

/**
 * "Strokes off the lowest" for match-style formats.
 *
 * When `beforeAllowance` is true the lowest Course Handicap is subtracted first and the
 * allowance is applied to the differences. Acceptance test 4 requires this ordering:
 * CHs 6/14/21/28 at 90% -> differences 0/8/15/22 -> x0.9 -> 0/7/14/20.
 *
 * When false the allowance is applied to each handicap first and the lowest resulting
 * Playing Handicap is then subtracted.
 */
export function strokesOffLowest(
  courseHcps: number[],
  factor: number,
  beforeAllowance = true,
): number[] {
  if (beforeAllowance) {
    const lowest = Math.min(...courseHcps);
    return courseHcps.map((ch) => golfRound((ch - lowest) * factor));
  }
  const phs = courseHcps.map((ch) => playingHandicap(ch, factor));
  const lowest = Math.min(...phs);
  return phs.map((ph) => ph - lowest);
}

/** Total par for a course. */
export function coursePar(course: Pick<Course, 'par'>): number {
  return course.par.reduce((a, b) => a + b, 0);
}
