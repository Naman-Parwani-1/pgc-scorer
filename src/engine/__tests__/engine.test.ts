import { describe, expect, it } from 'vitest';
import { golfRound } from '../round';
import {
  adjustedGrossScore,
  applyAllowance,
  courseHandicap,
  netDoubleBogey,
  normaliseIndex,
  scoreDifferential,
} from '../handicap';
import { matchStatus } from '../match';
import { formatParBogey, parBogeyHole, parBogeyTotal } from '../parbogey';
import { settle, settlementText } from '../settlement';
import { nassau } from '../nassau';
import { FORMATS, cloneFormat, flightFor, getFormat } from '../formats';
import { PANCHKULA, validateCourse, TEE_TOTALS } from '../../data/seed';

describe('rounding', () => {
  it('rounds half away from zero', () => {
    expect(golfRound(13.5)).toBe(14);
    expect(golfRound(-13.5)).toBe(-14);
    expect(golfRound(-2.5)).toBe(-3);
    expect(golfRound(2.4)).toBe(2);
    expect(golfRound(-2.4)).toBe(-2);
  });

  it('is immune to binary float error', () => {
    expect(golfRound(15 * 0.9)).toBe(14); // 13.499999999999998
  });
});

describe('handicap index range', () => {
  it('clamps to -5.0 .. 54.0 at one decimal', () => {
    expect(normaliseIndex(-9)).toBe(-5);
    expect(normaliseIndex(60)).toBe(54);
    expect(normaliseIndex(18.44)).toBe(18.4);
  });
});

describe('course handicap on unrated tees', () => {
  it('returns null when CR/Slope are blank', () => {
    const white = PANCHKULA.tees.find((t) => t.name === 'White')!;
    expect(courseHandicap(18.4, white, 72)).toBeNull();
  });
});

describe('allowance rules', () => {
  it('foursomes: 50% of combined', () => {
    expect(applyAllowance([10, 20], { kind: 'combined', factor: 0.5 })).toEqual([15]);
  });

  it('greensomes: 60% of lower + 40% of higher', () => {
    // 0.6*10 + 0.4*20 = 14
    expect(
      applyAllowance([20, 10], { kind: 'weighted', lowFactor: 0.6, highFactor: 0.4 }),
    ).toEqual([14]);
  });

  it('scramble of 4: 25/20/15/10 low to high', () => {
    // 0.25*4 + 0.20*8 + 0.15*12 + 0.10*16 = 1 + 1.6 + 1.8 + 1.6 = 6
    expect(
      applyAllowance([8, 4, 16, 12], { kind: 'ordered', factors: [0.25, 0.2, 0.15, 0.1] }),
    ).toEqual([6]);
  });

  it('scramble of 2: 35% low + 15% high', () => {
    // 0.35*10 + 0.15*20 = 3.5 + 3 = 6.5 -> 7
    expect(
      applyAllowance([20, 10], { kind: 'ordered', factors: [0.35, 0.15] }),
    ).toEqual([7]);
  });
});

describe('net double bogey and posting', () => {
  it('caps at par + 2 + strokes received', () => {
    expect(netDoubleBogey(4, 0)).toBe(6);
    expect(netDoubleBogey(4, 2)).toBe(8);
  });

  it('adjusted gross caps each hole', () => {
    const par = Array(18).fill(4);
    const strokes = Array(18).fill(0);
    const gross = Array(18).fill(9); // every hole way over
    // Each capped to 6 -> 108
    expect(adjustedGrossScore(gross, par, strokes)).toBe(108);
  });

  it('treats a hole not played as net par', () => {
    const par = Array(18).fill(4);
    const strokes = Array(18).fill(1);
    const gross = Array(18).fill(null);
    expect(adjustedGrossScore(gross, par, strokes)).toBe(18 * 5);
  });
});

describe('score differential', () => {
  it('(113 / Slope) x (AGS - CR)', () => {
    expect(scoreDifferential(85, 72.0, 113)).toBe(13);
    expect(scoreDifferential(90, 72.0, 130)).toBeCloseTo(15.6, 1);
  });
});

