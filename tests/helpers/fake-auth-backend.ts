import { vi } from 'vitest';
import type { AuthUser } from '@/features/auth/types';

export const API_ORIGIN = 'https://api.example.com';

export const DEMO_USER: AuthUser = {
  id: '9b2f4c1e-0000-4000-8000-000000000001',
  email: 'operador@example.com',
  name: 'Operador Demo',
  role: 'OPERATOR',
};
export const DEMO_PASSWORD = 'correct-password';

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function unauthorized(code: string): Response {
  return json(401, { error: { code, message: code } });
}

/** Lets other pending work run, like a real network round trip would. */
const roundTrip = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * In-memory stand-in for the backend auth endpoints, installed as global fetch.
 * It models the shared browser cookie jar and the refresh rotation with reuse
 * detection: a refresh sent with an already rotated cookie revokes the family.
 */
export function createFakeAuthBackend() {
  const state = {
    /** The refresh cookie the browser holds (shared by every tab). */
    cookie: 'refresh-0' as string | null,
    /** The only refresh token the server still accepts. */
    validRefresh: 'refresh-0' as string | null,
    validAccess: new Set<string>(),
    issued: 0,
    reuseDetected: false,
    failRefreshWithNetworkError: false,
    /** Rejects every access token, even fresh ones (e.g. the user was deactivated). */
    rejectAllAccessTokens: false,
  };
  const calls: { method: string; path: string; authorization: string | null }[] = [];

  function issueAccessToken(): string {
    state.issued += 1;
    const token = `access-${state.issued}`;
    state.validAccess.add(token);
    return token;
  }

  function rotateRefresh(): void {
    const next = `refresh-${state.issued}`;
    state.validRefresh = next;
    state.cookie = next;
  }

  async function handle(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? 'GET';
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const authorization = new Headers(init?.headers).get('Authorization');
    const bearer = authorization?.replace(/^Bearer /, '') ?? null;
    calls.push({ method, path, authorization });

    if (method === 'POST' && path === '/auth/refresh') {
      if (state.failRefreshWithNetworkError) throw new TypeError('Failed to fetch');
      const sent = state.cookie; // the browser attaches the cookie when the request starts
      await roundTrip();
      if (sent === null || sent !== state.validRefresh) {
        if (sent !== null && state.validRefresh !== null) {
          // A rotated token came back: revoke the whole family.
          state.reuseDetected = true;
          state.validRefresh = null;
        }
        return unauthorized('UNAUTHENTICATED');
      }
      const accessToken = issueAccessToken();
      rotateRefresh();
      return json(200, { accessToken });
    }

    await roundTrip();

    if (method === 'POST' && path === '/auth/login') {
      const body = JSON.parse(String(init?.body)) as { email: string; password: string };
      if (body.email !== DEMO_USER.email || body.password !== DEMO_PASSWORD) {
        return json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid' } });
      }
      const accessToken = issueAccessToken();
      rotateRefresh();
      return json(200, { accessToken, user: DEMO_USER });
    }

    if (method === 'POST' && path === '/auth/logout') {
      state.validRefresh = null;
      state.cookie = null;
      return new Response(null, { status: 204 });
    }

    if (bearer === null || state.rejectAllAccessTokens || !state.validAccess.has(bearer)) {
      return unauthorized(bearer === null ? 'UNAUTHENTICATED' : 'TOKEN_EXPIRED');
    }
    if (method === 'GET' && path === '/auth/me') return json(200, { data: DEMO_USER });
    if (method === 'GET' && path === '/forbidden') {
      return json(403, { error: { code: 'FORBIDDEN', message: 'No' } });
    }
    return json(200, { path, token: bearer });
  }

  const fetchMock = vi.fn<typeof fetch>(handle);

  return {
    state,
    calls,
    fetchMock,
    /** Number of requests sent to an endpoint. */
    count(path: string): number {
      return calls.filter((call) => call.path === path).length;
    },
    /** Expires every access token issued so far, as if 15 minutes passed. */
    expireAccessTokens(): void {
      state.validAccess.clear();
    },
  };
}

export type FakeAuthBackend = ReturnType<typeof createFakeAuthBackend>;
