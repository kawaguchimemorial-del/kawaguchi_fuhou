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
      // 公開日(published_at)の降順。未設定は作成日で後ろに回す。
      .order("published_at", { ascending: false, nullsFirst: false })
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
export interface AllOrderRow {
  id: string;
  mournerName: string;
  deceasedName: string;
  createdAt: string;
  status: string;
  ordererName: string;
  namePlate: string;
  address: string;
  payment: string;
  amountJpy: number;
}
const ORDER_STATUS_LABEL: Record<string, string> = {
  captured: "決済完了", authorized: "与信中", canceled: "キャンセル", error: "エラー", pending_confirm: "受付",
};
/** 葬儀社全体の供花・供物 注文一覧（offering_orders × memorials × deceased）。 */
export async function listAllOrders(): Promise<AllOrderRow[]> {
  const c = await db();
  if (!c) return [];
  const { data } = await c
    .from("offering_orders")
    .select(
      "id,product_name,quantity,unit_price_jpy,orderer_name,company,address,name_plate_text,status,payment_method,created_at,memorials!inner(funeral_home_id,announce_mourner_name,deceased(name_kanji))"
    )
    .eq("memorials.funeral_home_id", DEMO_FUNERAL_HOME_ID)
    .neq("status", "error") // 決済未成立(error)は除外
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => {
    const m = Array.isArray(r.memorials) ? r.memorials[0] : r.memorials;
    const dec = m && (Array.isArray(m.deceased) ? m.deceased[0] : m.deceased);
    return {
      id: r.id,
      mournerName: (m?.announce_mourner_name ?? "").replace(/^喪主\s*/, "") || "—",
      deceasedName: dec?.name_kanji ?? "—",
      createdAt: r.created_at,
      status: ORDER_STATUS_LABEL[r.status] ?? r.status ?? "",
      ordererName: [r.company, r.orderer_name].filter(Boolean).join(" ") || "—",
      namePlate: r.name_plate_text ?? "",
      address: r.address ?? "",
      payment: r.payment_method || "—",
      amountJpy: (r.unit_price_jpy ?? 0) * (r.quantity ?? 1),
    };
  });
}
// ===== 管理(バックオフィス)用: 公開状態に関わらず案件を取得 =====
// 公開ゲスト(get_public_obituary)は published のみだが、管理は下書き/公開終了も閲覧・編集する。
export async function getAdminMemorial(slug: string): Promise<import("@/lib/memorial/types").Memorial | null> {
  const c = await db();
  if (!c) return null;
  const { data, error } = await c
    .from("memorials")
    .select(
      "id,slug,status,access_level,noindex_flag,religion_type,funeral_style,koden_decline,flower_decline,attend_decline,koden_accept_until,offering_accept_until,published_at,obituary_title,obituary_body,announce_mourner_name,venue,funeral_homes(name,phone,contact_email),deceased(name_kanji,name_kana,age_kazoe,age_full,death_date,portrait_path,portrait_alt,relation_to_mourner,bio_text),funeral_events(event_type,start_at,end_at,datetime_label,venue_name,venue_address,map_url,reception_time,access_text,parking_note,sort_order)"
    )
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = data as any;
  const dec = Array.isArray(m.deceased) ? m.deceased[0] : m.deceased;
  const fh = Array.isArray(m.funeral_homes) ? m.funeral_homes[0] : m.funeral_homes;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = ((m.funeral_events ?? []) as any[])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((e, i) => ({
      id: `e${i}`, eventType: e.event_type, startAt: e.start_at ?? undefined, endAt: e.end_at ?? undefined,
      datetimeLabel: e.datetime_label ?? undefined, venueName: e.venue_name ?? undefined,
      venueAddress: e.venue_address ?? undefined, mapUrl: e.map_url ?? undefined,
      receptionTime: e.reception_time ?? undefined, accessText: e.access_text ?? undefined, parkingNote: e.parking_note ?? undefined,
    }));
  return {
    id: m.id, slug: m.slug, status: m.status, testMode: false,
    accessLevel: m.access_level, noindex: m.noindex_flag, religionType: m.religion_type,
    funeralStyle: m.funeral_style ?? undefined,
    obituaryTitle: m.obituary_title || "訃報", obituaryBody: m.obituary_body ?? undefined,
    kodenDecline: m.koden_decline, flowerDecline: m.flower_decline, attendDecline: m.attend_decline,
    kodenAcceptUntil: m.koden_accept_until ?? undefined, offeringAcceptUntil: m.offering_accept_until ?? undefined,
    publishedAt: m.published_at ?? undefined,
    funeralHomeName: fh?.name ?? undefined,
    funeralHomeContact: { phone: fh?.phone ?? undefined, email: fh?.contact_email ?? undefined },
    chiefMourner: m.announce_mourner_name ? { nameKanji: String(m.announce_mourner_name).replace(/^喪主\s*/, "") } : undefined,
    venue: m.venue ?? undefined,
    deceased: {
      nameKanji: dec?.name_kanji ?? "—", nameKana: dec?.name_kana ?? undefined,
      ageKazoe: dec?.age_kazoe ?? undefined, ageFull: dec?.age_full ?? undefined,
      deathDate: dec?.death_date ?? undefined, portraitPath: dec?.portrait_path ?? undefined,
      portraitAlt: dec?.portrait_alt ?? undefined, relationToMourner: dec?.relation_to_mourner ?? undefined,
      bioText: dec?.bio_text ?? undefined,
    },
    events,
  };
}
export async function listKoden(): Promise<KodenEntry[]> {
  return KODEN;
}
export async function getFuneralHomeName(): Promise<string> {
  return "株式会社川口典礼 本社";
}

