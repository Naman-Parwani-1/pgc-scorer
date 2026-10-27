/**
 * Skins — gross or net, with optional carryover.
 *
 * A hole won outright takes the pot: its own unit plus everything carried
 * forward from preceding halved holes.
 */

export interface SkinEntry {
  playerId: string;
  /** 18 entries, gross or net depending on configuration. */
  holes: (number | null)[];
}

export interface SkinHole {
  hole: number;
  winner: string | null;
  /** Units taken on this hole (1 + carried), 0 when halved. */
  units: number;
  carriedIn: number;
}

export interface SkinsResult {
  holes: SkinHole[];
  /** playerId -> units won. */
  totals: Record<string, number>;
  /** Units still carried at the end (nobody won the last hole). */
  unclaimed: number;
}

export function skins(
  entries: SkinEntry[],
  opts: { carryover: boolean } = { carryover: true },
): SkinsResult {
  const holes: SkinHole[] = [];
  const totals: Record<string, number> = {};
  for (const e of entries) totals[e.playerId] = 0;

  let carried = 0;

  for (let i = 0; i < 18; i++) {
    const played = entries.filter((e) => e.holes[i] != null);
    const carriedIn = carried;

    if (played.length === 0) {
      holes.push({ hole: i + 1, winner: null, units: 0, carriedIn });
      continue;
    }

    const best = Math.min(...played.map((e) => e.holes[i] as number));
    const winners = played.filter((e) => e.holes[i] === best);

    if (winners.length === 1) {
      const pot = 1 + carried;
      const id = winners[0].playerId;
      totals[id] += pot;
      holes.push({ hole: i + 1, winner: id, units: pot, carriedIn });
      carried = 0;
    } else {
      // Halved.
      holes.push({ hole: i + 1, winner: null, units: 0, carriedIn });
      carried = opts.carryover ? carried + 1 : 0;
    }
  }

  return { holes, totals, unclaimed: carried };
}
