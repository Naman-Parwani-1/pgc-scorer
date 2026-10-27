import { describe, expect, it } from 'vitest';
import { toCsv, whatsappLeaderboard } from '../exports';
import { getFormat } from '../formats';
import { drawGroups, drawTeams, teeTimes, shotgunHoles } from '../../data/draw';
import type { Player } from '../types';

const mkPlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    handicapIndex: i * 2,
    tee: 'Blue',
    initials: `P${i}`,
  }));

describe('draw', () => {
  it('splits 16 players into 4 fourballs', () => {
    for (const mode of ['random', 'snake', 'manual'] as const) {
      const groups = drawGroups(mkPlayers(16), mode);
      expect(groups).toHaveLength(4);
      expect(groups.every((g) => g.length === 4)).toBe(true);
      // Nobody lost or duplicated.
      expect(new Set(groups.flat().map((p) => p.id)).size).toBe(16);
    }
  });

  it('snake seeding balances groups by handicap', () => {
    const groups = drawGroups(mkPlayers(16), 'snake');
    const totals = groups.map((g) => g.reduce((a, p) => a + p.handicapIndex, 0));
    const spread = Math.max(...totals) - Math.min(...totals);
    // Perfectly balanced snake across 16 evenly-spaced indexes.
    expect(spread).toBeLessThanOrEqual(4);
  });

  it('builds 2 teams of 8 and 4 teams of 4', () => {
    expect(drawTeams(mkPlayers(16), 2).every((t) => t.length === 8)).toBe(true);
    expect(drawTeams(mkPlayers(16), 4).every((t) => t.length === 4)).toBe(true);
  });

  it('generates a tee-time sheet', () => {
    expect(teeTimes('07:30', 10, 4)).toEqual(['07:30', '07:40', '07:50', '08:00']);
  });

  it('assigns shotgun start holes', () => {
    expect(shotgunHoles(4)).toEqual([1, 2, 3, 4]);
  });
});

describe('WhatsApp leaderboard', () => {
  const rows = Array.from({ length: 16 }, (_, i) => ({
    playerId: `p${i}`,
    name: `Player ${i}`,
    grossTotal: 80 + i,
    netTotal: 70 + i,
    points: 40 - i,
    thru: 18,
    complete: true,
    position: i + 1,
  }));

  it('stays under 900 characters', () => {
    const text = whatsappLeaderboard(rows, getFormat('stableford'), 'PGC Monthly Medal');
    expect(text.length).toBeLessThanOrEqual(900);
  });

  it('truncates a long field with a count', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ ...rows[0], name: `Very Long Player Name ${i}`, position: i + 1 }));
    const text = whatsappLeaderboard(many, getFormat('stableford'), 'Big Event');
    expect(text.length).toBeLessThanOrEqual(900);
    expect(text).toContain('more');
  });

  it('flags countback positions', () => {
    const tied = [{ ...rows[0], countbackNote: 'countback' }];
    const text = whatsappLeaderboard(tied, getFormat('stableford'), 'E');
    expect(text).toContain('countback');
  });
});

describe('CSV export', () => {
  it('emits one row per player per hole with a header', () => {
    const course = { par: Array(18).fill(4), strokeIndex: Array.from({ length: 18 }, (_, i) => i + 1) } as never;
    const results = [
      {
        playerId: 'p0',
        holes: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1, gross: 4, strokesReceived: 0, net: 4, points: 2, pickedUp: false,
        })),
        grossTotal: 72, netTotal: 72, points: 36, thru: 18, complete: true, adjustedGross: 72,
      },
    ];
    const csv = toCsv(results as never, mkPlayers(1), course);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Player');
    expect(lines).toHaveLength(19);
  });

  it('escapes quotes in names', () => {
    const course = { par: Array(18).fill(4), strokeIndex: Array.from({ length: 18 }, (_, i) => i + 1) } as never;
    const results = [{
      playerId: 'p0',
      holes: [{ hole: 1, gross: 4, strokesReceived: 0, net: 4, points: 2, pickedUp: false }],
      grossTotal: 4, netTotal: 4, points: 2, thru: 1, complete: false, adjustedGross: 4,
    }];
    const players = [{ ...mkPlayers(1)[0], name: 'Kartik "KS" Singh' }];
    const csv = toCsv(results as never, players, course);
    expect(csv).toContain('""KS""');
  });
});
