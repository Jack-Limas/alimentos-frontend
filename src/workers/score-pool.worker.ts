// One worker of the SharedArrayBuffer scoring pool (see features/distribution/parallel.ts).
// Created by create-pool-worker.ts with `new Worker(new URL(...), { type: 'module' })`.
import {
  createPoolHandler,
  type PoolRequest,
  type PoolResponse,
} from '@/features/distribution/pool-protocol';

const scope = self as unknown as {
  postMessage(message: PoolResponse): void;
  onmessage: ((event: MessageEvent<PoolRequest>) => void) | null;
};

const handle = createPoolHandler((message) => {
  scope.postMessage(message);
});

scope.onmessage = (event) => {
  handle(event.data);
};
