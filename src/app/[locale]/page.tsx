import { setRequestLocale } from 'next-intl/server';
import { ClosingCta, Hero, ProblemSection, SolutionSection } from '@/components/landing';
import type { Locale } from '@/i18n/routing';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

// Static (SSG) for every locale via generateStaticParams in the layout.
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  // The locale layout already rejected unknown locales with notFound().
  setRequestLocale(locale as Locale);

  return (
    <>
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <ClosingCta />
    </>
  );
}
