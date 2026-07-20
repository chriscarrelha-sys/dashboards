/**
 * AI provider registry + router.
 *
 * Providers are described declaratively with the tasks they are preferred for.
 * A provider is "available" only when its API key is present in the server
 * environment; otherwise the mock provider answers so the product works without
 * pretending an integration is live. API keys are read server-side only and are
 * never sent to the client.
 */

export type AITask =
  | 'strategy'
  | 'drafting'
  | 'synthesis'
  | 'review'
  | 'comparison'
  | 'extraction'
  | 'research'
  | 'secondary-review'
  | 'pdf';

export type AIProviderKey = 'openai' | 'claude' | 'perplexity' | 'gemini' | 'adobe' | 'mock';

export type AIProviderDef = {
  key: AIProviderKey;
  name: string;
  envVar?: string;
  preferredFor: AITask[];
  note: string;
};

export const AI_PROVIDERS: AIProviderDef[] = [
  {
    key: 'openai',
    name: 'OpenAI (ChatGPT)',
    envVar: 'OPENAI_API_KEY',
    preferredFor: ['strategy', 'drafting', 'synthesis'],
    note: 'Strategy, drafting, synthesis, and workflow planning.',
  },
  {
    key: 'claude',
    name: 'Claude (Anthropic)',
    envVar: 'ANTHROPIC_API_KEY',
    preferredFor: ['review', 'comparison', 'extraction'],
    note: 'Long-document review, comparison, and structured extraction.',
  },
  {
    key: 'perplexity',
    name: 'Perplexity',
    envVar: 'PERPLEXITY_API_KEY',
    preferredFor: ['research'],
    note: 'Current legal research and source discovery.',
  },
  {
    key: 'gemini',
    name: 'Gemini (Google)',
    envVar: 'GEMINI_API_KEY',
    preferredFor: ['secondary-review'],
    note: 'Secondary review and Google-connected workflows.',
  },
  {
    key: 'adobe',
    name: 'Adobe Acrobat',
    preferredFor: ['pdf'],
    note: 'PDF editing, OCR, combining, redaction, bookmarks, exhibit production.',
  },
  {
    key: 'mock',
    name: 'Built-in Mock',
    preferredFor: [],
    note: 'Deterministic placeholder used when no real provider is configured.',
  },
];

export function isProviderAvailable(def: AIProviderDef): boolean {
  if (def.key === 'mock') return true;
  if (!def.envVar) return false; // e.g. Adobe — no direct key wired yet
  return Boolean(process.env[def.envVar] && process.env[def.envVar]!.length > 0);
}

/**
 * Choose a provider for a task. Never auto-fans-out to every provider. Returns
 * the preferred available provider, else falls back to mock. The caller (and
 * the UI) can always override the choice.
 */
export function routeProvider(task: AITask, override?: AIProviderKey): {
  provider: AIProviderDef;
  usedFallback: boolean;
} {
  if (override) {
    const chosen = AI_PROVIDERS.find((p) => p.key === override);
    if (chosen) return { provider: chosen, usedFallback: !isProviderAvailable(chosen) && chosen.key !== 'mock' };
  }
  const preferred = AI_PROVIDERS.find(
    (p) => p.preferredFor.includes(task) && isProviderAvailable(p),
  );
  if (preferred) return { provider: preferred, usedFallback: false };
  const mock = AI_PROVIDERS.find((p) => p.key === 'mock')!;
  return { provider: mock, usedFallback: true };
}

/** Public (client-safe) snapshot of provider availability. No secrets. */
export function providerStatuses() {
  return AI_PROVIDERS.filter((p) => p.key !== 'mock').map((p) => ({
    key: p.key,
    name: p.name,
    note: p.note,
    preferredFor: p.preferredFor,
    available: isProviderAvailable(p),
  }));
}
