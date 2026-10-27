/**
 * Tie-breaks by standard countback.
 *
 * Applied in order: best back 9, best back 6, best back 3, hole 18,
 * then hole 17 backwards to hole 1, then a coin-toss prompt.
 *
 * For NET countback the player's Playing Handicap is deducted in fractions:
 * PH/2 over the last 9, PH/3 over 6, PH/6 over 3, PH/18 over a single hole.
 */

export interface CountbackEntry {
  playerId: string;
  /** 18 entries, gross or points depending on the format. null = no return. */
  holes: (number | null)[];
  playingHandicap: number;
}

export interface CountbackStep {
  label: string;
  /** playerId -> the figure compared at this step. */
  values: Record<string, number>;
  /** Players still tied after this step. */
  survivors: string[];
  decisive: boolean;
}

export interface CountbackResult {
  /** Ordered best-first. Players still tied after every step share a position. */
  order: string[];
  steps: CountbackStep[];
  /** True when countback exhausted and a coin toss is required. */
  coinToss: boolean;
  tiedAfterAll: string[];
}

/** Sum a slice of holes, treating a no-return as the worst possible figure. */
function sumSlice(
  holes: (number | null)[],
  from: number,
  to: number,
  lowerIsBetter: boolean,
): number {
  let total = 0;
  for (let i = from; i <= to; i++) {
    const v = holes[i];
    if (v == null) {
      // A no-return cannot win a countback.
      total += lowerIsBetter ? 999 : -999;
    } else {
      total += v;
    }
  }
  return total;
}

/** Fractional handicap deduction, not rounded — countback is decided on exact figures. */
function deduction(ph: number, divisor: number, net: boolean): number {
  return net ? ph / divisor : 0;
}

/**
 * Resolve a tie.
 *
 * @param entries   the tied players
 * @param net       true for net countback (applies the PH fractions)
 * @param lowerIsBetter true for strokes, false for Stableford points
 */
export function countback(
  entries: CountbackEntry[],
  net: boolean,
  lowerIsBetter = true,
): CountbackResult {
  const steps: CountbackStep[] = [];
  let survivors = entries.map((e) => e.playerId);

  const stages: { label: string; from: number; to: number; divisor: number }[] = [
    { label: 'Back 9 (holes 10-18)', from: 9, to: 17, divisor: 2 },
    { label: 'Back 6 (holes 13-18)', from: 12, to: 17, divisor: 3 },
    { label: 'Back 3 (holes 16-18)', from: 15, to: 17, divisor: 6 },
  ];
  for (let h = 18; h >= 1; h--) {
    stages.push({ label: `Hole ${h}`, from: h - 1, to: h - 1, divisor: 18 });
  }

  for (const stage of stages) {
    if (survivors.length <= 1) break;

    const values: Record<string, number> = {};
    for (const id of survivors) {
      const e = entries.find((x) => x.playerId === id)!;
      const raw = sumSlice(e.holes, stage.from, stage.to, lowerIsBetter);
      const adj = raw - deduction(e.playingHandicap, stage.divisor, net);
      values[id] = Number(adj.toFixed(4));
    }

    const best = lowerIsBetter
      ? Math.min(...survivors.map((id) => values[id]))
      : Math.max(...survivors.map((id) => values[id]));

    const next = survivors.filter((id) => values[id] === best);
    const decisive = next.length < survivors.length;

    steps.push({ label: stage.label, values, survivors: next, decisive });
    survivors = next;

    if (survivors.length === 1) break;
  }

  // Order: whoever was eliminated latest ranks higher.
  const eliminated: string[] = [];
  let pool = entries.map((e) => e.playerId);
  for (const step of steps) {
    const out = pool.filter((id) => !step.survivors.includes(id));
    // Losers at this step rank below the survivors but above earlier losers.
    eliminated.unshift(...out);
    pool = step.survivors;
  }

  return {
    order: [...pool, ...eliminated],
    steps,
    coinToss: survivors.length > 1,
    tiedAfterAll: survivors.length > 1 ? survivors : [],
  };
}

/** Human-readable working, shown whenever countback decides a position. */
export function explainCountback(result: CountbackResult, nameOf: (id: string) => string): string[] {
  const lines: string[] = [];
  for (const step of result.steps) {
    const parts = Object.entries(step.values)
      .map(([id, v]) => `${nameOf(id)} ${Number.isInteger(v) ? v : v.toFixed(2)}`)
      .join(' · ');
    lines.push(`${step.label}: ${parts}${step.decisive ? '  -> decided' : '  -> still tied'}`);
    if (step.decisive) break;
  }
  if (result.coinToss) lines.push('Countback exhausted — coin toss required.');
  return lines;
}
