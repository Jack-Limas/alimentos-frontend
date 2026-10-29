/** A piece of AI text: plain text, or an order code the UI turns into a link. */
export type AiTextSegment = { type: 'text'; value: string } | { type: 'order'; code: string };

const ORDER_CODE = /PED-\d{6}/g;
// The AI answers plain text; if a stray Markdown mark slips through it is removed, never rendered.
const MARKDOWN_MARKS = /(\*\*|__|`|^#+\s*|^\s*[-*•]\s+)/gm;

/**
 * Splits AI text into text and order codes. The text is never interpreted as
 * HTML or Markdown: formatting is done by the UI.
 */
export function segmentAiText(text: string): AiTextSegment[] {
  const clean = text.replace(MARKDOWN_MARKS, '').replace(/\s+/g, ' ').trim();
  const segments: AiTextSegment[] = [];
  let last = 0;
  for (const match of clean.matchAll(ORDER_CODE)) {
    const index = match.index;
    if (index > last) segments.push({ type: 'text', value: clean.slice(last, index) });
    segments.push({ type: 'order', code: match[0] });
    last = index + match[0].length;
  }
  if (last < clean.length) segments.push({ type: 'text', value: clean.slice(last) });
  return segments;
}

/** The tie-break list can be long: the first five, the rest on demand. */
export const TIE_BREAK_PREVIEW = 5;

export function visibleTieBreak(codes: readonly string[], showAll: boolean): string[] {
  return showAll ? [...codes] : codes.slice(0, TIE_BREAK_PREVIEW);
}
