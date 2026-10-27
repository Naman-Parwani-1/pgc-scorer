import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { Empty, Screen } from '../components/Shell';

export default function History() {
  const players = useLiveQuery(() => db.players.toArray(), []);
  const history = useLiveQuery(() => db.history.reverse().sortBy('date'), []);

  if (!history || !players) return <Screen title="History"><p className="text-sand-200/60">Loading…</p></Screen>;

  return (
    <Screen title="History" subtitle="Last 20 rounds per player">
      {history.length === 0 ? (
        <Empty text="No posted rounds yet. Sign a card at the end of a round to post it." />
      ) : (
        <ul className="space-y-4">
          {players.map((p) => {
            const rounds = history.filter((h) => h.playerId === p.id).slice(0, 20);
            if (rounds.length === 0) return null;

            // Handicap Index review: average of the best 8 of the last 20 differentials.
            const diffs = rounds.map((r) => r.differential).sort((a, b) => a - b);
            const best8 = diffs.slice(0, Math.min(8, diffs.length));
            const avg = best8.reduce((a, b) => a + b, 0) / best8.length;

            return (
              <li key={p.id} className="card">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="font-semibold text-sand-50">{p.name}</span>
                  <span className="text-sm text-sand-200/60">
                    HI {p.handicapIndex.toFixed(1)} · review {avg.toFixed(1)}
                  </span>
                </div>
                <ul className="space-y-1">
                  {rounds.map((r) => (
                    <li key={r.id} className="flex justify-between font-mono text-xs text-sand-200/70">
                      <span>{r.date} · {r.tee}</span>
                      <span>AGS {r.adjustedGross} · diff {r.differential.toFixed(1)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
