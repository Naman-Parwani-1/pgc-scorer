import type { Course, Player, PlayerResult, FormatConfig } from './types';
import type { LeaderboardRow } from './scoring';

/** CSV of all raw hole-by-hole scores. */
export function toCsv(
  results: PlayerResult[],
  players: Player[],
  course: Course,
): string {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const head = [
    'Player', 'Hole', 'Par', 'StrokeIndex', 'Gross', 'StrokesReceived', 'Net',
    'Points', 'PickedUp',
  ];
  const rows = [head.join(',')];

  for (const r of results) {
    for (const h of r.holes) {
      rows.push([
        `"${nameOf(r.playerId).replace(/"/g, '""')}"`,
        h.hole,
        course.par[h.hole - 1],
        course.strokeIndex[h.hole - 1],
        h.gross ?? '',
        h.strokesReceived,
        h.net ?? '',
        h.points,
        h.pickedUp ? 'yes' : '',
      ].join(','));
    }
  }
  return rows.join('\n');
}

/**
 * Plain-text leaderboard for WhatsApp.
 *
 * Must render correctly inside a chat message and stay under 900 characters,
 * so it truncates with a count rather than wrapping.
 */
export function whatsappLeaderboard(
  rows: LeaderboardRow[],
  format: FormatConfig,
  eventName: string,
  limit = 900,
): string {
  const unit = format.unit === 'stableford' ? 'pts' : format.aggregation === 'gross' ? 'gross' : 'net';

  const header = `*${eventName}*\n${format.name}\n`;
  const lines: string[] = [];

  for (const r of rows) {
    const figure =
      format.unit === 'stableford' || format.unit === 'par-bogey'
        ? `${r.points}`
        : format.aggregation === 'gross'
          ? `${r.grossTotal}`
          : `${r.netTotal}`;
    const thru = r.complete ? 'F' : `${r.thru}`;
    const cb = r.countbackNote ? '*' : '';
    lines.push(`${String(r.position).padStart(2)}. ${r.name} — ${figure}${cb} (${thru})`);
  }

  let body = header + lines.join('\n');
  if (body.length <= limit) {
    return rows.some((r) => r.countbackNote)
      ? `${body}\n\n* decided on countback`
      : body;
  }

  // Truncate to fit.
  let kept = lines.length;
  while (kept > 1) {
    kept -= 1;
    const truncated =
      header + lines.slice(0, kept).join('\n') + `\n…and ${lines.length - kept} more`;
    if (truncated.length <= limit) return truncated;
  }
  return body.slice(0, limit);
}

/** Fixed-width text scorecard, used for the printable card and as a PDF fallback. */
export function textScorecard(
  result: PlayerResult,
  player: Player,
  course: Course,
): string {
  const pad = (s: string | number, n: number) => String(s).padStart(n);
  const holes = result.holes;

  const line = (label: string, vals: (string | number)[]) =>
    `${label.padEnd(6)}${vals.map((v) => pad(v, 4)).join('')}`;

  const front = holes.slice(0, 9);
  const back = holes.slice(9);

  const block = (hs: typeof holes, offset: number) =>
    [
      line('Hole', hs.map((h) => h.hole)),
      line('Par', hs.map((h) => course.par[h.hole - 1])),
      line('SI', hs.map((h) => course.strokeIndex[h.hole - 1])),
      line('Shots', hs.map((h) => (h.strokesReceived === 0 ? '-' : h.strokesReceived))),
      line('Gross', hs.map((h) => h.gross ?? '-')),
      line('Net', hs.map((h) => h.net ?? '-')),
    ].join('\n');

  return [
    `${player.name}  (HI ${player.handicapIndex.toFixed(1)}, ${player.tee})`,
    course.name,
    '',
    block(front, 0),
    `OUT   ${front.reduce((a, h) => a + (h.gross ?? 0), 0)}`,
    '',
    block(back, 9),
    `IN    ${back.reduce((a, h) => a + (h.gross ?? 0), 0)}`,
    '',
    `TOTAL gross ${result.grossTotal} · net ${result.netTotal} · points ${result.points}`,
    result.complete ? '' : 'INCOMPLETE CARD',
  ].join('\n');
}
