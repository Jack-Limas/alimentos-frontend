// Distribution engine Web Worker. Bundled by Turbopack as its own entry point because it is
// created with `new Worker(new URL('…', import.meta.url), { type: 'module' })` (see
// create-worker.ts). Same origin, so it loads fine under COEP require-corp.
import {
  createEngineHandler,
  type EngineRequest,
  type EngineResponse,
} from '@/features/distribution/worker-protocol';

// The project's TypeScript lib is "dom"; only these two members of the worker scope are used.
const scope = self as unknown as {
  postMessage(message: EngineResponse): void;
  onmessage: ((event: MessageEvent<EngineRequest>) => void) | null;
};

const handle = createEngineHandler((message) => {
  scope.postMessage(message);
});

scope.onmessage = (event) => {
  handle(event.data);
};
