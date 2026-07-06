import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { ContentStudio } from "@/components/ContentStudio";

export default function ContentStudioPage() {
  return (
    <div>
      <PageHeader
        title="AI Content Studio"
        subtitle="Generate personalized outreach grounded in advisor research, prior interactions, and approved MMNIX messaging. Everything is editable before it sends."
      />
      <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
        <ContentStudio />
      </Suspense>
    </div>
  );
}
