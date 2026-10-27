import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEvent } from '../data/useEvent';
import { leaderboard } from '../engine/scoring';
import { explainCountback } from '../engine/countback';
import { matchStatus } from '../engine/match';
import { toCsv, whatsappLeaderboard } from '../engine/exports';
import { groupScorecardPdf, resultSheetPdf, download } from '../lib/pdf';
import { Screen } from '../components/Shell';

export default function Leaderboard() {
  const { eventId } = useParams();
  const data = useEvent(eventId);
  const [tab, setTab] = useState<'board' | 'match'>('board');
  const [copied, setCopied] = useState(false);

  const board = useMemo(() => {
    if (!data || data.error) return null;
    return leaderboard(data.results, data.handicaps, data.roster, data.format);
  }, [data]);

  if (!data) return <Screen title="Leaderboard" back><p className="text-sand-200/60">Loading…</p></Screen>;
  if (data.error) {
    return <Screen title="Leaderboard" back><p className="text-sand-50">{data.error}</p></Screen>;
  }

  const { format, event, course, roster, results, handicaps, groups } = data;
  const pts = format.unit === 'stableford' || format.unit === 'par-bogey';
  const nameOf = (id: string) => roster.find((p) => p.id === id)?.name ?? id;

  const cbLines = board
    ? Object.values(board.countbacks)
        .filter((v, i, a) => a.indexOf(v) === i)
        .flatMap((cb) => explainCountback(cb, nameOf))
    : [];

  async function shareWhatsApp() {
    if (!board) return;
    const text = whatsappLeaderboard(board.rows, format, event.name);
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* user dismissed */ }
  }

  return (
    <Screen title="Leaderboard" subtitle={`${event.name} · ${format.name}`} back>
      {format.matchPlay && (
        <div className="mb-4 flex gap-2">
          {(['board', 'match'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold capitalize ${
                tab === t ? 'bg-sand-50 text-turf-900' : 'bg-turf-800 text-sand-200/70'
              }`}
            >
              {t === 'board' ? 'Leaderboard' : 'Matches'}
            </button>
          ))}
        </div>
      )}

      {tab === 'match' && format.matchPlay ? (
        <ul className="space-y-3">
          {groups.map((g) => {
            const [aId, bId] = g.playerIds;
            const ra = results.find((r) => r.playerId === aId);
            const rb = results.find((r) => r.playerId === bId);
            if (!ra || !rb) return null;
            const state = matchStatus(
              ra.holes.map((h, i) => ({ hole: i + 1, a: h.net, b: rb.holes[i].net })),
            );
            return (
              <li key={g.id} className="card">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-sand-50">
                    {nameOf(aId)} v {nameOf(bId)}
                  </span>
                  {state.dormie && (
                    <span className="rounded bg-flag-500 px-2 py-0.5 text-xs font-bold text-white">
                      DORMIE
                    </span>
                  )}
                </div>
                <p className="mt-1 text-2xl font-bold text-sand-50">{state.label}</p>
                {state.closed && (
                  <p className="mt-1 text-sm text-sand-200/60">
                    Match closed — {state.winner === 'halved' ? 'halved' : `${nameOf(state.winner === 'A' ? aId : bId)} wins`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <ol className="space-y-2">
            {board?.rows.map((r) => (
              <li key={r.playerId} className="card flex items-center gap-3 !py-3">
                <span className="w-7 shrink-0 text-center font-mono text-lg font-bold text-sand-200/60">
                  {r.position}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-sand-50">{r.name}</span>
                  <span className="text-xs text-sand-200/50">
                    {r.complete ? 'F' : `thru ${r.thru}`}
                    {r.countbackNote && ' · countback'}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-xl font-bold text-sand-50">
                    {pts ? r.points : format.aggregation === 'gross' ? r.grossTotal : r.netTotal}
                  </span>
                  <span className="text-xs text-sand-200/50">
                    {pts ? 'pts' : format.aggregation === 'gross' ? 'gross' : 'net'}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {cbLines.length > 0 && (
            <div className="card mt-4">
              <h2 className="mb-2 text-sm font-semibold text-sand-50">Countback working</h2>
              <ul className="space-y-1 font-mono text-xs text-sand-200/70">
                {cbLines.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="mt-5 space-y-2">
        <button className="btn-primary w-full" onClick={shareWhatsApp}>
          {copied ? 'Copied to clipboard' : 'Share to WhatsApp'}
        </button>
        <div className="flex gap-2">
          <button
            className="btn-ghost flex-1 !text-sm"
            onClick={() =>
              download(
                `${event.name}-scores.csv`,
                toCsv(results, roster, course),
                'text/csv',
              )
            }
          >
            CSV
          </button>
          <button
            className="btn-ghost flex-1 !text-sm"
            onClick={() =>
              board && resultSheetPdf(event.name, format, board.rows, cbLines)
                .save(`${event.name}-results.pdf`)
            }
          >
            Result PDF
          </button>
          <button
            className="btn-ghost flex-1 !text-sm"
            onClick={() => {
              for (const g of groups) {
                const members = g.playerIds
                  .map((id) => roster.find((p) => p.id === id))
                  .filter((p): p is NonNullable<typeof p> => !!p);
                groupScorecardPdf(g.name, event.name, course, members, results, handicaps)
                  .save(`${event.name}-${g.name}.pdf`);
              }
            }}
          >
            Cards PDF
          </button>
        </div>
      </div>
    </Screen>
  );
}
