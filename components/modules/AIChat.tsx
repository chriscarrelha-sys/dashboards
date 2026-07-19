'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { sendAIMessage } from '@/lib/actions';

export type ChatMessage = { role: string; content: string; provider: string | null };
type ProviderStatus = { key: string; name: string; available: boolean };

const TASKS = ['strategy', 'drafting', 'review', 'comparison', 'research', 'synthesis'] as const;

export function AIChat({
  caseId, conversationId, messages, providers,
}: {
  caseId: string;
  conversationId: string | null;
  messages: ChatMessage[];
  providers: ProviderStatus[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [prompt, setPrompt] = useState('');
  const [task, setTask] = useState<(typeof TASKS)[number]>('strategy');
  const [override, setOverride] = useState<string>('');

  const activeProvider = override
    ? providers.find((p) => p.key === override)
    : providers.find((p) => p.available);
  const willUseMock = !activeProvider?.available;

  const send = () => {
    if (!prompt.trim()) return;
    start(async () => {
      await sendAIMessage(caseId, conversationId, task, prompt.trim(), override || undefined);
      setPrompt('');
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="max-h-[45vh] space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Start a case conversation. Responses are proposals and never legal advice — save useful output to the
              verification queue before it becomes part of the record.
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.content}
                </div>
                {m.provider && <div className="mt-0.5 text-xs text-muted-foreground">via {m.provider}</div>}
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 border-t p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1">
              Task:
              <select className="rounded border bg-background px-2 py-1" value={task} onChange={(e) => setTask(e.target.value as never)}>
                {TASKS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1">
              Provider:
              <select className="rounded border bg-background px-2 py-1" value={override} onChange={(e) => setOverride(e.target.value)}>
                <option value="">Auto</option>
                {providers.map((p) => (
                  <option key={p.key} value={p.key}>{p.name}{p.available ? '' : ' (unavailable)'}</option>
                ))}
              </select>
            </label>
            <span className={`rounded px-2 py-0.5 ${willUseMock ? 'bg-[hsl(var(--unverified)/0.15)] text-[hsl(var(--unverified))]' : 'bg-[hsl(var(--confirmed)/0.15)] text-[hsl(var(--confirmed))]'}`}>
              Will use: {willUseMock ? 'Built-in mock (no key configured)' : activeProvider?.name}
            </span>
          </div>
          <div className="flex gap-2">
            <textarea rows={2} className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Ask about strategy, draft a section, compare filings…"
              value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <Button onClick={send} disabled={pending || !prompt.trim()}>Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
