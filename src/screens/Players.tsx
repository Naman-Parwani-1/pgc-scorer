import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, uid } from '../data/db';
import { normaliseIndex } from '../engine/handicap';
import { Empty, Screen } from '../components/Shell';
import type { Player } from '../engine/types';

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();

export default function Players() {
  const players = useLiveQuery(() => db.players.toArray(), []);
  const course = useLiveQuery(() => db.courses.toCollection().first(), []);
  const [editing, setEditing] = useState<Player | null>(null);

  const blank = (): Player => ({
    id: uid(), name: '', handicapIndex: 18.0, tee: 'Blue', initials: '', phone: '',
  });

  async function save(p: Player) {
    if (!p.name.trim()) return;
    await db.players.put({
      ...p,
      name: p.name.trim(),
      handicapIndex: normaliseIndex(p.handicapIndex),
      initials: p.initials || initialsOf(p.name),
    });
    setEditing(null);
  }

  return (
    <Screen
      title="Players"
      subtitle={players ? `${players.length} on the roster` : undefined}
      action={
        <button className="btn-primary !min-h-[44px] !px-4" onClick={() => setEditing(blank())}>
          Add
        </button>
      }
    >
      {editing && (
        <div className="card mb-5 space-y-3">
          <div>
            <label className="label">Name</label>
            <input
              className="field" autoFocus value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Handicap Index</label>
              <input
                className="field" type="number" step="0.1" min={-5} max={54}
                value={editing.handicapIndex}
                onChange={(e) =>
                  setEditing({ ...editing, handicapIndex: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex-1">
              <label className="label">Tee</label>
              <select
                className="field" value={editing.tee}
                onChange={(e) => setEditing({ ...editing, tee: e.target.value })}
              >
                {(course?.tees ?? []).map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input
              className="field" inputMode="tel" value={editing.phone ?? ''}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-primary flex-1" onClick={() => save(editing)}>Save</button>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            {players?.some((p) => p.id === editing.id) && (
              <button
                className="btn-danger"
                onClick={async () => { await db.players.delete(editing.id); setEditing(null); }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {players?.length === 0 && !editing && (
        <Empty
          text="No players yet. A full field is 16."
          cta={<button className="btn-primary" onClick={() => setEditing(blank())}>Add the first</button>}
        />
      )}

      <ul className="space-y-2">
        {players?.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => setEditing(p)}
              className="card flex w-full items-center gap-3 text-left active:scale-[0.99]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-turf-600 font-bold text-sand-50">
                {p.initials || initialsOf(p.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-sand-50">{p.name}</span>
                <span className="block text-sm text-sand-200/60">{p.tee} tee</span>
              </span>
              <span className="shrink-0 font-mono text-lg text-sand-50">
                {p.handicapIndex.toFixed(1)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
