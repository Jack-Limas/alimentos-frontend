# CLAUDE.md — alimentos-frontend

Conventions for anyone (human or AI assistant) working in this repository.

## Project

- Frontend of AlimentaIQ (Intelligent Food Distribution Center). It only talks to
  `alimentos-backend`; no code is shared with `alimentos-backend` or `alimentos-ai`.
- Stack: Next.js 16 (App Router, `src/proxy.ts`), React 19, strict TypeScript, Tailwind CSS v4,
  TanStack Query, next-intl, next-themes. Deployed on Vercel.

## Code

- Code, identifiers, comments and commit messages in **English**. User-facing docs (README) in
  Spanish.
- **Zero hardcoded UI text**: every string goes through next-intl (`messages/es.json` and
  `messages/en.json`, same keys in both, no empty values). Message keys are typed; tests check
  parity.
- **Light theme by default** (`defaultTheme: "light"`, `enableSystem: false`). Every component
  must also look right in dark mode (`dark:` variant).
- **Mobile-first**: base styles target phones; add `sm:`/`lg:` for larger screens.
- Use the design tokens from `src/app/globals.css` (`brand`, `expiry`, `critical`, `sand`,
  `forest` for the app shell, `berry` for waste risk, `lagoon` for adjustments and information,
  and the semantic `background`, `surface`, `foreground`, `muted`, `border`, `primary`). No ad hoc
  colors.
- Status is never shown by color alone: chips and bars always carry text. Motion respects
  `prefers-reduced-motion` (`motion-safe:`/`motion-reduce:` or `useReducedMotion`).
- Order buttons come from the mirror state machine (`features/orders/state-machine.ts`); keep it in
  sync with the backend table. The server has the last word: always handle its 409.
- Buttons use `buttonClass`/`Button` (3D keycap with an `--edge` color); do not hand-roll new button
  styles.
- Calendar dates from the API (`expiryDate`) are formatted with `timeZone: 'UTC'`; date-times use
  the business zone (`America/Bogota`). Server `reasons[]` and error codes are translated, never
  shown as sent.
- Data fetching goes through `src/lib/api` (`apiFetch`, `ApiError`) and TanStack Query. The
  client never sends computed figures (scores, recommended quantities, alerts): the server
  recomputes them.
- Pages stay statically rendered when possible (`setRequestLocale` + `generateStaticParams`).
- Browser-only values are read with `useClientValue` to avoid hydration mismatches.

## Distribution engine

- `src/features/distribution/engine/` is a **copy** of the backend engine (no shared code). Keep it
  pure and identical in behaviour; any change starts in the backend, then copy the code and the
  parity fixtures (`tests/fixtures/distribution-parity/`) and update the source commit in README.
- Heavy computation runs in the Web Worker through `EngineClient` / `useEngineWorker` (typed
  protocol with `requestId`; stale results are dropped). Keep the
  `new Worker(new URL('…', import.meta.url), { type: 'module' })` call literal so Turbopack bundles
  the worker.
- The client simulates; the server decides: proposals are always generated and confirmed by the
  API, and its 409 `STALE_PROPOSAL` is translated, never hidden.
- AI text is plain text formatted by the UI (`segmentAiText`); never render it as HTML or
  Markdown. AI failures (404, 503, network) must never break a page.
- Performance demos animate with `requestAnimationFrame` driven by JS, not CSS (CSS transform
  animations keep running on the compositor while the main thread is blocked).

## Shared workers, service worker and the pool

- Alerts are read with `useSharedAlerts()` (SharedWorker, or per-tab polling when it is missing);
  do not add another poll of `/alerts`. The SharedWorker never calls `/auth/refresh`: it asks a tab.
- The access token may be posted to the SharedWorker, never logged or echoed back.
- `public/sw.js` must never cache `/api`, other origins, `Authorization` requests or the login. Bump
  nothing by hand: the build version in the script URL scopes the caches.
- The page's main thread never calls `Atomics.wait`; use `waitForWorkers` (waitAsync or rAF).
- Keep `new SharedWorker(new URL(…), …)` and `new Worker(new URL(…), …)` literal so Turbopack bundles
  them.

## Metrics, reports and impact

- Web vitals are sent only with a session and with the route pattern (`normalizePage`); never a
  URL with IDs, query strings or typed text. Add every new page to `ROUTE_PATTERNS` (a test
  checks it against `src/app/[locale]`).
- File downloads go through `authRequest` (raw `Response` with the session), never a hand-made
  Bearer header. The file name comes from `Content-Disposition` (`parseContentDisposition`).
- `/[locale]/impact` is ISR (`export const revalidate = 3600`, a literal). `fetchImpact` never
  throws: a backend that is down must not break `next build`.
- Charts are hand-made SVG with values as text; no chart libraries.

## Authentication

- Private API calls go through `authFetch` (`useAuth()`), never a hand-made Bearer header: it
  handles the single-flight refresh, the cross-tab lock and the one retry.
- The access token lives in memory with a copy in `sessionStorage` (`aiq.session`). Never put
  tokens in `localStorage`, JS cookies, URLs or logs. The refresh token is an HttpOnly cookie the
  frontend never reads.
- Do not call `/auth/refresh` directly: concurrent refreshes trigger the backend's reuse
  detection and log every tab out.
- `RequireAuth` and `RequireRole` are UX only; the API enforces access. There is no authenticated
  SSR (the Next server never receives the API cookie), so private pages are client-rendered.
- Login redirects only to a `?next=` validated by `getSafeNextPath`.

## Cross-origin isolation

- COOP `same-origin` and COEP `require-corp` are always on (needed for SharedArrayBuffer). Never
  remove them to "fix" something: find the incompatible resource instead.
- Fonts via `next/font` only. External images (Cloudinary) must use `crossOrigin="anonymous"`.

## Dependencies

- Exact versions only (no `^` or `~`); `.npmrc` enforces `save-exact` and `engine-strict`. Use
  npm and commit `package-lock.json`.
- Do not add dependencies outside the current phase's plan.

## Secrets

- Never commit secrets: `.env*` (except `.env.example`), `cookies.txt`, `*.pem` are ignored.
  Only `NEXT_PUBLIC_*` variables reach the browser; never put secrets in them.

## Commits

- Many small commits: one per logical piece (a file or a very small group of related files).
- Conventional Commits: `feat`, `fix`, `chore`, `test`, `docs`, `ci`, `refactor`, with an optional
  scope, e.g. `feat(landing): add hero section`.
- Messages in English, imperative mood, specific.
- Every commit must leave the repo coherent: lint, typecheck, tests and build pass.
- Authorship is Jack-Limas only: no `Co-Authored-By` or tool attribution lines.

## Checks before committing

```bash
npm run lint && npm run typecheck && npm test && npm run build
```
