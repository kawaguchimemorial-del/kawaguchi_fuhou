import { CeremonyWizard } from "@/components/admin/CeremonyWizard";

type Search = { searchParams: Promise<{ type?: string; test?: string }> };

export default async function NewCeremonyPage({ searchParams }: Search) {
  const sp = await searchParams;
  const withVenue = sp.type === "obituary_venue";
  const isTest = sp.test === "1";
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">
        新しい葬儀を作成{withVenue ? "（訃報＋オンライン式場）" : "（訃報のみ）"}
      </h1>
      <CeremonyWizard withVenue={withVenue} isTest={isTest} />
    </div>
  );
}
