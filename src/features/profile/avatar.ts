/**
 * Profile photo kept in this browser only (localStorage), resized to a small
 * square JPEG. The backend has no user photo yet; uploading it there (e.g. to
 * Cloudinary) is a later phase. A photo is not a secret, so localStorage is fine
 * here, unlike tokens.
 */
export const AVATAR_SIZE = 160;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_EVENT = 'aiq:avatar';

export type AvatarFileError = 'type' | 'size';

/** Rejects anything that is not a JPEG, PNG or WebP image up to 5 MB. */
export function validateAvatarFile(file: { type: string; size: number }): AvatarFileError | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) return 'size';
  return null;
}

export function avatarKey(userId: string): string {
  return `aiq.avatar.${userId}`;
}

/** Only small data URLs of our own JPEG encoding are accepted back from storage. */
export function isStoredAvatar(value: string | null): value is string {
  return value !== null && value.startsWith('data:image/jpeg;base64,') && value.length < 200_000;
}

/** Centered square crop of a width × height image: the source rectangle to draw. */
export function squareCrop(
  width: number,
  height: number,
): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

export function readAvatar(
  storage: Pick<Storage, 'getItem'> | null,
  userId: string,
): string | null {
  try {
    const value = storage?.getItem(avatarKey(userId)) ?? null;
    return isStoredAvatar(value) ? value : null;
  } catch {
    return null;
  }
}
