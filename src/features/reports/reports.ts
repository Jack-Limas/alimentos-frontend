import type { ApiRequestOptions } from '@/lib/api';

export const REPORT_KINDS = ['inventory', 'orders', 'waste'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export type ReportFormat = 'csv' | 'pdf';
export type ReportLocale = 'es' | 'en';

/** Inventory is a snapshot of today; orders and waste cover a date range (contract 4.10). */
export const REPORT_HAS_RANGE: Readonly<Record<ReportKind, boolean>> = {
  inventory: false,
  orders: true,
  waste: true,
};

/** The backend allows at most 366 days per report. */
export const MAX_RANGE_DAYS = 366;

export interface ReportRequest {
  kind: ReportKind;
  format: ReportFormat;
  locale: ReportLocale;
  /** YYYY-MM-DD business days, both included; ignored for inventory. */
  from?: string;
  to?: string;
}

export function reportPath({ kind, format, locale, from, to }: ReportRequest): string {
  const params = new URLSearchParams({ format, locale });
  if (REPORT_HAS_RANGE[kind]) {
    if (from) params.set('from', from);
    if (to) params.set('to', to);
  }
  return `/reports/${kind}?${params.toString()}`;
}

/** Days between two YYYY-MM-DD dates, both included; null when invalid or reversed. */
export function rangeDays(from: string, to: string): number | null {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}

/**
 * The file name in a Content-Disposition header: RFC 6266 `filename*`
 * (UTF-8, percent-encoded) wins over `filename` (quoted or not). Path
 * separators are removed. null when there is none.
 */
export function parseContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const extended = /filename\*\s*=\s*([^;]+)/i.exec(header)?.[1]?.trim();
  if (extended) {
    const value = extended.replace(/^"|"$/g, '');
    const encoded = /^[\w-]+'[^']*'(.*)$/.exec(value)?.[1] ?? value;
    try {
      return safeName(decodeURIComponent(encoded));
    } catch {
      // Malformed encoding: fall back to the plain filename.
    }
  }
  const quoted = /filename\s*=\s*"((?:[^"\\]|\\.)*)"/i.exec(header)?.[1];
  if (quoted !== undefined) return safeName(quoted.replace(/\\(.)/g, '$1'));
  const plain = /filename\s*=\s*([^;\s]+)/i.exec(header)?.[1];
  return plain ? safeName(plain) : null;
}

function safeName(name: string): string | null {
  const cleaned = name.replace(/[/\\]/g, '_').trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** When the header is missing or unreadable: same pattern as the backend's names. */
export function fallbackFileName({ kind, format }: ReportRequest, today: string): string {
  return `alimentaiq-${kind}-${today}.${format}`;
}

export interface ReportDownload {
  id: number;
  kind: ReportKind;
  format: ReportFormat;
  locale: ReportLocale;
  fileName: string;
  bytes: number;
  /** X-Generation-Time-Ms: read + format on the server. */
  serverMs: number | null;
  /** Request to blob, measured in the browser. */
  totalMs: number;
  at: number;
}

export interface DownloadDeps {
  authRequest: (path: string, options?: ApiRequestOptions) => Promise<Response>;
  save: (blob: Blob, fileName: string) => void;
  now?: () => number;
  today: string;
}

/**
 * Downloads a report with the session (authRequest refreshes on 401), then
 * saves the blob with the server's file name. Errors are ApiError, as for any
 * other request.
 */
export async function downloadReport(
  request: ReportRequest,
  { authRequest, save, now = () => performance.now(), today }: DownloadDeps,
): Promise<Omit<ReportDownload, 'id' | 'at'>> {
  const started = now();
  const response = await authRequest(reportPath(request), {
    headers: { Accept: request.format === 'pdf' ? 'application/pdf' : 'text/csv' },
  });
  const blob = await response.blob();
  const totalMs = Math.round(now() - started);
  const fileName =
    parseContentDisposition(response.headers.get('Content-Disposition')) ??
    fallbackFileName(request, today);
  const server = Number(response.headers.get('X-Generation-Time-Ms'));
  save(blob, fileName);
  return {
    kind: request.kind,
    format: request.format,
    locale: request.locale,
    fileName,
    bytes: blob.size,
    serverMs:
      response.headers.has('X-Generation-Time-Ms') && Number.isFinite(server) ? server : null,
    totalMs,
  };
}

/** Saves a blob through a temporary <a download>; the object URL is released afterwards. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
