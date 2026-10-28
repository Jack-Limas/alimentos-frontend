'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  AVATAR_EVENT,
  AVATAR_SIZE,
  avatarKey,
  readAvatar,
  squareCrop,
  validateAvatarFile,
  type AvatarFileError,
} from './avatar';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  // `storage` fires in other tabs; AVATAR_EVENT in this one.
  window.addEventListener('storage', onChange);
  window.addEventListener(AVATAR_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(AVATAR_EVENT, onChange);
  };
}

/** Square JPEG data URL of AVATAR_SIZE px, center-cropped. */
async function resize(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

export type AvatarSaveError = AvatarFileError | 'unreadable' | 'storage';

/** The user's photo (or null) and functions to change or remove it. */
export function useAvatar(userId: string) {
  const photo = useSyncExternalStore(
    subscribe,
    () => readAvatar(storage(), userId),
    () => null,
  );

  const save = useCallback(
    async (file: File): Promise<AvatarSaveError | null> => {
      const invalid = validateAvatarFile(file);
      if (invalid) return invalid;
      let dataUrl: string;
      try {
        dataUrl = await resize(file);
      } catch {
        return 'unreadable';
      }
      try {
        storage()?.setItem(avatarKey(userId), dataUrl);
      } catch {
        return 'storage';
      }
      window.dispatchEvent(new Event(AVATAR_EVENT));
      return null;
    },
    [userId],
  );

  const remove = useCallback(() => {
    try {
      storage()?.removeItem(avatarKey(userId));
    } catch {
      // Nothing stored or storage blocked: nothing to remove.
    }
    window.dispatchEvent(new Event(AVATAR_EVENT));
  }, [userId]);

  return { photo, save, remove };
}