// ===== 案件ごとの実データ取得（葬儀詳細・芳名録・注文一覧用） =====
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function db(): Promise<{ from: (t: string) => any } | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}
async function memorialIdBySlug(slug: string): Promise<string | null> {
  const c = await db();
  if (!c) return null;
  const { data } = await c.from("memorials").select("id").eq("slug", slug).single();
  return data?.id ?? null;
}

export interface GuestbookRow {
  kind: "焼香" | "メッセージ";
  name: string;
  detail: string;
  status: string;
  createdAt: string;
}
export async function listGuestbook(slug: string): Promise<GuestbookRow[]> {
  const c = await db();
  if (!c) return [];
  const mid = await memorialIdBySlug(slug);
  if (!mid) return [];
  const [w, m] = await Promise.all([
    c.from("virtual_worships").select("worship_type,display_name,is_anonymous,message,created_at").eq("memorial_id", mid).order("created_at", { ascending: false }),
    c.from("condolence_messages").select("sender_name,body,moderation_status,created_at").eq("memorial_id", mid).order("created_at", { ascending: false }),
  ]);
  const rows: GuestbookRow[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (w.data ?? []) as any[])
    rows.push({ kind: "焼香", name: r.is_anonymous ? "匿名" : r.display_name ?? "匿名", detail: r.worship_type + (r.message ? `／${r.message}` : ""), status: "—", createdAt: r.created_at });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (m.data ?? []) as any[])
    rows.push({ kind: "メッセージ", name: r.sender_name, detail: r.body, status: r.moderation_status === "approved" ? "公開" : r.moderation_status === "pending" ? "承認待ち" : "非公開", createdAt: r.created_at });
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export interface OrderRow {
  id: string;
  productName: string;
  quantity: number;
  amountJpy: number;
  ordererName: string;
  email: string;
  namePlate: string;
  status: string;
  createdAt: string;
}
export async function listOrders(slug: string): Promise<OrderRow[]> {
  const c = await db();
  if (!c) return [];
  const mid = await memorialIdBySlug(slug);
  if (!mid) return [];
  // status=error は決済が通っていない注文のため一覧に出さない
  const { data } = await c.from("offering_orders").select("id,product_name,quantity,unit_price_jpy,orderer_name,email,name_plate_text,status,created_at").eq("memorial_id", mid).neq("status", "error").order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id, productName: r.product_name ?? "—", quantity: r.quantity ?? 1, amountJpy: (r.unit_price_jpy ?? 0) * (r.quantity ?? 1),
    ordererName: r.orderer_name ?? "—", email: r.email ?? "", namePlate: r.name_plate_text ?? "", status: r.status ?? "", createdAt: r.created_at,
  }));
}

export interface OrderDetail {
  id: string;
  ceremonySlug: string;
  mournerName: string;
  deceasedName: string;
  createdAt: string;
  status: string;
  ordererName: string;
  ordererKana: string;
  company: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  namePlate: string;
  oldChar: boolean;
  invoiceName: string;
  memo: string;
  payment: string;
  items: { productName: string; quantity: number; unitPrice: number }[];
  total: number;
}
/** 供花・供物 注文の詳細（1件の注文＝同一 memorial_id + created_at の明細をまとめる）。 */
export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const c = await db();
  if (!c) return null;
  const { data: row } = await c
    .from("offering_orders")
    .select("id,memorial_id,created_at,status,orderer_name,orderer_kana,company,postal_code,address,phone,email,name_plate_text,old_char,invoice_name,memo,memorials(slug,announce_mourner_name,deceased(name_kanji))")
    .eq("id", id)
    .single();
  if (!row) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  const mem = Array.isArray(r.memorials) ? r.memorials[0] : r.memorials;
  const dec = mem && (Array.isArray(mem.deceased) ? mem.deceased[0] : mem.deceased);
  // 同一注文の明細（同 memorial_id + created_at）
  const { data: itemsData } = await c
    .from("offering_orders")
    .select("product_name,quantity,unit_price_jpy")
    .eq("memorial_id", r.memorial_id)
    .eq("created_at", r.created_at);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = ((itemsData ?? []) as any[]).map((it) => ({ productName: it.product_name ?? "—", quantity: it.quantity ?? 1, unitPrice: it.unit_price_jpy ?? 0 }));
  const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  return {
    id: r.id, ceremonySlug: mem?.slug ?? "",
    mournerName: (mem?.announce_mourner_name ?? "").replace(/^喪主\s*/, "") || "—",
    deceasedName: dec?.name_kanji ?? "—",
    createdAt: r.created_at, status: ORDER_STATUS_LABEL[r.status] ?? r.status ?? "",
    ordererName: r.orderer_name ?? "—", ordererKana: r.orderer_kana ?? "", company: r.company ?? "",
    postalCode: r.postal_code ?? "", address: r.address ?? "", phone: r.phone ?? "", email: r.email ?? "",
    namePlate: r.name_plate_text ?? "", oldChar: !!r.old_char, invoiceName: r.invoice_name ?? "", memo: r.memo ?? "",
    payment: "オンラインカード決済", items, total,
  };
}

