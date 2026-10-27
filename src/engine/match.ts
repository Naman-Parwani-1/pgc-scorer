/**
 * Match play state: running status, dormie detection and automatic closure
 * once the match is mathematically decided.
 */

export interface MatchHole {
  hole: number;
  /** Net (or better-ball net) score for side A. null = not played. */
  a: number | null;
  b: number | null;
}

export interface MatchState {
  /** Positive = A is up, negative = B is up. */
  up: number;
  thru: number;
  holesRemaining: number;
  dormie: boolean;
  closed: boolean;
  /** "2 UP thru 11", "3 & 2", "A/S thru 18". */
  label: string;
  winner: 'A' | 'B' | 'halved' | null;
}

export function matchStatus(holes: MatchHole[], totalHoles = 18): MatchState {
  let up = 0;
  let thru = 0;
  let closedAt: number | null = null;
  let upAtClose = 0;

  for (const h of holes) {
    if (h.a == null || h.b == null) break;
    thru = h.hole;
    if (h.a < h.b) up += 1;
    else if (h.b < h.a) up -= 1;

    const remaining = totalHoles - thru;
    if (Math.abs(up) > remaining && closedAt == null) {
      closedAt = thru;
      upAtClose = up;
      break;
    }
  }

  const holesRemaining = totalHoles - thru;
  const closed = closedAt != null || thru >= totalHoles;

  let winner: MatchState['winner'] = null;
  let label: string;

  if (closedAt != null) {
    const remaining = totalHoles - closedAt;
    winner = upAtClose > 0 ? 'A' : 'B';
    // "3 & 2" — up by 3 with 2 to play. "1 up" when it goes the distance.
    label = remaining === 0
      ? `${Math.abs(upAtClose)} up`
      : `${Math.abs(upAtClose)} & ${remaining}`;
  } else if (thru >= totalHoles) {
    if (up === 0) {
      winner = 'halved';
      label = 'halved';
    } else {
      winner = up > 0 ? 'A' : 'B';
      label = `${Math.abs(up)} up`;
    }
  } else if (up === 0) {
    label = `A/S thru ${thru}`;
  } else {
    label = `${Math.abs(up)} UP thru ${thru}`;
  }

  // Dormie: leading by exactly the number of holes left, match still live.
  const dormie = !closed && up !== 0 && Math.abs(up) === holesRemaining;

  return { up, thru, holesRemaining, dormie, closed, label, winner };
}

/** Which side the status line refers to, for display from one player's view. */
export function matchLabelFor(state: MatchState, side: 'A' | 'B'): string {
  if (side === 'A') return state.label;
  // Flip the perspective.
  if (state.up === 0) return state.label;
  return state.label
    .replace('UP', '__UP__')
    .replace('up', 'down')
    .replace('__UP__', state.up > 0 ? 'DOWN' : 'UP');
}
