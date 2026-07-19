import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewCaseWizard } from '@/components/NewCaseWizard';

export default function NewCasePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> All matters
      </Link>
      <h1 className="mb-1 text-xl font-semibold">Add New Case</h1>
      <p className="mb-6 text-sm text-muted-foreground">Upload an initiating document or enter the details manually.</p>
      <NewCaseWizard />
    </main>
  );
}
