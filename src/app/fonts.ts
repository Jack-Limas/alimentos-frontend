import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';

// next/font downloads the fonts at build time and serves them from this origin,
// so they load under COEP require-corp without extra headers.
export const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const headingFont = Fraunces({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});
