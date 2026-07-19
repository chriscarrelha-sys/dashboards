import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 text-3xl">⚖</div>
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        That matter or page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/" className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Back to matters
      </Link>
    </main>
  );
}
