import { describe, expect, it } from 'vitest';
import {
  allocateStrokes,
  courseHandicap,
  playingHandicap,
  strokesOffLowest,
  netScore,
} from '../handicap';
import { stablefordPoints } from '../stableford';
import { countback, explainCountback } from '../countback';
import { skins } from '../skins';
import { PANCHKULA } from '../../data/seed';

const SI = PANCHKULA.strokeIndex;
const PAR = PANCHKULA.par;
const BLUE = PANCHKULA.tees[0];
const COURSE_PAR = 72;

/** Hole numbers (1-based) that received at least `n` strokes. */
const holesWithAtLeast = (strokes: number[], n: number) =>
  strokes.map((s, i) => (s >= n ? i + 1 : 0)).filter(Boolean);

const holesWithNegative = (strokes: number[]) =>
  strokes.map((s, i) => (s < 0 ? i + 1 : 0)).filter(Boolean);

describe('Acceptance test 1 — HI 18.4 on Blue', () => {
  const ch = courseHandicap(18.4, BLUE, COURSE_PAR)!;
  const ph = playingHandicap(ch, 0.95);
  const strokes = allocateStrokes(ph, SI);

  it('Course Handicap is 18', () => {
    expect(ch).toBe(18);
  });

  it('Playing Handicap at 95% is 17', () => {
    expect(ph).toBe(17);
  });

  it('receives strokes on SI 1-17 and none on hole 13 (SI 18)', () => {
    // 17 holes get a stroke.
    expect(strokes.filter((s) => s === 1)).toHaveLength(17);
    // Hole 13 is SI 18 — no stroke.
    expect(SI[12]).toBe(18);
    expect(strokes[12]).toBe(0);
    // Nobody gets two.
    expect(strokes.some((s) => s > 1)).toBe(false);
  });
});

describe('Acceptance test 2 — HI 24.0', () => {
  const ch = courseHandicap(24.0, BLUE, COURSE_PAR)!;
  const ph = playingHandicap(ch, 0.95);
  const strokes = allocateStrokes(ph, SI);

  it('Course Handicap 24, Playing Handicap 23 at 95%', () => {
    expect(ch).toBe(24);
    expect(ph).toBe(23);
  });

  it('one stroke on every hole', () => {
    expect(strokes.every((s) => s >= 1)).toBe(true);
  });

  it('a second stroke on SI 1-5, i.e. holes 5, 12, 8, 15, 9', () => {
    expect(holesWithAtLeast(strokes, 2).sort((a, b) => a - b)).toEqual(
      [5, 12, 8, 15, 9].sort((a, b) => a - b),
    );
  });
});

describe('Acceptance test 3 — plus handicap HI -2.0', () => {
  const ch = courseHandicap(-2.0, BLUE, COURSE_PAR)!;
  const strokes = allocateStrokes(ch, SI);

  it('Course Handicap is -2', () => {
    expect(ch).toBe(-2);
  });

  /**
   * SPEC CORRECTION: the spec names "holes 13, 2", but against its own stroke-index
   * row SI 18 is hole 13 and SI 17 is hole 4. Hole 2 is SI 15. The rule
   * (deduct where SI >= 19 - |PH|) gives SI 17 and 18, so holes 4 and 13.
   */
  it('gives back a stroke on SI 18 and SI 17, i.e. holes 13 and 4', () => {
    expect(SI[12]).toBe(18);
    expect(SI[3]).toBe(17);
    expect(holesWithNegative(strokes).sort((a, b) => a - b)).toEqual([4, 13]);
    expect(strokes.filter((s) => s === -1)).toHaveLength(2);
  });
});

describe('Acceptance test 4 — four-ball better ball, 90% off lowest', () => {
  const chs = [6, 14, 21, 28];
  const diffs = strokesOffLowest(chs, 0.9, true);

  it('playing differences are 0 / 7 / 14 / 20', () => {
    expect(diffs).toEqual([0, 7, 14, 20]);
  });

  it('allocates those differences by Stroke Index', () => {
    const strokes = diffs.map((d) => allocateStrokes(d, SI));
    expect(strokes[0].every((s) => s === 0)).toBe(true);
    // 7 strokes -> SI 1..7
    expect(strokes[1].filter((s) => s === 1)).toHaveLength(7);
    // 14 strokes -> SI 1..14
    expect(strokes[2].filter((s) => s === 1)).toHaveLength(14);
    // 20 strokes -> all 18 holes, plus a second on SI 1 and 2
    expect(strokes[3].every((s) => s >= 1)).toBe(true);
    expect(holesWithAtLeast(strokes[3], 2).sort((a, b) => a - b)).toEqual([5, 12]);
  });

  it('applying the allowance before the subtraction would give the wrong answer', () => {
    // Documents why offLowestBeforeAllowance defaults to true.
    expect(strokesOffLowest(chs, 0.9, false)).toEqual([0, 8, 14, 20]);
  });
});

