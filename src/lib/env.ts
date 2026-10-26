export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

/**
 * Validates NEXT_PUBLIC_API_URL: an absolute http(s) origin with no trailing
 * slash and no path (the client appends /api/v1). The value is never echoed
 * in the error, only the rule that failed.
 */
export function parseApiOrigin(raw: string | undefined): string {
  const name = 'NEXT_PUBLIC_API_URL';
  const value = raw?.trim();
  if (!value) {
    throw new EnvError(`${name}: missing required variable`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EnvError(`${name}: must be an absolute URL`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new EnvError(`${name}: must use http or https`);
  }
  if (value.endsWith('/')) {
    throw new EnvError(`${name}: must not end with a slash`);
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new EnvError(`${name}: must be the origin only, without a path such as /api/v1`);
  }

  return url.origin;
}

export const env = {
  /**
   * Backend origin. The literal `process.env.NEXT_PUBLIC_API_URL` access lets
   * Next inline the value in the client bundle.
   */
  get apiUrl(): string {
    return parseApiOrigin(process.env.NEXT_PUBLIC_API_URL);
  },
};
