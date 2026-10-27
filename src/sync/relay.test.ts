import { describe, expect, it } from 'vitest';
import { generateCode, loadRelayConfig, publish, fetchLatest } from './relay';

describe('sync codes', () => {
  it('are 6 characters from an unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      // No characters that are easy to misread aloud on a tee box.
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it('are not trivially repeated', () => {
    const codes = new Set(Array.from({ length: 300 }, () => generateCode()));
    expect(codes.size).toBeGreaterThan(290);
  });
});

describe('sync is strictly optional', () => {
  it('reports disabled rather than throwing when unconfigured', async () => {
    const cfg = { url: '', enabled: false };
    await expect(publish(cfg, {} as never)).resolves.toMatchObject({ ok: false });
    await expect(fetchLatest(cfg, 'ABC123')).resolves.toMatchObject({ ok: false });
  });

  it('falls back to disabled when storage is unavailable', () => {
    expect(loadRelayConfig()).toEqual({ url: '', enabled: false });
  });
});
