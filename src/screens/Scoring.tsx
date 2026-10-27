import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../data/db';
import { useEvent } from '../data/useEvent';
import { scoreDifferential } from '../engine/handicap';
import { Screen } from '../components/Shell';

/** Dot notation for strokes received: • one, •• two, ••• three, − given back. */
function dots(n: number): string {
  if (n < 0) return '−'.repeat(Math.abs(n));
  return '•'.repeat(n);
}

export default function Scoring() {
  const { eventId } = useParams();
  const data = useEvent(eventId);
  const [hole, setHole] = useState(1);
  const [groupIdx, setGroupIdx] = useState(0);
  const [showMatrix, setShowMatrix] = useState(false);

  if (!data) return <Screen title="Scoring" back><p className="text-sand-200/60">Loading…</p></Screen>;
  if (data.error) {
    return (
      <Screen title="Scoring" back>
        <div className="rounded-xl border border-flag-500 bg-flag-600/20 p-4 text-sand-50">
          {data.error}
          <Link to="/course" className="btn-primary mt-4 w-full">Open Course Editor</Link>
        </div>
      </Screen>
    );
  }

  const { course, roster, groups, cards, format, handicaps, results, event } = data;
  const group = groups[groupIdx];
  const members = (group?.playerIds ?? roster.map((p) => p.id))
    .map((id) => roster.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const par = course.par[hole - 1];
  const si = course.strokeIndex[hole - 1];
  const stableford = format.unit === 'stableford';

  async function setScore(playerId: string, gross: number | null, pickedUp = false) {
    const card = cards.find((c) => c.playerId === playerId);
    if (!card || card.signed) return;

    const prev = card.scores[hole - 1].gross;
    const scores = card.scores.map((s, i) =>
      i === hole - 1 ? { ...s, gross, pickedUp } : s,
    );

    await db.transaction('rw', db.cards, db.audit, async () => {
      await db.cards.put({ ...card, scores });
      if (prev !== gross) {
        await db.audit.add({
          eventId: eventId!,
          playerId,
          hole,
          from: prev,
          to: gross,
          at: Date.now(),
          note: pickedUp ? 'picked up' : prev == null ? 'entered' : 'edited',
        });
      }
    });
  }

  async function sign(playerId: string) {
    const card = cards.find((c) => c.playerId === playerId);
    if (!card) return;
    const nowSigned = !card.signed;

    await db.transaction('rw', db.cards, db.history, async () => {
      await db.cards.put({ ...card, signed: nowSigned });

      // Signing posts the round for handicap review; unsigning withdraws it.
      const key = `${eventId}:${playerId}`;
      if (nowSigned) {
        const res = results.find((r) => r.playerId === playerId);
        const tee = course.tees.find((t) => t.name === card.tee);
        if (res && tee?.cr != null && tee.slope != null) {
          await db.history.put({
            key,
            playerId,
            date: event.date,
            courseId: course.id,
            tee: card.tee,
            adjustedGross: res.adjustedGross,
            cr: tee.cr,
            slope: tee.slope,
            differential: scoreDifferential(res.adjustedGross, tee.cr, tee.slope),
          });
        }
      } else {
        await db.history.where('key').equals(key).delete();
      }
    });
  }

  async function undoLast() {
    const last = await db.audit.where('eventId').equals(eventId!).last();
    if (!last) return;
    const card = cards.find((c) => c.playerId === last.playerId);
    if (!card || card.signed) return;
    const scores = card.scores.map((s, i) =>
      i === last.hole - 1 ? { ...s, gross: last.from, pickedUp: false } : s,
    );
    await db.transaction('rw', db.cards, db.audit, async () => {
      await db.cards.put({ ...card, scores });
      await db.audit.delete(last.id!);
    });
    setHole(last.hole);
  }

  return (
    <Screen
      title={`Hole ${hole}`}
      subtitle={`Par ${par} · SI ${si} · ${event.name}`}
      back
      action={
        <Link to={`/event/${eventId}/leaderboard`} className="btn-ghost !min-h-[44px] !px-4">
          Board
        </Link>
      }
    >
      {groups.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto no-bar">
          {groups.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setGroupIdx(i)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                i === groupIdx ? 'bg-sand-50 text-turf-900' : 'bg-turf-800 text-sand-200/70'
              }`}
            >
              {g.name}
              {g.startHole ? ` · H${g.startHole}` : g.teeTime ? ` · ${g.teeTime}` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Hole strip — swipe or tap between holes. */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto no-bar pb-1">
        {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => {
          const done = members.every(
            (m) => cards.find((c) => c.playerId === m.id)?.scores[h - 1].gross != null,
          );
          return (
            <button
              key={h}
              onClick={() => setHole(h)}
              className={`h-10 w-10 shrink-0 rounded-lg text-sm font-bold ${
                h === hole
                  ? 'bg-sand-50 text-turf-900'
                  : done
                    ? 'bg-turf-600 text-sand-50'
                    : 'bg-turf-800 text-sand-200/50'
              }`}
            >
              {h}
            </button>
          );
        })}
      </div>

      <ul className="space-y-3">
        {members.map((p) => {
          const card = cards.find((c) => c.playerId === p.id);
          const hcp = handicaps.find((h) => h.playerId === p.id);
          const res = results.find((r) => r.playerId === p.id);
          const entry = card?.scores[hole - 1];
          const received = hcp?.strokes[hole - 1] ?? 0;
          const gross = entry?.gross ?? null;
          const holeRes = res?.holes[hole - 1];
          const locked = card?.signed ?? false;

          return (
            <li key={p.id} className={`card ${locked ? 'opacity-60' : ''}`}>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <span className="truncate font-semibold text-sand-50">{p.name}</span>
                  <span className="ml-2 font-mono text-sm text-flag-500">{dots(received)}</span>
                </div>
                <span className="shrink-0 text-sm text-sand-200/60">
                  {stableford
                    ? `${res?.points ?? 0} pts`
                    : `net ${res?.netTotal ?? 0}`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={locked}
                  onClick={() => setScore(p.id, Math.max(1, (gross ?? par) - 1))}
                  className="h-16 w-16 shrink-0 rounded-2xl bg-turf-700 text-3xl font-bold text-sand-50 active:scale-95 disabled:opacity-30"
                  aria-label={`${p.name} minus one`}
                >
                  −
                </button>

                <div className="flex-1 text-center">
                  <button
                    disabled={locked}
                    onClick={() => gross == null && setScore(p.id, par)}
                    className="w-full"
                  >
                    <span
                      className={`block font-mono text-5xl font-bold leading-none ${
                        entry?.pickedUp
                          ? 'text-flag-500 line-through'
                          : gross == null
                            ? 'text-sand-200/25'
                            : 'text-sand-50'
                      }`}
                    >
                      {entry?.pickedUp ? '—' : (gross ?? par)}
                    </span>
                  </button>
                  <span className="mt-1 block text-xs text-sand-200/50">
                    {gross == null && !entry?.pickedUp
                      ? 'tap to enter'
                      : entry?.pickedUp
                        ? 'picked up'
                        : stableford
                          ? `net ${holeRes?.net} · ${holeRes?.points} pt`
                          : `net ${holeRes?.net}`}
                  </span>
                </div>

                <button
                  disabled={locked}
                  onClick={() => setScore(p.id, (gross ?? par) + 1)}
                  className="h-16 w-16 shrink-0 rounded-2xl bg-turf-700 text-3xl font-bold text-sand-50 active:scale-95 disabled:opacity-30"
                  aria-label={`${p.name} plus one`}
                >
                  +
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  disabled={locked}
                  onClick={() => setScore(p.id, null, !entry?.pickedUp)}
                  className="btn-ghost !min-h-[42px] flex-1 !text-sm disabled:opacity-30"
                >
                  {entry?.pickedUp ? 'Undo pick up' : 'Pick up'}
                </button>
                <button
                  onClick={() => sign(p.id)}
                  className={`!min-h-[42px] flex-1 !text-sm ${locked ? 'btn-danger' : 'btn-ghost'}`}
                >
                  {locked ? 'Signed — unlock' : 'Sign card'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex gap-2">
        <button className="btn-ghost flex-1" onClick={() => setHole((h) => Math.max(1, h - 1))}>
          ‹ Prev
        </button>
        <button className="btn-ghost !px-4" onClick={undoLast}>Undo</button>
        <button className="btn-ghost flex-1" onClick={() => setHole((h) => Math.min(18, h + 1))}>
          Next ›
        </button>
      </div>

      <button
        className="btn-ghost mt-3 w-full !text-sm"
        onClick={() => setShowMatrix((s) => !s)}
      >
        {showMatrix ? 'Hide' : 'Show'} shots-received matrix
      </button>

      {showMatrix && (
        <div className="card mt-3 overflow-x-auto no-bar">
          <table className="w-full border-collapse text-center font-mono text-xs">
            <thead>
              <tr className="text-sand-200/50">
                <th className="py-1 pr-2 text-left font-normal">Player</th>
                {Array.from({ length: 18 }, (_, i) => (
                  <th key={i} className="px-1 font-normal">{i + 1}</th>
                ))}
                <th className="pl-2 font-normal">PH</th>
              </tr>
            </thead>
            <tbody>
              {handicaps.map((h) => {
                const p = roster.find((x) => x.id === h.playerId);
                return (
                  <tr key={h.playerId} className="border-t border-turf-700">
                    <td className="py-1.5 pr-2 text-left text-sand-50">{p?.initials}</td>
                    {h.strokes.map((s, i) => (
                      <td
                        key={i}
                        className={`px-1 ${s > 0 ? 'text-flag-500' : s < 0 ? 'text-sand-200' : 'text-sand-200/20'}`}
                      >
                        {s === 0 ? '·' : s}
                      </td>
                    ))}
                    <td className="pl-2 font-bold text-sand-50">{h.playingHandicap}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}
