/**
 * Par/Bogey competition.
 *
 * Each hole is played against net par: +1 for a hole won, 0 for a half,
 * -1 for a hole lost. The result is expressed in "3 up" style.
 */
export interface ParBogeyHole {
  hole: number;
  result: 1 | 0 | -1;
}

export function parBogeyHole(
  net: number | null,
  par: number,
  pickedUp = false,
): 1 | 0 | -1 {
  if (pickedUp || net == null) return -1;
  if (net < par) return 1;
  if (net === par) return 0;
  return -1;
}

export function parBogeyTotal(holes: ParBogeyHole[]): number {
  return holes.reduce((a, h) => a + h.result, 0);
}

/** "3 up", "2 down", "all square". */
export function formatParBogey(total: number): string {
  if (total === 0) return 'all square';
  return `${Math.abs(total)} ${total > 0 ? 'up' : 'down'}`;
}
