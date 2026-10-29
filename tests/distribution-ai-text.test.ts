import { describe, expect, it } from 'vitest';
import { segmentAiText, visibleTieBreak } from '@/features/distribution/ai-text';

describe('segmentAiText', () => {
  it('splits order codes out of the text so the UI can link them', () => {
    expect(segmentAiText('Atiende PED-000021 y luego PED-000033.')).toEqual([
      { type: 'text', value: 'Atiende ' },
      { type: 'order', code: 'PED-000021' },
      { type: 'text', value: ' y luego ' },
      { type: 'order', code: 'PED-000033' },
      { type: 'text', value: '.' },
    ]);
  });

  it('drops stray Markdown marks instead of showing them', () => {
    expect(segmentAiText('**Prioriza** la `leche`\n- hoy')).toEqual([
      { type: 'text', value: 'Prioriza la leche hoy' },
    ]);
  });

  it('keeps plain text as one segment and handles empty text', () => {
    expect(segmentAiText('Todo en orden.')).toEqual([{ type: 'text', value: 'Todo en orden.' }]);
    expect(segmentAiText('  ')).toEqual([]);
  });
});

describe('visibleTieBreak', () => {
  const codes = Array.from({ length: 24 }, (_, i) => `PED-${String(i + 1).padStart(6, '0')}`);

  it('shows the first five and everything on demand', () => {
    expect(visibleTieBreak(codes, false)).toEqual(codes.slice(0, 5));
    expect(visibleTieBreak(codes, true)).toHaveLength(24);
    expect(visibleTieBreak(codes.slice(0, 3), false)).toHaveLength(3);
  });
});
