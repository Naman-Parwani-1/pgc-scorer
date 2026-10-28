import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../data/db';
import { getFormat } from '../engine/formats';
import { Empty, Screen } from '../components/Shell';

export default function Home() {
  const nav = useNavigate();
  const events = useLiveQuery(() => db.events.reverse().sortBy('createdAt'), []);
  const players = useLiveQuery(() => db.players.toArray(), []);

  return (
    <Screen
      title="ADS Falcons Scorer"
      subtitle="Panchkula Golf Club"
      action={
        <button className="btn-primary !min-h-[44px] !px-4" onClick={() => nav('/event/new')}>
          New
        </button>
      }
    >
      {events === undefined ? null : events.length === 0 ? (
        <Empty
          text={
            players && players.length === 0
              ? 'Add your players first, then create an event.'
              : 'No events yet.'
          }
          cta={
            players && players.length === 0 ? (
              <Link to="/players" className="btn-primary">Add players</Link>
            ) : (
              <button className="btn-primary" onClick={() => nav('/event/new')}>
                Create an event
              </button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            let formatName = e.formatId;
            try { formatName = getFormat(e.formatId).name; } catch { /* custom */ }
            return (
              <li key={e.id} className="card">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="truncate text-lg font-semibold text-sand-50">{e.name}</h2>
                  <span className="shrink-0 text-sm text-sand-200/60">{e.date}</span>
                </div>
                <p className="mt-1 text-sm text-sand-200/60">
                  {formatName} · {e.playerIds.length} players
                </p>
                <div className="mt-4 flex gap-2">
                  <Link to={`/event/${e.id}/score`} className="btn-primary flex-1">Score</Link>
                  <Link to={`/event/${e.id}/leaderboard`} className="btn-ghost flex-1">Board</Link>
                  <Link to={`/event/${e.id}/side-games`} className="btn-ghost !px-4">₹</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
