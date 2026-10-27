import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, uid } from '../data/db';
import { validateCourse } from '../data/seed';
import { Screen } from '../components/Shell';
import type { Course } from '../engine/types';

export default function CourseEditor() {
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Course | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!courses?.length) return;
    const target = courses.find((c) => c.id === courseId) ?? courses[0];
    setCourseId(target.id);
    setDraft(structuredClone(target));
  }, [courses, courseId]);

  if (!draft) return <Screen title="Course"><p className="text-sand-200/60">Loading…</p></Screen>;

  const setHole = (i: number, key: 'par' | 'strokeIndex', v: number) => {
    const next = structuredClone(draft);
    next[key][i] = v;
    setDraft(next); setSaved(false);
  };

  const setTee = (ti: number, key: 'cr' | 'slope', v: number | null) => {
    const next = structuredClone(draft);
    next.tees[ti][key] = v;
    setDraft(next); setSaved(false);
  };

  const setYards = (ti: number, i: number, v: number | null) => {
    const next = structuredClone(draft);
    next.tees[ti].yards[i] = v;
    setDraft(next); setSaved(false);
  };

  async function save() {
    const result = validateCourse(draft!);
    setErrors(result.errors);
    if (!result.ok) { setSaved(false); return; }
    await db.courses.put(draft!);
    setSaved(true);
  }

  async function addCourse() {
    const fresh: Course = {
      id: uid(),
      name: 'New course',
      par: Array(18).fill(4),
      strokeIndex: [1,3,5,7,9,11,13,15,17,2,4,6,8,10,12,14,16,18],
      tees: [{ name: 'Blue', cr: null, slope: null, yards: Array(18).fill(null) }],
    };
    await db.courses.put(fresh);
    setCourseId(fresh.id);
  }

  const parTotal = draft.par.reduce((a, b) => a + b, 0);

  return (
    <Screen
      title="Course"
      subtitle={`Par ${parTotal}`}
      action={<button className="btn-primary !min-h-[44px] !px-4" onClick={save}>Save</button>}
    >
      <div className="mb-4 flex gap-2">
        <select
          className="field flex-1"
          value={courseId ?? ''}
          onChange={(e) => setCourseId(e.target.value)}
        >
          {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn-ghost !px-4" onClick={addCourse}>+</button>
      </div>

      <div className="card mb-4">
        <label className="label">Course name</label>
        <input
          className="field"
          value={draft.name}
          onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setSaved(false); }}
        />
      </div>

      {errors.length > 0 && (
        <div className="mb-4 rounded-xl border border-flag-500 bg-flag-600/20 p-4">
          <p className="mb-2 font-semibold text-sand-50">Cannot save</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-sand-100">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}
      {saved && (
        <p className="mb-4 rounded-xl border border-turf-600 bg-turf-700 p-3 text-sm text-sand-50">
          Saved.
        </p>
      )}

      <div className="card mb-4 overflow-x-auto no-bar">
        <h2 className="mb-3 font-semibold text-sand-50">Par &amp; Stroke Index</h2>
        <table className="w-full border-collapse text-center font-mono text-sm">
          <thead>
            <tr className="text-sand-200/60">
              <th className="py-1 pr-2 text-left font-normal">Hole</th>
              {draft.par.map((_, i) => <th key={i} className="px-1 py-1 font-normal">{i + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1 pr-2 text-left text-sand-200/60">Par</td>
              {draft.par.map((p, i) => (
                <td key={i} className="px-0.5 py-1">
                  <input
                    className="w-9 rounded bg-turf-900 py-1 text-center text-sand-50"
                    type="number" min={3} max={6} value={p}
                    onChange={(e) => setHole(i, 'par', Number(e.target.value))}
                  />
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-1 pr-2 text-left text-sand-200/60">SI</td>
              {draft.strokeIndex.map((s, i) => (
                <td key={i} className="px-0.5 py-1">
                  <input
                    className="w-9 rounded bg-turf-900 py-1 text-center text-sand-50"
                    type="number" min={1} max={18} value={s}
                    onChange={(e) => setHole(i, 'strokeIndex', Number(e.target.value))}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {draft.tees.map((tee, ti) => (
        <div key={tee.name} className="card mb-4">
          <h2 className="mb-3 font-semibold text-sand-50">{tee.name} tee</h2>
          <div className="mb-3 flex gap-3">
            <div className="flex-1">
              <label className="label">Course Rating</label>
              <input
                className="field" type="number" step="0.1" placeholder="—"
                value={tee.cr ?? ''}
                onChange={(e) =>
                  setTee(ti, 'cr', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </div>
            <div className="flex-1">
              <label className="label">Slope</label>
              <input
                className="field" type="number" placeholder="—"
                value={tee.slope ?? ''}
                onChange={(e) =>
                  setTee(ti, 'slope', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </div>
          </div>
          <label className="label">Yardages</label>
          <div className="grid grid-cols-6 gap-1.5">
            {tee.yards.map((y, i) => (
              <div key={i} className="text-center">
                <span className="block text-[10px] text-sand-200/40">{i + 1}</span>
                <input
                  className="w-full rounded bg-turf-900 py-1.5 text-center font-mono text-sm text-sand-50"
                  type="number" placeholder="—" value={y ?? ''}
                  onChange={(e) =>
                    setYards(ti, i, e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-sm text-sand-200/60">
            Total {tee.yards.reduce<number>((a, b) => a + (b ?? 0), 0) || '—'}
          </p>
        </div>
      ))}
    </Screen>
  );
}
