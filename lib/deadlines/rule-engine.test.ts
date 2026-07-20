import { describe, it, expect } from 'vitest';
import { computeAdHoc, getRule, MOCK_RULES } from './rule-engine';

describe('computeAdHoc', () => {
  it('adds calendar days', () => {
    const r = computeAdHoc(new Date(Date.UTC(2026, 6, 18)), 21, 'calendar');
    expect(r.dueDate.toISOString().slice(0, 10)).toBe('2026-08-08');
    expect(r.method).toBe('calendar');
  });

  it('adds business days (skips weekends)', () => {
    // 2026-07-17 is a Friday; +1 business day → Monday 2026-07-20.
    const r = computeAdHoc(new Date(Date.UTC(2026, 6, 17)), 1, 'business');
    expect(r.dueDate.toISOString().slice(0, 10)).toBe('2026-07-20');
  });

  it('never reports itself as authoritative', () => {
    expect(computeAdHoc(new Date(), 5, 'calendar').authoritative).toBe(false);
  });
});

describe('mock rules', () => {
  it('are all clearly non-authoritative and labeled as examples', () => {
    for (const rule of MOCK_RULES) {
      const c = rule.compute({ triggerDate: new Date(Date.UTC(2026, 0, 1)) });
      expect(c.authoritative).toBe(false);
      expect(c.governingRule.toUpperCase()).toContain('EXAMPLE');
    }
  });

  it('resolves a known rule by key', () => {
    expect(getRule('example-answer-30')).toBeDefined();
    expect(getRule('does-not-exist')).toBeUndefined();
  });
});
