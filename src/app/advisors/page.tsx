import { PageHeader } from "@/components/ui";
import { AdvisorsTable } from "@/components/AdvisorsTable";

export default function AdvisorsPage() {
  return (
    <div>
      <PageHeader
        title="Advisors"
        subtitle="Every advisor is one unified profile — research, engagement, and pipeline in one record."
      />
      <AdvisorsTable />
    </div>
  );
}
