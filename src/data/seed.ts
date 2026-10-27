import type { Course } from '../engine/types';

/**
 * Panchkula Golf Club, Sector 3, Panchkula — Par 72, 18 holes.
 *
 * Out 36 / 3520 · In 36 / 3384 · Total 72 / 6904.
 * White and Red per-hole yardages and their CR/Slope ship blank and are
 * filled in via the Course Editor.
 */
export const PANCHKULA: Course = {
  id: 'panchkula-gc',
  name: 'Panchkula Golf Club, Sector 3',
  par: [4, 3, 4, 3, 5, 4, 4, 5, 4, 4, 4, 5, 3, 4, 5, 4, 3, 4],
  strokeIndex: [13, 15, 7, 17, 1, 11, 9, 3, 5, 10, 16, 2, 18, 8, 4, 12, 14, 6],
  tees: [
    {
      name: 'Blue',
      cr: 72.0,
      slope: 113,
      yards: [
        348, 250, 371, 248, 585, 350, 365, 564, 439,
        359, 292, 563, 201, 433, 505, 355, 201, 475,
      ],
    },
    {
      name: 'White',
      cr: null,
      slope: null,
      yards: Array(18).fill(null),
    },
    {
      name: 'Red',
      cr: null,
      slope: null,
      yards: Array(18).fill(null),
    },
  ],
};

/** Published totals, used by the Course Editor to sanity-check yardage entry. */
export const TEE_TOTALS: Record<string, number> = {
  Blue: 6904,
  White: 6379,
  Red: 5864,
};

/** The four par-3s, where Nearest the Pin is recorded. */
export const PAR_3_HOLES = [2, 4, 13, 17];

export interface CourseValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Course Editor save validation.
 *   - par total = 72
 *   - stroke indexes are a permutation of 1..18
 *   - front nine carries the odd indexes (sum 81), back nine the even (sum 90)
 *
 * Note: "odd sum 81 / even sum 90" is automatically true for any permutation of
 * 1..18, so the meaningful check is the front/back split, which is what the
 * Panchkula card actually does and what is enforced here.
 */
export function validateCourse(course: Course): CourseValidation {
  const errors: string[] = [];

  if (course.par.length !== 18) errors.push('Par must have 18 entries.');
  if (course.strokeIndex.length !== 18) errors.push('Stroke Index must have 18 entries.');

  const parTotal = course.par.reduce((a, b) => a + b, 0);
  if (parTotal !== 72) errors.push(`Par total is ${parTotal}, must be 72.`);

  const sorted = [...course.strokeIndex].sort((a, b) => a - b);
  const isPermutation = sorted.every((v, i) => v === i + 1);
  if (!isPermutation) errors.push('Stroke Index must be a permutation of 1-18.');

  if (isPermutation) {
    const front = course.strokeIndex.slice(0, 9);
    const back = course.strokeIndex.slice(9);
    const frontSum = front.reduce((a, b) => a + b, 0);
    const backSum = back.reduce((a, b) => a + b, 0);

    const frontAllOdd = front.every((v) => v % 2 === 1);
    const backAllEven = back.every((v) => v % 2 === 0);
    const frontAllEven = front.every((v) => v % 2 === 0);
    const backAllOdd = back.every((v) => v % 2 === 1);

    if (!((frontAllOdd && backAllEven) || (frontAllEven && backAllOdd))) {
      errors.push(
        'One nine must carry all the odd stroke indexes and the other all the even ' +
          `(currently front ${frontSum} / back ${backSum}).`,
      );
    }
  }

  for (const tee of course.tees) {
    if (tee.slope != null && (tee.slope < 55 || tee.slope > 155)) {
      errors.push(`${tee.name}: Slope must be between 55 and 155.`);
    }
    if (tee.cr != null && (tee.cr < 55 || tee.cr > 85)) {
      errors.push(`${tee.name}: Course Rating looks out of range.`);
    }
  }

  return { ok: errors.length === 0, errors };
}
