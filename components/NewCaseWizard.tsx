'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createCase } from '@/lib/actions';
import { FileUp, PencilLine } from 'lucide-react';

type Form = {
  shortName: string; caption: string; captionShort: string; caseNumber: string;
  forum: 'state' | 'federal' | 'arbitration'; caseType: string;
  courtName: string; division: string; judgeName: string;
  portalKind: 'peachcourt' | 'pacer' | 'other' | 'none'; portalUrl: string;
};

const EMPTY: Form = {
  shortName: '', caption: '', captionShort: '', caseNumber: '', forum: 'state',
  caseType: '', courtName: '', division: '', judgeName: '', portalKind: 'none', portalUrl: '',
};

export function NewCaseWizard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<'choose' | 'upload' | 'form'>('choose');
  const [extracted, setExtracted] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /** Mock extraction: fills the form from a filename, flagged for review. */
  const onUpload = (file: File | null) => {
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, '');
    const isFederal = /federal|removal|district|remand/i.test(name);
    setForm({
      ...EMPTY,
      shortName: name.split(/[_\-\s]/)[0] || 'New Case',
      caption: `[AI-extracted — review] ${name.replace(/[_\-]/g, ' ')}`,
      caseNumber: '[review]',
      forum: isFederal ? 'federal' : 'state',
      portalKind: isFederal ? 'pacer' : 'peachcourt',
      portalUrl: isFederal ? 'https://pcl.uscourts.gov/' : 'https://peachcourt.com/',
    });
    setExtracted(true);
    setStep('form');
  };

  const canSubmit = form.shortName && form.caption && form.caseNumber;

  const submit = () => {
    setError(null);
    start(async () => {
      try {
        const res = await createCase({
          shortName: form.shortName,
          caption: form.caption,
          captionShort: form.captionShort || undefined,
          caseNumber: form.caseNumber,
          forum: form.forum,
          caseType: form.caseType || undefined,
          courtName: form.courtName || undefined,
          division: form.division || undefined,
          judgeName: form.judgeName || undefined,
          portalKind: form.portalKind,
          portalUrl: form.portalUrl || undefined,
        });
        router.push(`/case/${res.id}`);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  if (step === 'choose') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <button onClick={() => setStep('upload')}
          className="flex flex-col items-start gap-2 rounded-lg border bg-card p-6 text-left hover:border-ring">
          <FileUp className="text-[hsl(var(--proposed))]" />
          <span className="font-semibold">Upload a Case Document</span>
          <span className="text-sm text-muted-foreground">
            Upload a complaint, petition, notice of removal, or docket sheet. We&apos;ll pre-fill the case details for your review.
          </span>
        </button>
        <button onClick={() => { setForm(EMPTY); setExtracted(false); setStep('form'); }}
          className="flex flex-col items-start gap-2 rounded-lg border bg-card p-6 text-left hover:border-ring">
          <PencilLine className="text-[hsl(var(--proposed))]" />
          <span className="font-semibold">Enter Case Manually</span>
          <span className="text-sm text-muted-foreground">Type the caption, court, case number, and judge yourself.</span>
        </button>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Upload an initiating document</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Extraction is mocked in this build — it pre-fills fields from the filename so you can review the flow. Every field is editable and marked for review.
        </p>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground hover:border-ring">
          <input type="file" hidden onChange={(e) => onUpload(e.target.files?.[0] ?? null)} />
          Choose a file to upload
        </label>
        <button className="mt-4 text-sm text-muted-foreground hover:text-foreground" onClick={() => setStep('choose')}>← Back</button>
      </div>
    );
  }

  // form step
  return (
    <div className="space-y-4">
      {extracted && (
        <div className="rounded-md border border-[hsl(var(--unverified)/0.4)] bg-[hsl(var(--unverified)/0.1)] px-3 py-2 text-sm text-[hsl(var(--unverified))]">
          These fields were pre-filled by mocked extraction. Review and correct everything before saving.
        </div>
      )}
      <div className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <Text label="Short name *" v={form.shortName} onChange={(v) => set('shortName', v)} placeholder="Regions" />
        <Text label="Case number *" v={form.caseNumber} onChange={(v) => set('caseNumber', v)} placeholder="25CV-0000" />
        <div className="sm:col-span-2">
          <Text label="Full caption *" v={form.caption} onChange={(v) => set('caption', v)} placeholder="Plaintiff v. Defendant, et al." />
        </div>
        <div className="sm:col-span-2">
          <Text label="Short caption" v={form.captionShort} onChange={(v) => set('captionShort', v)} />
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Forum *</span>
          <select className="w-full rounded-md border bg-background px-3 py-2" value={form.forum}
            onChange={(e) => set('forum', e.target.value)}>
            <option value="state">State</option>
            <option value="federal">Federal</option>
            <option value="arbitration">Arbitration</option>
          </select>
        </label>
        <Text label="Case type" v={form.caseType} onChange={(v) => set('caseType', v)} placeholder="foreclosure" />
        <Text label="Court" v={form.courtName} onChange={(v) => set('courtName', v)} placeholder="Superior Court of Forsyth County" />
        <Text label="Division / county" v={form.division} onChange={(v) => set('division', v)} />
        <Text label="Judge" v={form.judgeName} onChange={(v) => set('judgeName', v)} />
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Court portal</span>
          <select className="w-full rounded-md border bg-background px-3 py-2" value={form.portalKind}
            onChange={(e) => set('portalKind', e.target.value)}>
            <option value="none">None</option>
            <option value="peachcourt">PeachCourt</option>
            <option value="pacer">PACER</option>
            <option value="other">Other</option>
          </select>
        </label>
        {form.portalKind !== 'none' && (
          <div className="sm:col-span-2">
            <Text label="Portal URL" v={form.portalUrl} onChange={(v) => set('portalUrl', v)} placeholder="https://…" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[hsl(var(--disputed))]">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending || !canSubmit}>{pending ? 'Creating…' : 'Create case'}</Button>
        <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setStep('choose')}>← Start over</button>
      </div>
    </div>
  );
}

function Text({ label, v, onChange, placeholder }: { label: string; v: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <input className="w-full rounded-md border bg-background px-3 py-2" value={v}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
