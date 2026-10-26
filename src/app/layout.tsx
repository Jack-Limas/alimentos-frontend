import type { ReactNode } from 'react';
import './globals.css';

// The real root markup (<html>, <body>) lives in app/[locale]/layout.tsx so the
// lang attribute matches the locale. This file only exists for app/not-found.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
