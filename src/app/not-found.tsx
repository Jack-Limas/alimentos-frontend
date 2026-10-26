'use client';

import NextError from 'next/error';

// Fallback for requests outside the locale segment (the proxy normally adds the
// locale, so this is rarely reached). Translated 404s live in app/[locale].
export default function GlobalNotFound() {
  return (
    <html lang="es">
      <body>
        <NextError statusCode={404} />
      </body>
    </html>
  );
}
