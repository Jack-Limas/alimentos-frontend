/** Script URL of this build's service worker: the version scopes its caches. */
export function serviceWorkerUrl(version: string | undefined): string {
  return `/sw.js?v=${encodeURIComponent(version && version.length > 0 ? version : 'dev')}`;
}

/** The version a registered worker runs, read back from its script URL. */
export function versionOf(scriptUrl: string | undefined | null): string | null {
  if (!scriptUrl) return null;
  try {
    return new URL(scriptUrl, 'http://localhost').searchParams.get('v');
  } catch {
    return null;
  }
}

/** Only production builds register it: in development it would cache files that change. */
export function shouldRegister(
  nodeEnv: string | undefined,
  scope: { navigator?: unknown },
): boolean {
  return (
    nodeEnv === 'production' &&
    typeof scope.navigator === 'object' &&
    scope.navigator !== null &&
    'serviceWorker' in scope.navigator
  );
}

export interface RegistrationLike {
  waiting: { postMessage(message: unknown): void } | null;
  installing: {
    state: string;
    addEventListener(type: 'statechange', listener: () => void): void;
  } | null;
  addEventListener(type: 'updatefound', listener: () => void): void;
}

/**
 * Calls `onWaiting` when a new version is installed and waits behind the
 * current one (only when a page is already controlled: the very first install
 * is not an "update").
 */
export function watchForUpdates(
  registration: RegistrationLike,
  hasController: () => boolean,
  onWaiting: () => void,
): void {
  if (registration.waiting && hasController()) onWaiting();
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed' && hasController()) onWaiting();
    });
  });
}
