import { CeremonyWizard } from "@/components/admin/CeremonyWizard";
import { getEstimate } from "@/lib/kanri/estimates";
import { getCustomer } from "@/lib/kanri/data";

type Search = { searchParams: Promise<{ type?: string; test?: string; from_estimate?: string }> };

// ISO(timestamptz) → JSTの日付(YYYY-MM-DD)と時刻(HH:mm)
function jstParts(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const [date, time] = s.split(" ");
  return { date, time: time ?? "" };
}

export default async function NewCeremonyPage({ searchParams }: Search) {
  const sp = await searchParams;
  const withVenue = sp.type === "obituary_venue";
  const isTest = sp.test === "1";

  // 見積もりから作成: 喪主・故人・式日を初期入力
  let initialState: Record<string, string | boolean> | undefined;
  if (sp.from_estimate) {
    const e = await getEstimate(sp.from_estimate);
    if (e) {
      const wake = jstParts(e.wakeAt);
      const funeral = jstParts(e.funeralAt);
      // 通夜があれば通夜式、無ければ告別式を初期の式に
      const primary = wake.date ? { type: "通夜式", ...wake } : funeral.date ? { type: "告別式", ...funeral } : null;
      // 喪主情報が無い場合は顧客情報で補完
      const hasMourner = !!(e.addresseeLastName || e.mourner.lastName);
      const cust = !hasMourner && e.customerId ? await getCustomer(e.customerId) : null;
      initialState = {
        // 喪主（見積の宛名=喪主 → 喪主 → 顧客情報 の順で参照）
        mSei: e.addresseeLastName || e.mourner.lastName || cust?.lastName || "",
        mMei: e.addresseeFirstName || e.mourner.firstName || cust?.firstName || "",
        mSeiKana: e.addresseeLastNameKana || cust?.lastNameKana || "",
        mMeiKana: e.addresseeFirstNameKana || cust?.firstNameKana || "",
        // 故人（見積の対象者を参照）
        dSei: e.deceased.lastName ?? "",
        dMei: e.deceased.firstName ?? "",
        dSeiKana: e.deceased.lastNameKana ?? "",
        dMeiKana: e.deceased.firstNameKana ?? "",
        deathDate: e.deceased.deathDate ?? "",
        ageKazoe: e.deceased.age != null ? String(e.deceased.age) : "",
        relation: e.mourner.relation ?? "",
        // 式日（見積の通夜/告別式日時を参照）
        ...(primary ? { eventType: primary.type, eventDate: primary.date, startTime: primary.time } : {}),
        ...(e.venueName ? { venueName: e.venueName } : {}),
        ...(e.venueAddress ? { venueAddress: e.venueAddress } : {}),
      };
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">
        新しい葬儀を作成{withVenue ? "（訃報＋オンライン式場）" : "（訃報のみ）"}
      </h1>
      <CeremonyWizard withVenue={withVenue} isTest={isTest} initialState={initialState} />
    </div>
  );
}
