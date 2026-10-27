import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Course, Player, PlayerResult, PlayerHandicap, FormatConfig } from '../engine/types';
import type { LeaderboardRow } from '../engine/scoring';

type WithTable = { lastAutoTable: { finalY: number } };

/** Printable scorecard for one group, including the shots-received allocation. */
export function groupScorecardPdf(
  groupName: string,
  eventName: string,
  course: Course,
  players: Player[],
  results: PlayerResult[],
  handicaps: PlayerHandicap[],
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(15);
  doc.text(`${eventName} — ${groupName}`, 14, 14);
  doc.setFontSize(9);
  doc.text(course.name, 14, 20);

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const head = [['', ...holes.map(String), 'OUT', 'IN', 'TOT']];

  const sum = (vals: unknown[], from: number, to: number) =>
    vals.slice(from, to).reduce<number>((a, b) => a + (typeof b === 'number' ? b : 0), 0);

  const body: (string | number)[][] = [];

  body.push(['Par', ...course.par, sum(course.par, 0, 9), sum(course.par, 9, 18), 72]);
  body.push(['SI', ...course.strokeIndex, '', '', '']);

  for (const p of players) {
    const r = results.find((x) => x.playerId === p.id);
    const h = handicaps.find((x) => x.playerId === p.id);
    if (!r || !h) continue;

    const gross = r.holes.map((x) => (x.pickedUp ? '—' : (x.gross ?? '')));
    body.push([
      `${p.name} (${h.playingHandicap})`,
      ...gross,
      sum(gross, 0, 9),
      sum(gross, 9, 18),
      r.grossTotal,
    ]);
    body.push(['  shots', ...h.strokes.map((s) => (s === 0 ? '' : s)), '', '', h.playingHandicap]);
  }

  autoTable(doc, {
    head,
    body,
    startY: 24,
    styles: { fontSize: 7, halign: 'center', cellPadding: 1.2 },
    headStyles: { fillColor: [15, 61, 46] },
    columnStyles: { 0: { halign: 'left', cellWidth: 38 } },
    theme: 'grid',
  });

  const y = (doc as unknown as WithTable).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.text('Scorer signature: ______________________', 14, y);
  doc.text('Player signature: ______________________', 110, y);

  return doc;
}

/** Result sheet for a format, with the countback working when it decided a position. */
export function resultSheetPdf(
  eventName: string,
  format: FormatConfig,
  rows: LeaderboardRow[],
  countbackLines: string[] = [],
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setFontSize(15);
  doc.text(eventName, 14, 16);
  doc.setFontSize(10);
  doc.text(format.name, 14, 23);

  const pts = format.unit === 'stableford' || format.unit === 'par-bogey';

  autoTable(doc, {
    head: [['Pos', 'Player', 'Gross', 'Net', pts ? 'Points' : 'Thru', '']],
    body: rows.map((r) => [
      r.position,
      r.name,
      r.grossTotal || '',
      r.netTotal || '',
      pts ? r.points : r.complete ? 'F' : r.thru,
      r.countbackNote ? 'c/b' : '',
    ]),
    startY: 28,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 61, 46] },
    theme: 'striped',
  });

  if (countbackLines.length) {
    const y = (doc as unknown as WithTable).lastAutoTable.finalY + 8;
    doc.setFontSize(8);
    doc.text('Countback', 14, y);
    countbackLines.forEach((line, i) => doc.text(line, 14, y + 5 + i * 4));
  }

  return doc;
}

/** Trigger a download from the WebView. */
export function download(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
