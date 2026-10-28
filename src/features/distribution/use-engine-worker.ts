'use client';

import { useEffect, useState } from 'react';
import { createDistributionWorker } from './create-worker';
import { EngineClient } from './engine-client';

/**
 * One EngineClient per component. Stale results are dropped by request id;
 * the worker is terminated on unmount (and re-created lazily if the component
 * runs again, as React does twice in development).
 */
export function useEngineWorker(): EngineClient {
  const [client] = useState(() => new EngineClient(createDistributionWorker));
  useEffect(
    () => () => {
      client.terminate();
    },
    [client],
  );
  return client;
}
