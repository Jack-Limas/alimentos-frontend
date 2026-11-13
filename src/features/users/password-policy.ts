/** Same rule as the backend (passwordSchema): 10 to 72 characters with letters and numbers. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 72;

export type PasswordErrorKey = 'required' | 'tooShort' | 'tooLong' | 'needsLetter' | 'needsNumber';

/** First rule the password breaks, or null when the server will accept it. */
export function checkPassword(value: string): PasswordErrorKey | null {
  if (value.length === 0) return 'required';
  if (value.length < PASSWORD_MIN_LENGTH) return 'tooShort';
  if (value.length > PASSWORD_MAX_LENGTH) return 'tooLong';
  if (!/\p{L}/u.test(value)) return 'needsLetter';
  if (!/\p{Nd}/u.test(value)) return 'needsNumber';
  return null;
}

// No look-alikes (0/O, 1/l/I, 5/S, 2/Z, 8/B): the password is read aloud or copied by hand.
const UPPER = 'ACDEFGHJKMNPQRTUVWXY';
const LOWER = 'abcdefghijkmnpqrtuvwxy';
const DIGITS = '34679';

type RandomFill = (array: Uint32Array) => Uint32Array;

const cryptoFill: RandomFill = (array) => crypto.getRandomValues(array);

/** Uniform index below `max` from 32 random bits (rejection sampling: no modulo bias). */
function pick(alphabet: string, next: () => number): string {
  const limit = Math.floor(0x1_0000_0000 / alphabet.length) * alphabet.length;
  let value = next();
  while (value >= limit) value = next();
  return alphabet[value % alphabet.length] ?? '';
}

/**
 * A readable temporary password such as "Kmrt-4796-Pxqa": three groups of four
 * (upper + lower letters, four digits, letters) joined by dashes. 14 characters,
 * always letters and numbers, so it passes the server policy. Uses the Web
 * Crypto API, never Math.random.
 */
export function generateTemporaryPassword(fill: RandomFill = cryptoFill): string {
  const buffer = new Uint32Array(16);
  let index = buffer.length;
  const next = () => {
    if (index >= buffer.length) {
      fill(buffer);
      index = 0;
    }
    return buffer[index++] ?? 0;
  };
  const word = () =>
    pick(UPPER, next) + Array.from({ length: 3 }, () => pick(LOWER, next)).join('');
  const digits = Array.from({ length: 4 }, () => pick(DIGITS, next)).join('');
  return `${word()}-${digits}-${word()}`;
}