export interface ExportOrderRow {
  createdAt: string;
  status: string;
  productName: string;
  quantity: number;
  amountJpy: number;
  ordererName: string;
  company: string;
  namePlate: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  invoiceName: string;
  mournerName: string;
  deceasedName: string;
}
/** 供花・供物 注文一覧のエクスポート用データ（error=決済未成立は除外）。 */
export async function getOrdersForExport(slug: string): Promise<ExportOrderRow[]> {
  const c = await db();
  if (!c) return [];
  const mid = await memorialIdBySlug(slug);
  if (!mid) return [];
  const { data } = await c
    .from("offering_orders")
    .select("created_at,status,product_name,quantity,unit_price_jpy,orderer_name,company,name_plate_text,postal_code,address,phone,email,invoice_name,memorials(announce_mourner_name,deceased(name_kanji))")
    .eq("memorial_id", mid)
    .neq("status", "error")
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => {
    const m = Array.isArray(r.memorials) ? r.memorials[0] : r.memorials;
    const dec = m && (Array.isArray(m.deceased) ? m.deceased[0] : m.deceased);
    return {
      createdAt: r.created_at,
      status: ORDER_STATUS_LABEL[r.status] ?? r.status ?? "",
      productName: r.product_name ?? "",
      quantity: r.quantity ?? 1,
      amountJpy: (r.unit_price_jpy ?? 0) * (r.quantity ?? 1),
      ordererName: r.orderer_name ?? "",
      company: r.company ?? "",
      namePlate: r.name_plate_text ?? "",
      postalCode: r.postal_code ?? "",
      address: r.address ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      invoiceName: r.invoice_name ?? "",
      mournerName: (m?.announce_mourner_name ?? "").replace(/^喪主\s*/, ""),
      deceasedName: dec?.name_kanji ?? "",
    };
  });
}

export interface KodenRow { donorName: string; amountJpy: number; hyogaki: string; status: string; createdAt: string }
export async function listKodenForMemorial(slug: string): Promise<KodenRow[]> {
  const c = await db();
  if (!c) return [];
  const mid = await memorialIdBySlug(slug);
  if (!mid) return [];
  const { data } = await c.from("koden_payments").select("donor_name,amount_jpy,hyogaki,status,created_at").eq("memorial_id", mid).order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({ donorName: r.donor_name, amountJpy: r.amount_jpy, hyogaki: r.hyogaki ?? "", status: r.status, createdAt: r.created_at }));
}

export async function countViews(slug: string): Promise<number> {
  return (await getViewStats(slug)).uniqueTotal;
}

export interface ViewEntry { createdAt: string; visitor: string }
export interface ViewStats {
  uniqueTotal: number;   // 累計入場者数（同一IP=1）
  recent30: number;      // 直近30分の入場者数（同一IP=1）
  totalVisits: number;   // 記録された入場回数（30分デデュープ後の行数）
  entries: ViewEntry[];  // 入場一覧（新しい順）
}
/** オンライン式場の入場統計。ip_hash 単位でユニーク化（同一IP=1）。 */
export async function getViewStats(slug: string, kind: "venue" | "obituary" = "venue"): Promise<ViewStats> {
  const empty: ViewStats = { uniqueTotal: 0, recent30: 0, totalVisits: 0, entries: [] };
  const c = await db();
  if (!c) return empty;
  const mid = await memorialIdBySlug(slug);
  if (!mid) return empty;
  const { data } = await c
    .from("memorial_views")
    .select("ip_hash,created_at")
    .eq("memorial_id", mid)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(10000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as { ip_hash: string | null; created_at: string }[];
  const since = Date.now() - 30 * 60 * 1000;
  const uniq = new Set<string>();
  const uniqRecent = new Set<string>();
  for (const r of rows) {
    const key = r.ip_hash ?? `row:${r.created_at}`;
    uniq.add(key);
    if (new Date(r.created_at).getTime() >= since) uniqRecent.add(key);
  }
  return {
    uniqueTotal: uniq.size,
    recent30: uniqRecent.size,
    totalVisits: rows.length,
    entries: rows.map((r) => ({ createdAt: r.created_at, visitor: r.ip_hash ? r.ip_hash.slice(0, 8) : "—" })),
  };
}
