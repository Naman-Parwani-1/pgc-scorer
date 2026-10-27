import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { blankCard, db, uid, type GolfEvent } from '../data/db';
import { drawGroups, shotgunHoles, teeTimes, type DrawMode } from '../data/draw';
import { FORMATS, getFormat } from '../engine/formats';
import { Screen } from '../components/Shell';

export default function EventSetup() {
  const nav = useNavigate();
  const players = useLiveQuery(() => db.players.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [courseId, setCourseId] = useState('');
  const [formatId, setFormatId] = useState('stableford');
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<DrawMode>('snake');
  const [shotgun, setShotgun] = useState(false);
  const [start, setStart] = useState('07:30');
  const [interval, setIntervalMin] = useState(10);
  const [allowance, setAllowance] = useState<number | null>(null);

  const course = courses?.find((c) => c.id === courseId) ?? courses?.[0];
  const format = getFormat(formatId);
  const defaultFactor =
    format.allowance.kind === 'flat' ? format.allowance.factor : null;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function create() {
    if (!course || selected.length === 0) return;

    const chosen = (players ?? []).filter((p) => selected.includes(p.id));
    const eventId = uid();

    const overrides =
      allowance != null && format.allowance.kind === 'flat'
        ? { allowance: { kind: 'flat' as const, factor: allowance } }
        : {};

    const ev: GolfEvent = {
      id: eventId,
      name: name.trim() || 'Untitled event',
      date,
      courseId: course.id,
      formatId,
      formatOverrides: overrides,
      playerIds: chosen.map((p) => p.id),
      startInterval: interval,
      shotgun,
      sideGames: {
        ntp: {},
        longestDriveHole: null,
        longestDrive: null,
        skinsStake: 100,
        skinsNet: true,
        skinsCarryover: true,
      },
      createdAt: Date.now(),
    };

    const groups = drawGroups(chosen, mode);
    const times = teeTimes(start, interval, groups.length);
    const holes = shotgunHoles(groups.length);

    await db.transaction('rw', db.events, db.groups, db.cards, async () => {
      await db.events.put(ev);
      await db.groups.bulkPut(
        groups.map((g, i) => ({
          id: uid(),
          eventId,
          name: `Group ${i + 1}`,
          playerIds: g.map((p) => p.id),
          scorerId: g[0]?.id ?? null,
          teeTime: shotgun ? start : times[i],
          startHole: shotgun ? holes[i] : null,
        })),
      );
      await db.cards.bulkPut(chosen.map((p) => blankCard(p.id, p.tee, eventId)));
    });

    nav(`/event/${eventId}/score`, { replace: true });
  }

  return (
    <Screen title="New event" back>
      <div className="card mb-4 space-y-3">
        <div>
          <label className="label">Event name</label>
          <input className="field" value={name} placeholder="Monthly Medal"
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Date</label>
            <input className="field" type="date" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="label">Course</label>
            <select className="field" value={course?.id ?? ''}
              onChange={(e) => setCourseId(e.target.value)}>
              {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card mb-4 space-y-3">
        <div>
          <label className="label">Format</label>
          <select className="field" value={formatId}
            onChange={(e) => { setFormatId(e.target.value); setAllowance(null); }}>
            {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        {defaultFactor != null && (
          <div>
            <label className="label">
              Handicap allowance — default {Math.round(defaultFactor * 100)}%
            </label>
            <div className="flex items-center gap-3">
              <input
                className="field flex-1" type="number" min={0} max={100} step={5}
                value={Math.round((allowance ?? defaultFactor) * 100)}
                onChange={(e) => setAllowance(Number(e.target.value) / 100)}
              />
              {allowance != null && (
                <button className="btn-ghost !min-h-[44px]" onClick={() => setAllowance(null)}>
                  Reset
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card mb-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold text-sand-50">Field</h2>
          <span className="text-sm text-sand-200/60">{selected.length} selected</span>
        </div>
        {players?.length === 0 ? (
          <p className="text-sand-200/60">Add players first.</p>
        ) : (
          <>
            <button
              className="btn-ghost mb-3 w-full"
              onClick={() =>
                setSelected(
                  selected.length === players?.length ? [] : (players ?? []).map((p) => p.id),
                )
              }
            >
              {selected.length === players?.length ? 'Clear all' : 'Select all'}
            </button>
            <ul className="grid grid-cols-2 gap-2">
              {players?.map((p) => {
                const on = selected.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => toggle(p.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left ${
                        on
                          ? 'border-sand-50 bg-sand-50 text-turf-900'
                          : 'border-turf-600 bg-turf-900 text-sand-50'
                      }`}
                    >
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className={`text-xs ${on ? 'text-turf-700' : 'text-sand-200/50'}`}>
                        {p.handicapIndex.toFixed(1)} · {p.tee}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="card mb-5 space-y-3">
        <div>
          <label className="label">Draw</label>
          <div className="flex gap-2">
            {(['snake', 'random', 'manual'] as DrawMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold capitalize ${
                  mode === m ? 'bg-sand-50 text-turf-900' : 'bg-turf-900 text-sand-200/70'
                }`}
              >
                {m === 'snake' ? 'Balanced' : m}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between py-1">
          <span className="font-medium text-sand-50">Shotgun start</span>
          <input type="checkbox" className="h-6 w-6 accent-sand-50"
            checked={shotgun} onChange={(e) => setShotgun(e.target.checked)} />
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">{shotgun ? 'Start time' : 'First tee'}</label>
            <input className="field" type="time" value={start}
              onChange={(e) => setStart(e.target.value)} />
          </div>
          {!shotgun && (
            <div className="flex-1">
              <label className="label">Interval (min)</label>
              <input className="field" type="number" min={5} max={20} value={interval}
                onChange={(e) => setIntervalMin(Number(e.target.value))} />
            </div>
          )}
        </div>
      </div>

      <button
        className="btn-primary w-full disabled:opacity-40"
        disabled={selected.length === 0}
        onClick={create}
      >
        Create event &amp; draw
      </button>
    </Screen>
  );
}
