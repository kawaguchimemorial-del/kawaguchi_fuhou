import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

// デモの葬儀社ID（lib/admin/actions.ts と一致）。TODO(auth): ログインユーザーのテナント。
export const DEMO_FUNERAL_HOME_ID = "11111111-1111-1111-1111-111111111111";

// 管理画面用の暫定データ。実顧客情報は使わずダミー。
// TODO(supabase): memorials/deceased/funeral_events 等から葬儀社(funeral_home_id)単位で取得。

export interface CeremonyListItem {
  id: string;
  slug: string;
  type: "訃報のみ" | "訃報+式場";
  isTest: boolean;
  mournerName: string;
  deceasedName: string;
  event1: { name: string; date: string };
  event2?: { name: string; date: string };
  publishFrom: string;
  publishUntil: string;
  flowerDeadline?: string;
  offeringDeadline?: string;
  giftDeadline?: string;
  status: "公開中" | "下書き" | "終了";
  kodenOption: "利用する" | "利用しない";
  memo?: string;
}

export interface KodenEntry {
  id: string;
  registeredAt: string;
  mournerName: string;
  deceasedName: string;
  event1: string;
  event2?: string;
  donorName: string;
  amountJpy: number;
}

const CEREMONIES: CeremonyListItem[] = [
  {
    id: "c1",
    slug: "sample-haruko",
    type: "訃報+式場",
    isTest: true,
    mournerName: "山田 太郎",
    deceasedName: "山田 哲夫",
    event1: { name: "一日葬", date: "2026/07/01(水)" },
    publishFrom: "2026/06/29 08:41",
    publishUntil: "2026/08/28 08:41",
    flowerDeadline: "06/30(火) 08:30",
    status: "公開中",
    kodenOption: "利用する",
    memo: "",
  },
  {
    id: "c2",
    slug: "sample-2",
    type: "訃報のみ",
    isTest: false,
    mournerName: "佐藤 花子",
    deceasedName: "佐藤 一郎",
    event1: { name: "通夜式", date: "2026/06/14(日)" },
    event2: { name: "告別式", date: "2026/06/15(月)" },
    publishFrom: "2026/06/10 16:19",
    publishUntil: "2026/08/09 16:19",
    flowerDeadline: "06/14(日) 12:00",
    status: "公開中",
    kodenOption: "利用しない",
  },
];

const KODEN: KodenEntry[] = [
  { id: "k1", registeredAt: "2026/04/03 20:48", mournerName: "佐藤 花子", deceasedName: "佐藤 一郎", event1: "2026/04/04(土)", donorName: "前田 好夫", amountJpy: 30000 },
  { id: "k2", registeredAt: "2026/04/03 14:32", mournerName: "佐藤 花子", deceasedName: "佐藤 一郎", event1: "2026/04/04(土)", donorName: "宮田 智哉", amountJpy: 5000 },
  { id: "k3", registeredAt: "2026/04/02 12:29", mournerName: "佐藤 花子", deceasedName: "佐藤 一郎", event1: "2026/04/04(土)", donorName: "海老原 愛莉", amountJpy: 3000 },
];

const WD = ["日", "月", "火", "水", "木", "金", "土"];
function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}(${WD[d.getDay()]})`;
}
function fmtDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function listCeremonies(): Promise<CeremonyListItem[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return CEREMONIES; // 未設定時はシード
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("memorials")
      .select(
        "slug,status,access_level,koden_decline,published_at,venue,announce_mourner_name,deceased(name_kanji),funeral_events(event_type,start_at,datetime_label)"
      )
      .eq("funeral_home_id", DEMO_FUNERAL_HOME_ID)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error || !data) return CEREMONIES;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((m, i): CeremonyListItem => {
      const events = (m.funeral_events ?? []) as Array<{ event_type: string; start_at?: string; datetime_label?: string }>;
      const dec = Array.isArray(m.deceased) ? m.deceased[0] : m.deceased;
      const venue = m.venue as { openUntil?: string } | null;
      const publishUntil =
        venue?.openUntil ??
        (m.published_at
          ? new Date(new Date(m.published_at).getTime() + 60 * 86400000).toISOString()
          : null);
      const ev = (e?: { event_type: string; start_at?: string; datetime_label?: string }) =>
        e ? { name: e.event_type, date: e.datetime_label || fmtDate(e.start_at) || "日程調整中" } : undefined;
      return {
        id: m.slug ?? String(i),
        slug: m.slug,
        type: m.venue ? "訃報+式場" : "訃報のみ",
        isTest: false,
        mournerName: (m.announce_mourner_name ?? "").replace(/^喪主\s*/, "") || "—",
        deceasedName: dec?.name_kanji ?? "—",
        event1: ev(events[0]) ?? { name: "—", date: "" },
        event2: ev(events[1]),
        publishFrom: fmtDateTime(m.published_at),
        publishUntil: fmtDateTime(publishUntil),
        status: m.status === "published" ? "公開中" : m.status === "draft" ? "下書き" : "終了",
        kodenOption: m.koden_decline ? "利用しない" : "利用する",
      };
    });
  } catch {
    return CEREMONIES;
  }
}
export async function listKoden(): Promise<KodenEntry[]> {
  return KODEN;
}
export async function getFuneralHomeName(): Promise<string> {
  return "株式会社川口典礼 本社";
}
