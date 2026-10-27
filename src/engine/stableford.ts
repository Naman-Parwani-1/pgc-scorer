/**
 * Stableford points, computed against NET score.
 *
 *   albatross (net = par-3) 5 · eagle 4 · birdie 3 · par 2 · bogey 1 ·
 *   double bogey or worse 0
 *
 * The table is editable for Modified Stableford: keys are (net - par) as strings,
 * with "-3" meaning albatross-or-better and "2" meaning double-bogey-or-worse.
 */
export const STANDARD_POINTS: Record<string, number> = {
  '-3': 5,
  '-2': 4,
  '-1': 3,
  '0': 2,
  '1': 1,
  '2': 0,
};

/**
 * Points for one hole.
 * A picked-up hole (no return) always scores 0.
 */
export function stablefordPoints(
  net: number | null,
  par: number,
  pickedUp = false,
  table: Record<string, number> = STANDARD_POINTS,
): number {
  if (pickedUp || net == null) return 0;

  const diff = net - par;
  const keys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);

  const best = keys[0];
  const worst = keys[keys.length - 1];

  // Better than the best listed entry scores the best entry's value
  // (e.g. a hole-in-one on a par 5 still scores the albatross figure or better).
  if (diff <= best) return table[String(best)];
  // Worse than the worst listed entry scores the worst entry's value, normally 0.
  if (diff >= worst) return table[String(worst)];

  return table[String(diff)] ?? 0;
}
