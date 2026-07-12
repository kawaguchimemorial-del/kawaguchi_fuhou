import { notFound } from "next/navigation";
import { getCeremonyFormState } from "@/lib/admin/actions";
import { CeremonyWizard } from "@/components/admin/CeremonyWizard";
import { listProducts } from "@/lib/admin/product-actions";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
};

export default async function EditCeremonyPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { step } = await searchParams;
  const fs = await getCeremonyFormState(id);
  if (!fs) notFound();
  const flowerProducts = await listProducts();

  const focusStep = step != null && step !== "" ? Number(step) : undefined;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">葬儀を編集</h1>
      <CeremonyWizard
        withVenue={fs.withVenue}
        isTest={fs.isTest}
        editSlug={id}
        initialState={fs.state}
        focusStep={Number.isFinite(focusStep) ? focusStep : undefined}
        flowerProducts={flowerProducts}
      />
    </div>
  );
}
