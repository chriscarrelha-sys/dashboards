import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { TrustBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReclassifyForm } from '@/components/modules/ReclassifyForm';
import { DocumentEvidenceActions } from '@/components/phase2/DocumentEvidenceActions';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { ArrowLeft, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DocumentWorkspace({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = await params;
  const user = await getCurrentUser();
  const doc = await prisma.document.findFirst({
    where: { id: docId, caseId: id, case: { userId: user.id } },
  });
  if (!doc) notFound();

  // Records extracted from / linked to this document (source-linked, no duplication).
  const [relatedEvidence, allDocuments, legalIssues] = await Promise.all([
    prisma.evidenceItem.findMany({
      where: { caseId: id, OR: [{ documentId: docId }, { documentLinks: { some: { documentId: docId } } }] },
      select: { id: true, title: true, evidenceType: true, verificationStatus: true }, orderBy: { updatedAt: 'desc' },
    }),
    prisma.document.findMany({ where: { caseId: id }, select: { id: true, title: true, standardizedName: true } }),
    prisma.legalIssue.findMany({ where: { caseId: id }, select: { id: true, title: true }, orderBy: { createdAt: 'asc' } }),
  ]);

  const fileUrl = `/case/${id}/document/${docId}/file`;
  const isPdf = (doc.mimeType || '').includes('pdf');
  const isImage = (doc.mimeType || '').startsWith('image/');

  return (
    <div>
      <Link href={`/case/${id}/documents`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> All Documents
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: preview */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="truncate text-sm font-medium">Preview</span>
            <a href={fileUrl} download={doc.standardizedName}>
              <Button size="sm" variant="outline"><Download size={14} /> Original</Button>
            </a>
          </div>
          <div className="p-3">
            {doc.storageKey ? (
              isPdf ? (
                <object data={fileUrl} type="application/pdf" className="h-[60vh] w-full rounded">
                  <p className="p-4 text-sm text-muted-foreground">
                    Preview unavailable in this browser. <a className="underline" href={fileUrl}>Open the original</a>.
                  </p>
                </object>
              ) : isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl} alt={doc.standardizedName} className="max-h-[60vh] w-full rounded object-contain" />
              ) : (
                <div className="flex h-[40vh] items-center justify-center text-center text-sm text-muted-foreground">
                  No inline preview for this file type.<br /><a className="underline" href={fileUrl}>Download the original</a>.
                </div>
              )
            ) : (
              <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
                This is demonstration metadata — no file is attached.
              </div>
            )}
          </div>
        </div>

        {/* Right: case record */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{doc.title || doc.standardizedName}</h1>
              <TrustBadge status={doc.verificationStatus as VerificationStatus} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{doc.standardizedName}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Field label="Original filename" value={doc.originalName} mono />
            <Field label="Type" value={doc.docType} />
            <Field label="Document date" value={formatDate(doc.docDate)} />
            <Field label="Party" value={doc.party} />
            <Field label="Status" value={doc.docStatus} />
            <Field label="Category" value={doc.category} />
            <Field label="Confidence" value={doc.confidence != null ? `${(doc.confidence * 100).toFixed(0)}%` : '—'} />
            <Field label="Review status" value={doc.reviewStatus} />
            <Field label="Storage" value={`${doc.storageProvider}`} />
            <Field label="Uploaded" value={formatDateTime(doc.createdAt)} />
          </dl>

          {doc.sha256 && (
            <p className="break-all rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">SHA-256: </span>{doc.sha256}
            </p>
          )}

          {doc.aiSummary && (
            <div className="rounded-md border bg-card p-3 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI summary (proposed)</div>
              {doc.aiSummary}
            </div>
          )}

          <DocumentEvidenceActions
            caseId={id}
            documentId={docId}
            documents={allDocuments.map((d) => ({ id: d.id, title: d.title || d.standardizedName }))}
            legalIssues={legalIssues.map((i) => ({ id: i.id, title: i.title }))}
          />

          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Related evidence ({relatedEvidence.length})</h2>
            {relatedEvidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence linked to this document yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {relatedEvidence.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-sm">
                    <Link href={`/case/${id}/evidence`} className="hover:underline">{e.title}</Link>
                    <TrustBadge status={e.verificationStatus as VerificationStatus} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Rename / reclassify</h2>
            <ReclassifyForm
              caseId={id}
              docId={docId}
              initial={{
                title: doc.title ?? '',
                docType: doc.docType ?? 'Other',
                docStatus: doc.docStatus ?? '',
                party: doc.party ?? '',
                notes: '',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? 'truncate font-mono text-xs' : ''}>{value || '—'}</dd>
    </div>
  );
}
