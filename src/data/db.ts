import Dexie, { type Table } from 'dexie';
import type { Card, Course, FormatConfig, Player } from '../engine/types';
import { PANCHKULA } from './seed';

export interface Group {
  id: string;
  eventId: string;
  name: string;
  playerIds: string[];
  /** Designated scorer for this group. */
  scorerId: string | null;
  teeTime: string | null;
  /** Shotgun start hole, 1-18, or null for a sequential start. */
  startHole: number | null;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  playerIds: string[];
}

export interface SideGameState {
  /** Nearest the pin, keyed by hole number. */
  ntp: Record<number, string>;
  longestDriveHole: number | null;
  longestDrive: string | null;
  skinsStake: number;
  skinsNet: boolean;
  skinsCarryover: boolean;
}

export interface GolfEvent {
  id: string;
  name: string;
  date: string;
  courseId: string;
  formatId: string;
  /** Overrides applied on top of the registry format. */
  formatOverrides: Partial<FormatConfig>;
  playerIds: string[];
  startInterval: number;
  shotgun: boolean;
  sideGames: SideGameState;
  createdAt: number;
}

export interface AuditEntry {
  id?: number;
  eventId: string;
  playerId: string;
  hole: number;
  from: number | null;
  to: number | null;
  at: number;
  note: string;
}

export interface RoundHistory {
  id?: number;
  /** Stable `${eventId}:${playerId}` so re-signing replaces instead of duplicating. */
  key: string;
  playerId: string;
  date: string;
  courseId: string;
  tee: string;
  adjustedGross: number;
  cr: number;
  slope: number;
  differential: number;
}

class PgcDatabase extends Dexie {
  courses!: Table<Course, string>;
  players!: Table<Player, string>;
  events!: Table<GolfEvent, string>;
  groups!: Table<Group, string>;
  teams!: Table<Team, string>;
  cards!: Table<Card & { id: string; eventId: string }, string>;
  audit!: Table<AuditEntry, number>;
  history!: Table<RoundHistory, number>;

  constructor() {
    super('pgc-scorer');
    this.version(1).stores({
      courses: 'id, name',
      players: 'id, name',
      events: 'id, date, courseId',
      groups: 'id, eventId',
      teams: 'id, eventId',
      cards: 'id, eventId, playerId',
      audit: '++id, eventId, playerId',
      history: '++id, &key, playerId, date',
    });
  }
}

export const db = new PgcDatabase();

/** Seed Panchkula on first run. Safe to call repeatedly. */
export async function ensureSeed(): Promise<void> {
  const existing = await db.courses.get(PANCHKULA.id);
  if (!existing) await db.courses.put(PANCHKULA);
}

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

/** Blank 18-hole card. */
export function blankCard(playerId: string, tee: string, eventId: string) {
  return {
    id: `${eventId}:${playerId}`,
    eventId,
    playerId,
    tee,
    signed: false,
    scores: Array.from({ length: 18 }, (_, i) => ({
      hole: i + 1,
      gross: null as number | null,
      pickedUp: false,
    })),
  };
}
