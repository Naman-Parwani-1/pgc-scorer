import {
  adjustedGrossScore,
  allocateStrokes,
  applyAllowance,
  courseHandicap,
  coursePar,
  netScore,
  strokesOffLowest,
} from './handicap';
import { stablefordPoints } from './stableford';
import { parBogeyHole } from './parbogey';
import { countback, type CountbackEntry, type CountbackResult } from './countback';
import type {
  Card,
  Course,
  FormatConfig,
  HoleResult,
  Player,
  PlayerHandicap,
  PlayerResult,
} from './types';

/** Resolve the tee a player is on. */
function teeFor(course: Course, name: string) {
  const t = course.tees.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown tee: ${name}`);
  return t;
}

/**
 * Course and Playing Handicaps plus stroke allocation for every player.
 *
 * For match-style formats the "off the lowest" rule applies; the ordering of
 * difference-vs-allowance is controlled by options.offLowestBeforeAllowance.
 */
export function computeHandicaps(
  players: Player[],
  course: Course,
  format: FormatConfig,
): PlayerHandicap[] {
  const par = coursePar(course);

  const chs = players.map((p) => {
    const ch = courseHandicap(p.handicapIndex, teeFor(course, p.tee), par);
    if (ch == null) {
      throw new Error(
        `Tee "${p.tee}" has no Course Rating / Slope yet — fill it in the Course Editor.`,
      );
    }
    return ch;
  });

  let phs: number[];

  if (format.matchPlay && format.allowance.kind === 'flat') {
    phs = strokesOffLowest(
      chs,
      format.allowance.factor,
      format.options.offLowestBeforeAllowance ?? true,
    );
  } else if (format.allowance.kind === 'flat') {
    phs = applyAllowance(chs, format.allowance);
  } else {
    // Combining rules collapse the side to one figure; every member plays off it.
    const combined = applyAllowance(chs, format.allowance)[0];
    phs = chs.map(() => combined);
  }

  return players.map((p, i) => ({
    playerId: p.id,
    handicapIndex: p.handicapIndex,
    courseHandicap: chs[i],
    playingHandicap: phs[i],
    strokes: allocateStrokes(phs[i], course.strokeIndex),
  }));
}

/** The shots-received matrix (player x hole) shown on screen and on the printed card. */
export function shotsMatrix(handicaps: PlayerHandicap[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const h of handicaps) out[h.playerId] = h.strokes;
  return out;
}

/** Score one player's card against a format. */
export function scoreCard(
  card: Card,
  hcp: PlayerHandicap,
  course: Course,
  format: FormatConfig,
): PlayerResult {
  const table = format.options.pointTable;
  const holes: HoleResult[] = [];

  let grossTotal = 0;
  let netTotal = 0;
  let points = 0;
  let thru = 0;
  let complete = true;

  for (let i = 0; i < 18; i++) {
    const entry = card.scores[i];
    const par = course.par[i];
    const strokesReceived = hcp.strokes[i];
    const gross = entry?.gross ?? null;
    const pickedUp = entry?.pickedUp ?? false;

    const net = gross == null ? null : netScore(gross, strokesReceived);

    let pts = 0;
    if (format.unit === 'stableford') {
      pts = stablefordPoints(net, par, pickedUp, table);
    } else if (format.unit === 'par-bogey') {
      pts = parBogeyHole(net, par, pickedUp);
    }

    if (gross != null && !pickedUp) {
      grossTotal += gross;
      netTotal += net as number;
      thru = i + 1;
    } else if (pickedUp) {
      // No return on this hole: blanks stroke play, scores 0 in Stableford.
      thru = i + 1;
      complete = false;
    } else {
      complete = false;
    }

    points += pts;

    holes.push({ hole: i + 1, gross, strokesReceived, net, points: pts, pickedUp });
  }

  const adjustedGross = adjustedGrossScore(
    card.scores.map((s) => (s.pickedUp ? null : s.gross)),
    course.par,
    hcp.strokes,
  );

  return {
    playerId: card.playerId,
    holes,
    grossTotal,
    netTotal,
    points,
    thru,
    complete,
    adjustedGross,
  };
}

// ---------------------------------------------------------------------------
// Team scoring
// ---------------------------------------------------------------------------

/**
 * Collapse a side's individual results into one team figure per hole,
 * driven by format.teamScoring.
 */
export function teamHoleValues(
  results: PlayerResult[],
  format: FormatConfig,
): (number | null)[] {
  const useStableford = format.unit === 'stableford';
  const pick = (r: PlayerResult, i: number) =>
    useStableford ? r.holes[i].points : r.holes[i].net;

  return Array.from({ length: 18 }, (_, i) => {
    const vals = results
      .map((r) => pick(r, i))
      .filter((v): v is number => v != null);

    if (vals.length === 0) return null;

    switch (format.teamScoring) {
      case 'individual':
        return vals[0];

      case 'best-n-of-m': {
        const n = format.options.countBest ?? 1;
        const sorted = useStableford
          ? [...vals].sort((a, b) => b - a)
          : [...vals].sort((a, b) => a - b);
        return sorted.slice(0, n).reduce((a, b) => a + b, 0);
      }

      case 'aggregate':
        return vals.reduce((a, b) => a + b, 0);

      case 'alternate-shot':
      case 'scramble':
      case 'combined-net':
        // One ball is played, so the side records a single figure.
        return vals[0];
    }
  });
}

export interface LeaderboardRow {
  playerId: string;
  name: string;
  grossTotal: number;
  netTotal: number;
  points: number;
  thru: number;
  complete: boolean;
  position: number;
  /** Set when countback was needed to separate this row. */
  countbackNote?: string;
  flight?: string | null;
}

/**
 * Build a leaderboard, resolving ties by countback and exposing the working.
 */
export function leaderboard(
  results: PlayerResult[],
  handicaps: PlayerHandicap[],
  players: Player[],
  format: FormatConfig,
): { rows: LeaderboardRow[]; countbacks: Record<string, CountbackResult> } {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const lowerIsBetter = format.unit !== 'stableford' && format.unit !== 'par-bogey';

  const keyOf = (r: PlayerResult) => {
    if (format.unit === 'stableford' || format.unit === 'par-bogey') return r.points;
    return format.aggregation === 'gross' ? r.grossTotal : r.netTotal;
  };

  const sorted = [...results].sort((a, b) =>
    lowerIsBetter ? keyOf(a) - keyOf(b) : keyOf(b) - keyOf(a),
  );

  const countbacks: Record<string, CountbackResult> = {};
  const rows: LeaderboardRow[] = [];

  let position = 0;
  let index = 0;

  while (index < sorted.length) {
    const key = keyOf(sorted[index]);
    const tied = sorted.filter((r) => keyOf(r) === key);
    position += 1;

    let order = tied.map((r) => r.playerId);

    if (tied.length > 1 && format.tiebreak.countback) {
      const entries: CountbackEntry[] = tied.map((r) => ({
        playerId: r.playerId,
        holes: r.holes.map((h) =>
          format.unit === 'stableford' ? h.points : h.net,
        ),
        playingHandicap:
          handicaps.find((h) => h.playerId === r.playerId)?.playingHandicap ?? 0,
      }));
      const cb = countback(entries, format.tiebreak.net, lowerIsBetter);
      order = cb.order;
      for (const id of order) countbacks[id] = cb;
    }

    order.forEach((id, i) => {
      const r = tied.find((x) => x.playerId === id)!;
      const hc = handicaps.find((h) => h.playerId === id);
      rows.push({
        playerId: id,
        name: nameOf(id),
        grossTotal: r.grossTotal,
        netTotal: r.netTotal,
        points: r.points,
        thru: r.thru,
        complete: r.complete,
        position: tied.length > 1 ? position + i : position,
        countbackNote:
          tied.length > 1 && format.tiebreak.countback ? 'countback' : undefined,
        flight: hc ? null : null,
      });
    });

    position += tied.length - 1;
    index += tied.length;
  }

  return { rows, countbacks };
}
