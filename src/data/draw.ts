import type { Player } from '../engine/types';

/**
 * Auto-draw into fourballs.
 *
 *  - random: shuffle, then chunk
 *  - snake:  seed by handicap and snake the order so groups are balanced
 *  - manual: caller supplies the arrangement
 */
export type DrawMode = 'random' | 'snake' | 'manual';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function drawGroups(
  players: Player[],
  mode: DrawMode,
  groupSize = 4,
): Player[][] {
  if (mode === 'random') return chunk(shuffle(players), groupSize);

  if (mode === 'snake') {
    const seeded = [...players].sort((a, b) => a.handicapIndex - b.handicapIndex);
    const groupCount = Math.ceil(seeded.length / groupSize);
    const groups: Player[][] = Array.from({ length: groupCount }, () => []);

    seeded.forEach((p, i) => {
      const round = Math.floor(i / groupCount);
      const pos = i % groupCount;
      // Reverse direction on alternate passes so the strongest and weakest
      // are spread evenly.
      const target = round % 2 === 0 ? pos : groupCount - 1 - pos;
      groups[target].push(p);
    });

    return groups;
  }

  return chunk(players, groupSize);
}

/** Snake-seed players into N balanced teams. */
export function drawTeams(players: Player[], teamCount: number): Player[][] {
  const seeded = [...players].sort((a, b) => a.handicapIndex - b.handicapIndex);
  const teams: Player[][] = Array.from({ length: teamCount }, () => []);
  seeded.forEach((p, i) => {
    const round = Math.floor(i / teamCount);
    const pos = i % teamCount;
    const target = round % 2 === 0 ? pos : teamCount - 1 - pos;
    teams[target].push(p);
  });
  return teams;
}

/** Tee-time sheet at a fixed interval from a start time such as "07:30". */
export function teeTimes(start: string, intervalMinutes: number, groupCount: number): string[] {
  const [h, m] = start.split(':').map(Number);
  const base = h * 60 + m;
  return Array.from({ length: groupCount }, (_, i) => {
    const t = base + i * intervalMinutes;
    const hh = String(Math.floor(t / 60) % 24).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  });
}

/** Shotgun start: assign each group a starting hole. */
export function shotgunHoles(groupCount: number): number[] {
  return Array.from({ length: groupCount }, (_, i) => (i % 18) + 1);
}