describe('Acceptance test 5 — Stableford on hole 5 (par 5)', () => {
  const par = PAR[4];

  it('hole 5 is a par 5', () => {
    expect(par).toBe(5);
  });

  /**
   * SPEC CORRECTION: the spec says gross 7 with one stroke -> net 6 -> 0 points.
   * Net 6 on a par 5 is a bogey, which the spec's own table scores as 1.
   * The explicit points table is treated as authoritative.
   */
  it('gross 7 with one stroke -> net 6 -> 1 point (bogey)', () => {
    const net = netScore(7, 1);
    expect(net).toBe(6);
    expect(stablefordPoints(net, par)).toBe(1);
  });

  it('gross 8 with one stroke -> net 7 -> 0 points (double bogey)', () => {
    expect(stablefordPoints(netScore(8, 1), par)).toBe(0);
  });

  it('gross 5 with one stroke -> net 4 -> 3 points (birdie)', () => {
    const net = netScore(5, 1);
    expect(net).toBe(4);
    expect(stablefordPoints(net, par)).toBe(3);
  });

  it('a picked-up hole scores 0', () => {
    expect(stablefordPoints(4, par, true)).toBe(0);
  });
});

describe('Acceptance test 6 — countback on back 9', () => {
  // Two players tie on 71 net; back nines are 35 and 36.
  const frontA = [4, 4, 4, 4, 4, 4, 4, 4, 4]; // 36
  const backA = [4, 4, 4, 4, 4, 4, 4, 4, 3];  // 35
  const frontB = [4, 4, 4, 4, 4, 4, 4, 4, 3]; // 35
  const backB = [4, 4, 4, 4, 4, 4, 4, 4, 4];  // 36

  const entries = [
    { playerId: 'A', holes: [...frontA, ...backA], playingHandicap: 0 },
    { playerId: 'B', holes: [...frontB, ...backB], playingHandicap: 0 },
  ];

  it('both total 71', () => {
    for (const e of entries) {
      expect(e.holes.reduce((a, b) => a + (b as number), 0)).toBe(71);
    }
  });

  it('back 9 of 35 beats 36', () => {
    const result = countback(entries, false, true);
    expect(result.order[0]).toBe('A');
    expect(result.steps[0].label).toContain('Back 9');
    expect(result.steps[0].values.A).toBe(35);
    expect(result.steps[0].values.B).toBe(36);
    expect(result.steps[0].decisive).toBe(true);
  });

  it('shows the working', () => {
    const result = countback(entries, false, true);
    const lines = explainCountback(result, (id) => id);
    expect(lines[0]).toContain('Back 9');
    expect(lines[0]).toContain('decided');
  });

  it('net countback deducts PH/2 over the last nine', () => {
    const net = countback(
      [
        { playerId: 'A', holes: [...frontA, ...backA], playingHandicap: 18 },
        { playerId: 'B', holes: [...frontB, ...backB], playingHandicap: 10 },
      ],
      true,
      true,
    );
    // A: 35 - 9 = 26 ; B: 36 - 5 = 31
    expect(net.steps[0].values.A).toBe(26);
    expect(net.steps[0].values.B).toBe(31);
    expect(net.order[0]).toBe('A');
  });
});

describe('Acceptance test 7 — skins with carryover', () => {
  // Holes 1 and 2 halved, hole 3 won outright by A.
  const mk = (h1: number, h2: number, h3: number) => [
    h1, h2, h3, ...Array(15).fill(null),
  ];

  const result = skins(
    [
      { playerId: 'A', holes: mk(4, 4, 3) },
      { playerId: 'B', holes: mk(4, 4, 4) },
    ],
    { carryover: true },
  );

  it('holes 1 and 2 are halved', () => {
    expect(result.holes[0].winner).toBeNull();
    expect(result.holes[1].winner).toBeNull();
  });

  it('hole 3 pays 3 units to the winner', () => {
    expect(result.holes[2].winner).toBe('A');
    expect(result.holes[2].carriedIn).toBe(2);
    expect(result.holes[2].units).toBe(3);
    expect(result.totals.A).toBe(3);
    expect(result.totals.B).toBe(0);
  });

  it('with carryover off, hole 3 pays only 1 unit', () => {
    const noCarry = skins(
      [
        { playerId: 'A', holes: mk(4, 4, 3) },
        { playerId: 'B', holes: mk(4, 4, 4) },
      ],
      { carryover: false },
    );
    expect(noCarry.totals.A).toBe(1);
  });
});
