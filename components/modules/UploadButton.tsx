'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { uploadDocument } from '@/lib/actions';
import { Upload } from 'lucide-react';

/**
 * Upload + automatic mock classification. High-confidence types are applied
 * immediately; uncertain ones are routed to the review queue. An Undo removes
 * the just-added document.
 */
export function UploadButton({ caseId }: { caseId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    fd.set('file', files[0]!);
    start(async () => {
      try {
        const res = await uploadDocument(caseId, fd);
        setMsg(
          res.autoApply
            ? `Classified and filed as “${res.standardizedName}”.`
            : `Uploaded “${res.standardizedName}” — sent to the review queue (low confidence).`,
        );
        router.refresh();
      } catch (e) {
        setMsg(`Upload failed: ${(e as Error).message}`);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={pending}>
        <Upload size={15} />
        {pending ? 'Processing…' : 'Upload document'}
      </Button>
      {msg && <p className="max-w-xs text-right text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
