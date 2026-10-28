import { describe, expect, it } from 'vitest';
import {
  missionProgress,
  readCompleted,
  recordCompleted,
  sortMissions,
} from '@/features/missions/missions';
import { readAvatar, squareCrop, validateAvatarFile } from '@/features/profile/avatar';
import { createMemoryStorage } from './helpers/memory-storage';

describe('missions', () => {
  it('measures progress along the happy path', () => {
    expect(missionProgress('IN_PREPARATION')).toEqual({ step: 1, total: 4, percent: 25 });
    expect(missionProgress('READY_FOR_DISPATCH')).toEqual({ step: 2, total: 4, percent: 50 });
    expect(missionProgress('SHIPPED')).toEqual({ step: 3, total: 4, percent: 75 });
    expect(missionProgress('DELIVERED')).toEqual({ step: 4, total: 4, percent: 100 });
  });

  it('puts the most urgent mission first, then the highest priority', () => {
    const now = new Date('2026-10-28T17:00:00Z');
    const orders = [
      { number: 1, dueDate: '2026-11-03', priority: 'URGENT' as const },
      { number: 2, dueDate: '2026-10-28', priority: 'LOW' as const },
      { number: 3, dueDate: '2026-10-26', priority: 'MEDIUM' as const },
      { number: 4, dueDate: '2026-10-28', priority: 'HIGH' as const },
    ];
    expect(sortMissions(orders, now).map((o) => o.number)).toEqual([3, 4, 2, 1]);
  });

  it('counts completed missions per user and business day', () => {
    const storage = createMemoryStorage();
    expect(readCompleted(storage, 'u1', '2026-10-28')).toBe(0);
    expect(recordCompleted(storage, 'u1', '2026-10-28')).toBe(1);
    expect(recordCompleted(storage, 'u1', '2026-10-28')).toBe(2);
    expect(readCompleted(storage, 'u1', '2026-10-29')).toBe(0);
    expect(readCompleted(storage, 'u2', '2026-10-28')).toBe(0);
  });

  it('never breaks when storage is missing or throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readCompleted(null, 'u1', '2026-10-28')).toBe(0);
    expect(recordCompleted(broken, 'u1', '2026-10-28')).toBe(1);
  });
});

describe('profile photo', () => {
  it.each([
    [{ type: 'image/jpeg', size: 200_000 }, null],
    [{ type: 'image/png', size: 5 * 1024 * 1024 }, null],
    [{ type: 'image/gif', size: 1000 }, 'type'],
    [{ type: 'application/pdf', size: 1000 }, 'type'],
    [{ type: 'image/webp', size: 5 * 1024 * 1024 + 1 }, 'size'],
    [{ type: 'image/png', size: 0 }, 'size'],
  ])('validates %o as %s', (file, error) => {
    expect(validateAvatarFile(file)).toBe(error);
  });

  it('crops the centered square of any image', () => {
    expect(squareCrop(800, 600)).toEqual({ sx: 100, sy: 0, side: 600 });
    expect(squareCrop(300, 500)).toEqual({ sx: 0, sy: 100, side: 300 });
  });

  it('only reads back our own JPEG data URLs', () => {
    const storage = createMemoryStorage();
    storage.setItem('aiq.avatar.u1', 'data:image/jpeg;base64,AAAA');
    storage.setItem('aiq.avatar.u2', 'javascript:alert(1)');
    expect(readAvatar(storage, 'u1')).toBe('data:image/jpeg;base64,AAAA');
    expect(readAvatar(storage, 'u2')).toBeNull();
    expect(readAvatar(null, 'u1')).toBeNull();
  });
});
