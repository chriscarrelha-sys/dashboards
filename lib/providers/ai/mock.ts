import type { AITask } from './registry';

/**
 * Deterministic mock AI. Produces clearly-labeled placeholder output so the
 * product's AI surfaces are fully navigable without any real provider or key.
 * Never presents itself as legal advice or verified fact.
 */
export type MockAIResult = {
  provider: 'mock';
  task: AITask;
  content: string;
  confidence: number;
};

export function runMockAI(task: AITask, prompt: string, context?: string): MockAIResult {
  const preview = prompt.trim().slice(0, 160);
  const lines: string[] = [
    `**[Mock AI response — no live model configured]**`,
    '',
    `_Task:_ ${task}`,
    `_Your prompt:_ ${preview}${prompt.length > 160 ? '…' : ''}`,
  ];
  if (context) lines.push('', `_Context provided:_ ${context.slice(0, 200)}`);
  lines.push(
    '',
    'This is a placeholder. Configure a provider API key in the Integrations hub to',
    'get real analysis. Nothing here is legal advice, and any suggestion must be',
    'reviewed in the Verification Queue before it becomes part of your case record.',
  );
  return { provider: 'mock', task, content: lines.join('\n'), confidence: 0.4 };
}
