import { PageHeading } from '@/components/PageHeading';
import { Card } from '@/components/ui/card';
import { integrationsWithStatus, type IntegrationStatus } from '@/lib/integrations/registry';

const STATUS_STYLE: Record<IntegrationStatus, { label: string; cls: string }> = {
  connected: { label: 'Connected', cls: 'bg-[hsl(var(--confirmed)/0.15)] text-[hsl(var(--confirmed))]' },
  mock: { label: 'Mock', cls: 'bg-[hsl(var(--unverified)/0.15)] text-[hsl(var(--unverified))]' },
  unavailable: { label: 'Unavailable', cls: 'bg-muted text-muted-foreground' },
};

export function IntegrationsModule() {
  const integrations = integrationsWithStatus();
  const groups = ['ai', 'storage', 'calendar', 'court', 'pdf', 'legal'] as const;
  const groupLabels: Record<string, string> = {
    ai: 'AI Providers', storage: 'Storage', calendar: 'Calendars',
    court: 'Court Systems', pdf: 'PDF Tools', legal: 'Legal Resources',
  };

  return (
    <div>
      <PageHeading
        title="Integrations"
        description="Honest status for every connector. “Mock” means a built-in placeholder lets you use the feature without an external service; nothing is reported connected unless it truly is."
      />
      <div className="space-y-6">
        {groups.map((g) => {
          const items = integrations.filter((i) => i.category === g);
          if (!items.length) return null;
          return (
            <section key={g}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{groupLabels[g]}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((i) => {
                  const s = STATUS_STYLE[i.status];
                  return (
                    <Card key={i.key} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{i.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{i.purpose}</p>
                      {i.capabilities.length > 0 && (
                        <p className="mt-2 text-xs"><span className="font-medium">Capabilities: </span>
                          <span className="text-muted-foreground">{i.capabilities.join(', ')}</span></p>
                      )}
                      {i.limitations.length > 0 && (
                        <p className="mt-1 text-xs"><span className="font-medium">Limitations: </span>
                          <span className="text-muted-foreground">{i.limitations.join('; ')}</span></p>
                      )}
                      <div className="mt-3">
                        <button disabled className="cursor-not-allowed rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
                          {i.status === 'connected' ? 'Configure' : i.externalOnly ? 'External link' : 'Connect (not wired in v1)'}
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
