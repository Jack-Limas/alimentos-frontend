import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next 16 renamed the `middleware` file convention to `proxy`; next-intl still
// exposes its handler as `createMiddleware`.
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals, Vercel internals and files with an extension.
  matcher: '/((?!api|_next|_vercel|.*\..*).*)',
};
