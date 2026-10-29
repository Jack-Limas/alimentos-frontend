import { describe, expect, it } from 'vitest';
import { securityHeaders } from '../next.config';

const header = (name: string) => securityHeaders.find((h) => h.key === name)?.value;

describe('security headers', () => {
  it('keep cross-origin isolation (SharedArrayBuffer needs COOP + COEP)', () => {
    expect(header('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(header('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });

  it('turn off camera, microphone and geolocation', () => {
    expect(header('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('forbid framing in old and new browsers', () => {
    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('Content-Security-Policy')).toBe("frame-ancestors 'none'");
  });

  it('do not restrict scripts with a CSP (no nonces: pages stay static)', () => {
    expect(header('Content-Security-Policy')).not.toMatch(/script-src|default-src|nonce/);
  });

  it('are sent once each', () => {
    const keys = securityHeaders.map((h) => h.key.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });
});
