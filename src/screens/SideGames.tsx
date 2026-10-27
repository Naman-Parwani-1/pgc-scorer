import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../data/db';
import { useEvent } from '../data/useEvent';
import { PAR_3_HOLES } from '../data/seed';
import { skins } from '../engine/skins';
import { settle, settlementText, type Balance } from '../engine/settlement';
import { download } from '../lib/pdf';
import { Screen } from '../components/Shell';

export default function SideGames() {
  const { eventId } = useParams();
  const data = useEvent(eventId);

  const computed = useMemo(() => {
    if (!data || data.error) return null;
    const { event, results } = data;
    const net = event.sideGames.skinsNet;

    const result = skins(
      results.map((r) => ({
        playerId: r.playerId,
        holes: r.holes.map((h) => (h.pickedUp ? null : net ? h.net : h.gross)),
      })),
      { carryover: event.sideGames.skinsCarryover },
    );

    const stake = event.sideGames.skinsStake;
    const players = results.length;
    const totalUnits = Object.values(result.totals).reduce((a, b) => a + b, 0);

    // Everyone contributes stake per hole won; winners collect.
    const balances: Balance[] = results.map((r) => {
      const won = result.totals[r.playerId] ?? 0;
      const contributed = (totalUnits * stake) / players;
      return { playerId: r.playerId, amount: won * stake - contributed };
    });

    return { result, balances, transfers: settle(balances) };
  }, [data]);

  if (!data) return <Screen title="Side games" back><p className="text-sand-200/60">Loading…</p></Screen>;
  if (data.error) return <Screen title="Side games" back><p className="text-sand-50">{data.error}</p></Screen>;

  const { event, roster, course } = data;
  const nameOf = (id: string) => roster.find((p) => p.id === id)?.name ?? id;

  const update = (patch: Partial<typeof event.sideGames>) =>
    db.events.put({ ...event, sideGames: { ...event.sideGames, ...patch } });

  return (
    <Screen title="Side games" subtitle={event.name} back>
      <div className="card mb-4 space-y-3">
        <h2 className="font-semibold text-sand-50">Skins</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Stake per hole (₹)</label>
            <input
              className="field" type="number" min={0} step={50}
              value={event.sideGames.skinsStake}
              onChange={(e) => update({ skinsStake: Number(e.target.value) })}
            />
          </div>
          <div className="flex-1 space-y-2 pt-6">
            <label className="flex items-center justify-between">
              <span className="text-sm text-sand-50">Net</span>
              <input type="checkbox" className="h-5 w-5 accent-sand-50"
                checked={event.sideGames.skinsNet}
                onChange={(e) => update({ skinsNet: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-sand-50">Carryover</span>
              <input type="checkbox" className="h-5 w-5 accent-sand-50"
                checked={event.sideGames.skinsCarryover}
                onChange={(e) => update({ skinsCarryover: e.target.checked })} />
            </label>
          </div>
        </div>

        {computed && (
          <>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {computed.result.holes.map((h) => (
                <span
                  key={h.hole}
                  title={h.winner ? nameOf(h.winner) : 'halved'}
                  className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-bold ${
                    h.winner
                      ? 'bg-sand-50 text-turf-900'
                      : h.carriedIn > 0
                        ? 'bg-flag-600/40 text-sand-50'
                        : 'bg-turf-900 text-sand-200/40'
                  }`}
                >
                  {h.winner ? h.units : h.hole}
                </span>
              ))}
            </div>
            {computed.result.unclaimed > 0 && (
              <p className="text-sm text-flag-500">
                {computed.result.unclaimed} unit{computed.result.unclaimed > 1 ? 's' : ''} carried, unclaimed
              </p>
            )}
            <ul className="space-y-1 pt-1">
              {Object.entries(computed.result.totals)
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([id, units]) => (
                  <li key={id} className="flex justify-between text-sm">
                    <span className="text-sand-50">{nameOf(id)}</span>
                    <span className="font-mono text-sand-50">
                      {units} × ₹{event.sideGames.skinsStake} = ₹{units * event.sideGames.skinsStake}
                    </span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>

      <div className="card mb-4">
        <h2 className="mb-3 font-semibold text-sand-50">Nearest the pin</h2>
        <div className="space-y-2">
          {PAR_3_HOLES.map((h) => (
            <div key={h} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-sand-200/60">
                Hole {h} · par {course.par[h - 1]}
              </span>
              <select
                className="field flex-1 !py-2.5"
                value={event.sideGames.ntp[h] ?? ''}
                onChange={(e) => update({ ntp: { ...event.sideGames.ntp, [h]: e.target.value } })}
              >
                <option value="">—</option>
                {roster.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="mb-3 font-semibold text-sand-50">Longest drive</h2>
        <div className="flex gap-3">
          <select
            className="field w-28"
            value={event.sideGames.longestDriveHole ?? ''}
            onChange={(e) =>
              update({ longestDriveHole: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Hole</option>
            {Array.from({ length: 18 }, (_, i) => i + 1)
              .filter((h) => course.par[h - 1] >= 4)
              .map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select
            className="field flex-1"
            value={event.sideGames.longestDrive ?? ''}
            onChange={(e) => update({ longestDrive: e.target.value || null })}
          >
            <option value="">—</option>
            {roster.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-sand-50">Settlement</h2>
        {computed && computed.transfers.length > 0 ? (
          <>
            <ul className="mb-4 space-y-2">
              {computed.transfers.map((t, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-sand-50">
                    {nameOf(t.from)} → {nameOf(t.to)}
                  </span>
                  <span className="font-mono font-bold text-sand-50">₹{t.amount.toFixed(0)}</span>
                </li>
              ))}
            </ul>
            <button
              className="btn-ghost w-full !text-sm"
              onClick={() =>
                download(
                  `${event.name}-settlement.txt`,
                  settlementText(computed.transfers, nameOf),
                )
              }
            >
              Export as text
            </button>
          </>
        ) : (
          <p className="text-sand-200/60">All square — nothing to settle.</p>
        )}
      </div>
    </Screen>
  );
}
