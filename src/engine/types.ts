/**
 * PGC Scorer — domain types.
 * Everything in /src/engine is pure and side-effect free. The UI never computes a score.
 */

export type TeeName = 'Blue' | 'White' | 'Red' | string;

export interface Tee {
  name: TeeName;
  /** Course Rating. Null until the user fills it in the Course Editor. */
  cr: number | null;
  /** Slope Rating. Null until filled in. */
  slope: number | null;
  /** Per-hole yardages, 18 entries. Null entries are "not yet entered". */
  yards: (number | null)[];
}

export interface Course {
  id: string;
  name: string;
  /** 18 entries. */
  par: number[];
  /** 18 entries, a permutation of 1..18. */
  strokeIndex: number[];
  tees: Tee[];
}

export interface Player {
  id: string;
  name: string;
  /** Handicap Index, -5.0 .. 54.0, one decimal. */
  handicapIndex: number;
  tee: TeeName;
  phone?: string;
  /** Photo initials, e.g. "KS". */
  initials: string;
}

/** A single hole's raw entry. */
export interface HoleScore {
  hole: number;           // 1..18
  gross: number | null;   // null = not yet entered
  pickedUp: boolean;      // no-return on this hole
}

export interface Card {
  playerId: string;
  tee: TeeName;
  scores: HoleScore[];    // 18 entries
  signed: boolean;
}

// ---------------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------------

export type ScoringUnit = 'strokes' | 'stableford' | 'match' | 'par-bogey' | 'points';

export type TeamScoring =
  | 'individual'
  | 'best-n-of-m'
  | 'aggregate'
  | 'alternate-shot'
  | 'scramble'
  | 'combined-net';

export type Aggregation = 'gross' | 'net' | 'both';

/**
 * Allowance may be a flat multiplier applied to each player's Course Handicap,
 * or a combination rule that folds several players' handicaps into one team figure.
 */
export type AllowanceRule =
  | { kind: 'flat'; factor: number }
  /** Foursomes: 50% of combined. */
  | { kind: 'combined'; factor: number }
  /** Greensomes: weighted low/high. */
  | { kind: 'weighted'; lowFactor: number; highFactor: number }
  /** Scramble: an ordered list of factors applied low-to-high. */
  | { kind: 'ordered'; factors: number[] };

export interface TiebreakRule {
  /** Standard countback. */
  countback: boolean;
  /** Net countback deducts PH/2, PH/3, PH/6, PH/18 for 9, 6, 3, 1 holes. */
  net: boolean;
}

export interface FormatOptions {
  /** Modified Stableford point table, keyed by (net - par). */
  pointTable?: Record<string, number>;
  /** best-n-of-m: how many cards count. */
  countBest?: number;
  /** Texas Scramble minimum drives per player. */
  minDrives?: number;
  /** Skins. */
  carryover?: boolean;
  stake?: number;
  /** Nassau presses allowed. */
  presses?: boolean;
  /** Flight bands by Course Handicap, e.g. [[0,9],[10,18],[19,54]]. */
  flights?: [number, number][];
  /**
   * "Off the lowest" ordering. When true the lowest Course Handicap is
   * subtracted BEFORE the allowance is applied.
   *
   * Acceptance test 4 requires this: CHs 6/14/21/28 at 90% off lowest must give
   * 0/7/14/20. Differences first -> 0/8/15/22 -> x0.9 -> 0/7.2/13.5/19.8 -> 0/7/14/20.
   * Allowance first would give 0/8/14/20, which fails the test.
   */
  offLowestBeforeAllowance?: boolean;
  /** Multi-session team event (Ryder Cup style). */
  sessions?: string[];
}

export interface FormatConfig {
  id: string;
  name: string;
  unit: ScoringUnit;
  teamSize: number;
  teamScoring: TeamScoring;
  allowance: AllowanceRule;
  aggregation: Aggregation;
  tiebreak: TiebreakRule;
  options: FormatOptions;
  /** True for match-style formats resolved head-to-head rather than on a leaderboard. */
  matchPlay?: boolean;
}

// ---------------------------------------------------------------------------
// Computed results
// ---------------------------------------------------------------------------

export interface PlayerHandicap {
  playerId: string;
  handicapIndex: number;
  courseHandicap: number;
  playingHandicap: number;
  /** 18 entries: strokes received on each hole (may be negative for plus handicaps). */
  strokes: number[];
}

export interface HoleResult {
  hole: number;
  gross: number | null;
  strokesReceived: number;
  net: number | null;
  points: number;
  pickedUp: boolean;
}

export interface PlayerResult {
  playerId: string;
  holes: HoleResult[];
  grossTotal: number;
  netTotal: number;
  points: number;
  thru: number;
  complete: boolean;
  /** Adjusted Gross Score with Net Double Bogey applied — handicap posting only. */
  adjustedGross: number;
}
