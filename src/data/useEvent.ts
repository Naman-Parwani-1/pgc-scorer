import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { cloneFormat } from '../engine/formats';
import { computeHandicaps, scoreCard } from '../engine/scoring';
import type { Card, PlayerHandicap } from '../engine/types';

/**
 * Loads everything one event needs and runs it through the engine.
 * The UI reads these results; it never computes a score itself.
 */
export function useEvent(eventId: string | undefined) {
  return useLiveQuery(async () => {
    if (!eventId) return null;

    const event = await db.events.get(eventId);
    if (!event) return null;

    const course = await db.courses.get(event.courseId);
    if (!course) return null;

    const players = await db.players.bulkGet(event.playerIds);
    const roster = players.filter((p): p is NonNullable<typeof p> => !!p);

    const groups = await db.groups.where('eventId').equals(eventId).toArray();
    const cardRows = await db.cards.where('eventId').equals(eventId).toArray();

    const format = cloneFormat(event.formatId, event.formatOverrides);

    let handicaps: PlayerHandicap[] = [];
    let error: string | null = null;
    try {
      handicaps = computeHandicaps(roster, course, format);
    } catch (e) {
      handicaps = [];
      error = e instanceof Error ? e.message : String(e);
    }

    const results = handicaps.length
      ? cardRows.map((c) => {
          const hcp = handicaps.find((h) => h.playerId === c.playerId)!;
          return scoreCard(c as Card, hcp, course, format);
        })
      : [];

    return { event, course, roster, groups, cards: cardRows, format, handicaps, results, error };
  }, [eventId]);
}
