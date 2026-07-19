/**
 * Deadline rule engine — EXTENSIBLE INTERFACE + SAFE MOCK RULES.
 *
 * ⚠️  The rules here are DEMONSTRATION EXAMPLES ONLY. They are not authoritative
 * legal deadline calculations. Every date this engine produces is returned with
 * `verificationStatus: 'unverified'` and MUST be confirmed by the user before it
 * is treated as real. Real jurisdiction rules plug in by registering a Rule.
 */

import { addBusinessDays, addDays } from 'date-fns';

export type CountMethod = 'calendar' | 'business';

export type DeadlineRuleInput = {
  triggerDate: Date;
  /** e.g. service method may add days in some rules. */
  serviceMethod?: 'personal' | 'mail' | 'electronic';
};

export type DeadlineComputation = {
  dueDate: Date;
  method: CountMethod;
  days: number;
  governingRule: string;
  explanation: string;
  /** Always false for mock rules — nothing here is authoritative. */
  authoritative: boolean;
};

export type DeadlineRule = {
  key: string;
  label: string;
  /** Jurisdiction/forum this applies to, for display only. */
  appliesTo: string;
  compute: (input: DeadlineRuleInput) => DeadlineComputation;
};

function computeDue(triggerDate: Date, days: number, method: CountMethod): Date {
  return method === 'business'
    ? addBusinessDays(triggerDate, days)
    : addDays(triggerDate, days);
}

/**
 * Registry of example rules. Clearly labeled as examples in `governingRule`.
 * Add real, verified rules here per jurisdiction as they are researched.
 */
export const MOCK_RULES: DeadlineRule[] = [
  {
    key: 'example-answer-30',
    label: 'Example: Answer due (30 calendar days)',
    appliesTo: 'Generic civil (EXAMPLE ONLY)',
    compute: ({ triggerDate }) => ({
      dueDate: computeDue(triggerDate, 30, 'calendar'),
      method: 'calendar',
      days: 30,
      governingRule: 'EXAMPLE RULE — not legal authority. Verify against your court rules.',
      explanation: '30 calendar days from the triggering event (service).',
      authoritative: false,
    }),
  },
  {
    key: 'example-discovery-response-30',
    label: 'Example: Discovery response (30 days)',
    appliesTo: 'Generic civil (EXAMPLE ONLY)',
    compute: ({ triggerDate }) => ({
      dueDate: computeDue(triggerDate, 30, 'calendar'),
      method: 'calendar',
      days: 30,
      governingRule: 'EXAMPLE RULE — not legal authority. Verify against your court rules.',
      explanation: '30 calendar days from service of the discovery request.',
      authoritative: false,
    }),
  },
  {
    key: 'example-motion-response-14b',
    label: 'Example: Response to motion (14 business days)',
    appliesTo: 'Generic civil (EXAMPLE ONLY)',
    compute: ({ triggerDate }) => ({
      dueDate: computeDue(triggerDate, 14, 'business'),
      method: 'business',
      days: 14,
      governingRule: 'EXAMPLE RULE — not legal authority. Verify against your court rules.',
      explanation: '14 business days from the triggering event.',
      authoritative: false,
    }),
  },
];

export function getRule(key: string): DeadlineRule | undefined {
  return MOCK_RULES.find((r) => r.key === key);
}

/** Ad-hoc calculation used by the manual deadline calculator UI. */
export function computeAdHoc(
  triggerDate: Date,
  days: number,
  method: CountMethod,
): DeadlineComputation {
  return {
    dueDate: computeDue(triggerDate, days, method),
    method,
    days,
    governingRule: 'User-defined calculation (not verified against court rules).',
    explanation: `${days} ${method} day(s) from ${triggerDate.toISOString().slice(0, 10)}.`,
    authoritative: false,
  };
}
