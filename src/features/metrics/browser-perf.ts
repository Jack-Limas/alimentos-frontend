/** Load timings of this page (Navigation Timing Level 2), in ms from the start of the navigation. */
export interface LoadTiming {
  ttfb: number;
  domContentLoaded: number;
  load: number | null;
}

type NavigationEntry = Pick<
  PerformanceNavigationTiming,
  'startTime' | 'responseStart' | 'domContentLoadedEventEnd' | 'loadEventEnd'
>;

export function loadTimingOf(entry: NavigationEntry | undefined): LoadTiming | null {
  if (!entry || entry.responseStart <= 0) return null;
  const since = (time: number) => Math.round(time - entry.startTime);
  return {
    ttfb: since(entry.responseStart),
    domContentLoaded: since(entry.domContentLoadedEventEnd),
    // 0 while the load event has not finished yet.
    load: entry.loadEventEnd > 0 ? since(entry.loadEventEnd) : null,
  };
}

export function readLoadTiming(): LoadTiming | null {
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return loadTimingOf(entry);
}

/** Which API measured the memory: they do not measure the same thing. */
export type MemorySource = 'uasm' | 'legacy' | 'none';

export interface MemoryReading {
  source: MemorySource;
  /** Bytes; null when no API exists. */
  bytes: number | null;
}

interface MemoryApis {
  crossOriginIsolated: boolean;
  measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
  legacyMemory?: { usedJSHeapSize: number };
}

/** The best API available, in order; tests give fakes. */
export function memorySourceOf(apis: MemoryApis): MemorySource {
  if (apis.crossOriginIsolated && apis.measureUserAgentSpecificMemory) return 'uasm';
  if (apis.legacyMemory) return 'legacy';
  return 'none';
}

/**
 * performance.measureUserAgentSpecificMemory() only exists on cross-origin
 * isolated pages (COOP + COEP) and may take seconds: the browser answers after
 * a garbage collection. Otherwise Chrome's non-standard performance.memory,
 * otherwise nothing.
 */
export async function measureMemory(
  apis: MemoryApis = browserMemoryApis(),
): Promise<MemoryReading> {
  const source = memorySourceOf(apis);
  if (source === 'uasm' && apis.measureUserAgentSpecificMemory) {
    const { bytes } = await apis.measureUserAgentSpecificMemory();
    return { source, bytes };
  }
  if (source === 'legacy' && apis.legacyMemory) {
    return { source, bytes: apis.legacyMemory.usedJSHeapSize };
  }
  return { source: 'none', bytes: null };
}

function browserMemoryApis(): MemoryApis {
  const perf = performance as Performance & {
    measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
    memory?: { usedJSHeapSize: number };
  };
  const measure = perf.measureUserAgentSpecificMemory?.bind(perf);
  return {
    crossOriginIsolated: globalThis.crossOriginIsolated,
    ...(measure ? { measureUserAgentSpecificMemory: measure } : {}),
    ...(perf.memory ? { legacyMemory: perf.memory } : {}),
  };
}
