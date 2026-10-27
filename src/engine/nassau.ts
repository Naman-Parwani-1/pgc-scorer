/**
 * Nassau — three separate matches: front 9, back 9 and overall,
 * with optional presses.
 */
import { matchStatus, type MatchHole, type MatchState } from './match';

export interface Press {
  /** Hole the press was opened on (1-18). */
  fromHole: number;
  segment: 'front' | 'back' | 'overall';
}

export interface NassauResult {
  front: MatchState;
  back: MatchState;
  overall: MatchState;
  presses: { press: Press; state: MatchState }[];
}

export function nassau(holes: MatchHole[], presses: Press[] = []): NassauResult {
  const front = holes.filter((h) => h.hole <= 9);
  const back = holes.filter((h) => h.hole >= 10);

  const pressStates = presses.map((press) => {
    const slice = holes.filter((h) => {
      if (h.hole < press.fromHole) return false;
      if (press.segment === 'front') return h.hole <= 9;
      if (press.segment === 'back') return h.hole >= 10;
      return true;
    });
    const limit =
      press.segment === 'front'
        ? 9 - press.fromHole + 1
        : press.segment === 'back'
          ? 18 - Math.max(press.fromHole, 10) + 1
          : 18 - press.fromHole + 1;
    return {
      press,
      state: matchStatus(
        slice.map((h, i) => ({ ...h, hole: i + 1 })),
        limit,
      ),
    };
  });

  return {
    front: matchStatus(front, 9),
    back: matchStatus(back.map((h, i) => ({ ...h, hole: i + 1 })), 9),
    overall: matchStatus(holes, 18),
    presses: pressStates,
  };
}
