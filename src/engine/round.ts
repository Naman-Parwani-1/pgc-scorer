/**
 * Rounding used throughout the handicap engine.
 *
 * Golf rounds half AWAY FROM ZERO, not JavaScript's half-toward-+Infinity.
 * Math.round(-2.5) === -2, which is wrong for plus handicaps.
 *
 * Acceptance test 4 depends on this: 15 x 0.9 = 13.5 must round to 14.
 */
export function golfRound(n: number): number {
  // Guard against binary float error such as 13.499999999999998.
  const fixed = Number(n.toFixed(9));
  return fixed < 0 ? -Math.round(-fixed) : Math.round(fixed);
}
