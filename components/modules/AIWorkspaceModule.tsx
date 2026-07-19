import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { AIChat, type ChatMessage } from '@/components/modules/AIChat';
import { providerStatuses } from '@/lib/providers/ai/registry';

export async function AIWorkspaceModule({ caseId }: { caseId: string }) {
  const convo = await prisma.aIConversation.findFirst({
    where: { caseId, scope: 'case' },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  const messages: ChatMessage[] = (convo?.messages ?? []).map((m) => ({
    role: m.role, content: m.content, provider: m.provider,
  }));
  const providers = providerStatuses().map((p) => ({ key: p.key, name: p.name, available: p.available }));

  return (
    <div>
      <PageHeading
        title="Case AI Workspace"
        description="A persistent case conversation. In this build, responses come from a built-in mock unless a provider API key is configured in Integrations. Nothing here is legal advice."
      />
      <AIChat caseId={caseId} conversationId={convo?.id ?? null} messages={messages} providers={providers} />
    </div>
  );
}
