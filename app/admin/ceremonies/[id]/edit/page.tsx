import { notFound } from "next/navigation";
import { getCeremonyFormState } from "@/lib/admin/actions";
import { CeremonyWizard } from "@/components/admin/CeremonyWizard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function EditCeremonyPage({ params }: Params) {
  const { id } = await params; // id = slug
  const fs = await getCeremonyFormState(id);
  if (!fs) notFound();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">葬儀を編集</h1>
      <CeremonyWizard
        withVenue={fs.withVenue}
        isTest={fs.isTest}
        editSlug={id}
        initialState={fs.state}
      />
    </div>
  );
}
