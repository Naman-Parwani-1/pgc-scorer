import type { FormatConfig } from './types';
import { STANDARD_POINTS } from './stableford';

/**
 * Every shipped format, expressed as data. Scoring is driven entirely from these
 * objects — nothing downstream branches on a format id.
 *
 * Default allowances follow the spec and are overridable per event.
 */

const tb = (net: boolean) => ({ countback: true, net });

export const FORMATS: FormatConfig[] = [
  {
    id: 'stroke-gross',
    name: 'Stroke play (gross)',
    unit: 'strokes',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 1.0 },
    aggregation: 'gross',
    tiebreak: tb(false),
    options: {},
  },
  {
    id: 'stroke-net',
    name: 'Stroke play (net)',
    unit: 'strokes',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 0.95 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: {},
  },
  {
    id: 'stableford',
    name: 'Stableford',
    unit: 'stableford',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 0.95 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: { pointTable: { ...STANDARD_POINTS } },
  },
  {
    id: 'modified-stableford',
    name: 'Modified Stableford',
    unit: 'stableford',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 0.95 },
    aggregation: 'net',
    tiebreak: tb(true),
    // Editable table — these are the common "modified" values.
    options: { pointTable: { '-3': 8, '-2': 5, '-1': 2, '0': 0, '1': -1, '2': -3 } },
  },
  {
    id: 'singles-match',
    name: 'Singles match play',
    unit: 'match',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 1.0 },
    aggregation: 'net',
    tiebreak: tb(false),
    matchPlay: true,
    options: { offLowestBeforeAllowance: true },
  },
  {
    id: 'fourball-match',
    name: 'Four-ball better ball (match)',
    unit: 'match',
    teamSize: 2,
    teamScoring: 'best-n-of-m',
    allowance: { kind: 'flat', factor: 0.9 },
    aggregation: 'net',
    tiebreak: tb(false),
    matchPlay: true,
    options: { countBest: 1, offLowestBeforeAllowance: true },
  },
  {
    id: 'fourball-stroke',
    name: 'Four-ball better ball (stroke)',
    unit: 'strokes',
    teamSize: 2,
    teamScoring: 'best-n-of-m',
    allowance: { kind: 'flat', factor: 0.85 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: { countBest: 1 },
  },
  {
    id: 'fourball-stableford',
    name: 'Four-ball better ball (Stableford)',
    unit: 'stableford',
    teamSize: 2,
    teamScoring: 'best-n-of-m',
    allowance: { kind: 'flat', factor: 0.85 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: { countBest: 1, pointTable: { ...STANDARD_POINTS } },
  },
  {
    id: 'best-2-of-4',
    name: 'Best 2 of 4',
    unit: 'strokes',
    teamSize: 4,
    teamScoring: 'best-n-of-m',
    allowance: { kind: 'flat', factor: 0.85 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: { countBest: 2 },
  },
  {
    id: 'best-3-of-4',
    name: 'Best 3 of 4',
    unit: 'strokes',
    teamSize: 4,
    teamScoring: 'best-n-of-m',
    allowance: { kind: 'flat', factor: 0.85 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: { countBest: 3 },
  },
  {
    id: 'foursomes',
    name: 'Foursomes (alternate shot)',
    unit: 'strokes',
    teamSize: 2,
    teamScoring: 'alternate-shot',
    allowance: { kind: 'combined', factor: 0.5 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: {},
  },
  {
    id: 'greensomes',
    name: 'Greensomes',
    unit: 'strokes',
    teamSize: 2,
    teamScoring: 'alternate-shot',
    allowance: { kind: 'weighted', lowFactor: 0.6, highFactor: 0.4 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: {},
  },
  {
    id: 'scramble-4',
    name: 'Scramble (4 players)',
    unit: 'strokes',
    teamSize: 4,
    teamScoring: 'scramble',
    allowance: { kind: 'ordered', factors: [0.25, 0.2, 0.15, 0.1] },
    aggregation: 'net',
    tiebreak: tb(true),
    options: {},
  },
  {
    id: 'scramble-2',
    name: 'Scramble (2 players)',
    unit: 'strokes',
    teamSize: 2,
    teamScoring: 'scramble',
    allowance: { kind: 'ordered', factors: [0.35, 0.15] },
    aggregation: 'net',
    tiebreak: tb(true),
    options: {},
  },
  {
    id: 'texas-scramble',
    name: 'Texas Scramble',
    unit: 'strokes',
    teamSize: 4,
    teamScoring: 'scramble',
    allowance: { kind: 'ordered', factors: [0.25, 0.2, 0.15, 0.1] },
    aggregation: 'net',
    tiebreak: tb(true),
    options: { minDrives: 3 },
  },
  {
    id: 'shamble',
    name: 'Shamble',
    unit: 'strokes',
    teamSize: 4,
    teamScoring: 'best-n-of-m',
    allowance: { kind: 'flat', factor: 0.85 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: { countBest: 2 },
  },
  {
    id: 'chapman',
    name: 'Chapman / Pinehurst',
    unit: 'strokes',
    teamSize: 2,
    teamScoring: 'alternate-shot',
    allowance: { kind: 'weighted', lowFactor: 0.6, highFactor: 0.4 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: {},
  },
  {
    id: 'par-bogey',
    name: 'Par / Bogey competition',
    unit: 'par-bogey',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 0.95 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: {},
  },
  {
    id: 'skins-gross',
    name: 'Skins (gross)',
    unit: 'points',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 1.0 },
    aggregation: 'gross',
    tiebreak: tb(false),
    options: { carryover: true, stake: 100 },
  },
  {
    id: 'skins-net',
    name: 'Skins (net)',
    unit: 'points',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 0.95 },
    aggregation: 'net',
    tiebreak: tb(false),
    options: { carryover: true, stake: 100 },
  },
  {
    id: 'nassau',
    name: 'Nassau (front / back / overall)',
    unit: 'match',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 1.0 },
    aggregation: 'net',
    tiebreak: tb(false),
    matchPlay: true,
    options: { presses: true, stake: 100, offLowestBeforeAllowance: true },
  },
  {
    id: 'ryder-cup',
    name: 'Ryder Cup style team event',
    unit: 'match',
    teamSize: 8,
    teamScoring: 'aggregate',
    allowance: { kind: 'flat', factor: 0.9 },
    aggregation: 'net',
    tiebreak: tb(false),
    matchPlay: true,
    options: {
      sessions: ['Foursomes', 'Four-ball', 'Singles'],
      offLowestBeforeAllowance: true,
    },
  },
  {
    id: 'flighted',
    name: 'Flighted divisions (A/B/C)',
    unit: 'stableford',
    teamSize: 1,
    teamScoring: 'individual',
    allowance: { kind: 'flat', factor: 0.95 },
    aggregation: 'net',
    tiebreak: tb(true),
    options: {
      pointTable: { ...STANDARD_POINTS },
      flights: [
        [-5, 9],
        [10, 18],
        [19, 54],
      ],
    },
  },
];

export function getFormat(id: string): FormatConfig {
  const f = FORMATS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown format: ${id}`);
  return f;
}

/** Clone a format so an event can override its allowance or options safely. */
export function cloneFormat(id: string, overrides: Partial<FormatConfig> = {}): FormatConfig {
  const base = getFormat(id);
  return {
    ...base,
    ...overrides,
    options: { ...base.options, ...(overrides.options ?? {}) },
    tiebreak: { ...base.tiebreak, ...(overrides.tiebreak ?? {}) },
  };
}

/** Which flight a Course Handicap falls into, or null when the format is unflighted. */
export function flightFor(courseHcp: number, format: FormatConfig): string | null {
  const flights = format.options.flights;
  if (!flights) return null;
  const labels = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < flights.length; i++) {
    const [lo, hi] = flights[i];
    if (courseHcp >= lo && courseHcp <= hi) return labels[i] ?? String(i + 1);
  }
  return labels[flights.length - 1] ?? null;
}