describe('match play', () => {
  const holes = (a: number[], b: number[]) =>
    a.map((v, i) => ({ hole: i + 1, a: v, b: b[i] }));

  it('reports "2 UP thru 11"', () => {
    const a = [3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
    const b = [4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4];
    const s = matchStatus(holes(a, b));
    expect(s.up).toBe(2);
    expect(s.thru).toBe(11);
    expect(s.label).toBe('2 UP thru 11');
    expect(s.closed).toBe(false);
  });

  it('detects dormie', () => {
    // 3 up with 3 to play after 15 holes.
    const a = Array(15).fill(4);
    const b = Array(15).fill(4);
    b[0] = 5; b[1] = 5; b[2] = 5;
    const s = matchStatus(holes(a, b));
    expect(s.up).toBe(3);
    expect(s.holesRemaining).toBe(3);
    expect(s.dormie).toBe(true);
    expect(s.closed).toBe(false);
  });

  it('closes automatically when mathematically decided (3 & 2)', () => {
    const a = Array(16).fill(4);
    const b = Array(16).fill(4);
    b[0] = 5; b[1] = 5; b[2] = 5;
    const s = matchStatus(holes(a, b));
    expect(s.closed).toBe(true);
    expect(s.label).toBe('3 & 2');
    expect(s.winner).toBe('A');
  });

  it('halves a match that goes the distance all square', () => {
    const a = Array(18).fill(4);
    const b = Array(18).fill(4);
    const s = matchStatus(holes(a, b));
    expect(s.winner).toBe('halved');
    expect(s.label).toBe('halved');
  });
});

describe('par / bogey', () => {
  it('scores +1 / 0 / -1 against net par', () => {
    expect(parBogeyHole(3, 4)).toBe(1);
    expect(parBogeyHole(4, 4)).toBe(0);
    expect(parBogeyHole(5, 4)).toBe(-1);
    expect(parBogeyHole(null, 4)).toBe(-1);
    expect(parBogeyHole(3, 4, true)).toBe(-1);
  });

  it('expresses the result in "3 up" style', () => {
    const holes = [
      { hole: 1, result: 1 as const },
      { hole: 2, result: 1 as const },
      { hole: 3, result: 1 as const },
      { hole: 4, result: 0 as const },
    ];
    expect(parBogeyTotal(holes)).toBe(3);
    expect(formatParBogey(3)).toBe('3 up');
    expect(formatParBogey(-2)).toBe('2 down');
    expect(formatParBogey(0)).toBe('all square');
  });
});

describe('nassau', () => {
  it('splits front, back and overall', () => {
    const a = Array(18).fill(4);
    const b = Array(18).fill(4);
    b[0] = 5; // A wins hole 1
    b[9] = 5; // A wins hole 10
    const holes = a.map((v, i) => ({ hole: i + 1, a: v, b: b[i] }));
    const r = nassau(holes);
    expect(r.front.up).toBe(1);
    expect(r.back.up).toBe(1);
    expect(r.overall.up).toBe(2);
  });
});

describe('settlement', () => {
  it('nets down to the fewest transfers', () => {
    const transfers = settle([
      { playerId: 'A', amount: 300 },
      { playerId: 'B', amount: -100 },
      { playerId: 'C', amount: -200 },
    ]);
    expect(transfers).toHaveLength(2);
    expect(transfers.every((t) => t.to === 'A')).toBe(true);
    expect(transfers.reduce((s, t) => s + t.amount, 0)).toBe(300);
  });

  it('reports an all-square group', () => {
    expect(settlementText([], (id) => id)).toContain('All square');
  });

  it('formats in rupees', () => {
    const text = settlementText(
      [{ from: 'B', to: 'A', amount: 250 }],
      (id) => ({ A: 'Kartik', B: 'Raj' })[id] ?? id,
    );
    expect(text).toBe('Raj pays Kartik Rs 250');
  });
});

describe('format registry', () => {
  it('ships every format named in the spec', () => {
    const ids = FORMATS.map((f) => f.id);
    for (const id of [
      'stroke-gross', 'stroke-net', 'stableford', 'modified-stableford',
      'singles-match', 'fourball-match', 'fourball-stroke', 'best-2-of-4',
      'best-3-of-4', 'foursomes', 'greensomes', 'scramble-4', 'texas-scramble',
      'shamble', 'chapman', 'par-bogey', 'skins-gross', 'skins-net',
      'nassau', 'ryder-cup', 'flighted',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('has unique ids', () => {
    const ids = FORMATS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('allows the allowance to be overridden per event', () => {
    const f = cloneFormat('stableford', { allowance: { kind: 'flat', factor: 1.0 } });
    expect(f.allowance).toEqual({ kind: 'flat', factor: 1.0 });
    // The registry entry is untouched.
    expect(getFormat('stableford').allowance).toEqual({ kind: 'flat', factor: 0.95 });
  });

  it('assigns flights by handicap band', () => {
    const f = getFormat('flighted');
    expect(flightFor(5, f)).toBe('A');
    expect(flightFor(14, f)).toBe('B');
    expect(flightFor(30, f)).toBe('C');
    expect(flightFor(10, getFormat('stableford'))).toBeNull();
  });

  it('defaults Texas Scramble to a minimum-drives rule', () => {
    expect(getFormat('texas-scramble').options.minDrives).toBe(3);
  });
});

describe('Panchkula course data', () => {
  it('is par 72 with 36 out and 36 in', () => {
    expect(PANCHKULA.par.reduce((a, b) => a + b, 0)).toBe(72);
    expect(PANCHKULA.par.slice(0, 9).reduce((a, b) => a + b, 0)).toBe(36);
    expect(PANCHKULA.par.slice(9).reduce((a, b) => a + b, 0)).toBe(36);
  });

  it('has Blue yardages totalling 6904 (3520 out, 3384 in)', () => {
    const y = PANCHKULA.tees[0].yards as number[];
    expect(y.slice(0, 9).reduce((a, b) => a + b, 0)).toBe(3520);
    expect(y.slice(9).reduce((a, b) => a + b, 0)).toBe(3384);
    expect(y.reduce((a, b) => a + b, 0)).toBe(TEE_TOTALS.Blue);
  });

  it('carries odd stroke indexes on the front nine and even on the back', () => {
    expect(PANCHKULA.strokeIndex.slice(0, 9).every((v) => v % 2 === 1)).toBe(true);
    expect(PANCHKULA.strokeIndex.slice(9).every((v) => v % 2 === 0)).toBe(true);
  });

  it('passes save validation', () => {
    expect(validateCourse(PANCHKULA)).toEqual({ ok: true, errors: [] });
  });

  it('rejects a bad par total', () => {
    const bad = { ...PANCHKULA, par: [...PANCHKULA.par.slice(0, 17), 5] };
    expect(validateCourse(bad).ok).toBe(false);
  });

  it('rejects a stroke index that is not a permutation of 1-18', () => {
    const bad = { ...PANCHKULA, strokeIndex: [...PANCHKULA.strokeIndex.slice(0, 17), 13] };
    const r = validateCourse(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('permutation');
  });

  it('ships White and Red blank and editable', () => {
    for (const name of ['White', 'Red']) {
      const tee = PANCHKULA.tees.find((t) => t.name === name)!;
      expect(tee.cr).toBeNull();
      expect(tee.slope).toBeNull();
      expect(tee.yards.every((y) => y === null)).toBe(true);
    }
  });
});
