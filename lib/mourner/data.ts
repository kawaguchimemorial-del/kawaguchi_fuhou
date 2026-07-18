import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 喪主マイページのデータ取得。RLS はポリシー無し(deny by default)なので service_role で読む。
// 呼び出し側で必ず assertMournerAccess による本人確認を済ませること。

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any };
const db = () => createAdminClient() as unknown as Db;

export type MournerMemorial = {
  id: string;
  slug: string;
  status: string;
  mournerName: string;
  deceasedName: string;
  greeting: string | null;
  publicFrom: string | null;
  publicUntil: string | null;
  notifyEmail: string | null;
  notifyReceipt: boolean;
  notifyKoden: boolean;
  loginId: string | null;
};

export async function getMournerMemorial(memorialId: string): Promise<MournerMemorial | null> {
  const { data } = await db()
    .from("memorials")
    .select(
      "id, slug, status, announce_mourner_name, mourner_greeting, venue_public_from, venue_public_until, mourner_notify_email, mourner_notify_receipt, mourner_notify_koden, mourner_login_id, published_at, archive_at, deceased(name_kanji)"
    )
    .eq("id", memorialId)
    .maybeSingle();
  if (!data) return null;
  const dec = Array.isArray(data.deceased) ? data.deceased[0] : data.deceased;
  return {
    id: data.id,
    slug: data.slug,
    status: data.status,
    mournerName: data.announce_mourner_name ?? "",
    deceasedName: dec?.name_kanji ?? "",
    greeting: data.mourner_greeting ?? null,
    // 公開期間は専用列が未設定なら published_at〜archive_at を使う
    publicFrom: data.venue_public_from ?? data.published_at ?? null,
    publicUntil: data.venue_public_until ?? data.archive_at ?? null,
    notifyEmail: data.mourner_notify_email ?? null,
    notifyReceipt: data.mourner_notify_receipt ?? true,
    notifyKoden: data.mourner_notify_koden ?? true,
    loginId: data.mourner_login_id ?? null,
  };
}

/** ホーム画面のカードに出すバッジ件数 */
export async function getMournerCounts(memorialId: string): Promise<{
  attendees: number;
  visitors: number;
  funeralPhotos: number;
  albumPhotos: number;
}> {
  const c = db();
  const head = { count: "exact" as const, head: true };
  const [a, v, f, al] = await Promise.all([
    c.from("condolence_messages").select("id", head).eq("memorial_id", memorialId),
    c.from("memorial_views").select("id", head).eq("memorial_id", memorialId),
    c.from("memorial_photos").select("id", head).eq("memorial_id", memorialId).eq("kind", "funeral"),
    c.from("memorial_photos").select("id", head).eq("memorial_id", memorialId).eq("kind", "album"),
  ]);
  return {
    attendees: a.count ?? 0,
    visitors: v.count ?? 0,
    funeralPhotos: f.count ?? 0,
    albumPhotos: al.count ?? 0,
  };
}

export type Attendee = {
  id: string;
  name: string;
  kana: string | null;
  company: string | null;
  relation: string | null;
  postalCode: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  body: string;
  imagePaths: string[];
  createdAt: string;
  kodenAmount: number;
  kodenStatus: string | null;
};

/** 芳名録一覧。＠葬儀に倣い新しい順・20件ずつ。 */
export async function listAttendees(
  memorialId: string,
  limit = 20,
  offset = 0
): Promise<{ rows: Attendee[]; total: number }> {
  const { data, count } = await db()
    .from("condolence_messages")
    .select("*", { count: "exact" })
    .eq("memorial_id", memorialId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const rows = (data ?? []) as Record<string, unknown>[];
  // 香典は別テーブル。氏名で突き合わせる（＠葬儀は同一フォームで受けるため1対1）。
  const koden = await getKodenByDonor(memorialId);
  return { rows: rows.map((r) => toAttendee(r, koden)), total: count ?? 0 };
}

async function getKodenByDonor(memorialId: string): Promise<Map<string, { amount: number; status: string }>> {
  const { data } = await db()
    .from("koden_payments")
    .select("donor_name, amount_jpy, status")
    .eq("memorial_id", memorialId);
  const m = new Map<string, { amount: number; status: string }>();
  for (const k of (data ?? []) as { donor_name: string; amount_jpy: number; status: string }[]) {
    const key = normalizeName(k.donor_name);
    const prev = m.get(key);
    // 同名の複数記帳は合算する
    m.set(key, { amount: (prev?.amount ?? 0) + (k.amount_jpy ?? 0), status: k.status });
  }
  return m;
}

const normalizeName = (s: string) => (s ?? "").replace(/[\s　]/g, "");

function toAttendee(r: Record<string, unknown>, koden: Map<string, { amount: number; status: string }>): Attendee {
  const name = String(r.sender_name ?? "");
  const k = koden.get(normalizeName(name));
  return {
    id: String(r.id),
    name,
    kana: (r.sender_kana as string) ?? null,
    company: (r.company as string) ?? null,
    relation: (r.relation as string) ?? null,
    postalCode: (r.postal_code as string) ?? null,
    address: (r.address as string) ?? null,
    email: (r.email as string) ?? null,
    phone: (r.phone as string) ?? null,
    body: String(r.body ?? ""),
    imagePaths: Array.isArray(r.image_paths) ? (r.image_paths as string[]) : [],
    createdAt: String(r.created_at),
    kodenAmount: k?.amount ?? 0,
    kodenStatus: k?.status ?? null,
  };
}

export async function getAttendee(memorialId: string, id: string): Promise<Attendee | null> {
  const { data } = await db()
    .from("condolence_messages")
    .select("*")
    .eq("memorial_id", memorialId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const koden = await getKodenByDonor(memorialId);
  return toAttendee(data as Record<string, unknown>, koden);
}

/** CSV/TXT 出力用に全件取得（ページングなし） */
export async function listAllAttendees(memorialId: string): Promise<Attendee[]> {
  const { data } = await db()
    .from("condolence_messages")
    .select("*")
    .eq("memorial_id", memorialId)
    .order("created_at", { ascending: true });
  const koden = await getKodenByDonor(memorialId);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => toAttendee(r, koden));
}

export type VisitorRow = { id: string; kind: string; createdAt: string };

/** 入場記録。訃報/式場ページの閲覧ログ。 */
export async function listVisitors(
  memorialId: string,
  limit = 50,
  offset = 0
): Promise<{ rows: VisitorRow[]; total: number }> {
  const { data, count } = await db()
    .from("memorial_views")
    .select("id, kind, created_at", { count: "exact" })
    .eq("memorial_id", memorialId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return {
    rows: ((data ?? []) as { id: string; kind: string; created_at: string }[]).map((r) => ({
      id: r.id,
      kind: r.kind,
      createdAt: r.created_at,
    })),
    total: count ?? 0,
  };
}

export type Photo = { id: string; path: string; caption: string | null; sortOrder: number };

export async function listPhotos(memorialId: string, kind: "funeral" | "album"): Promise<Photo[]> {
  const { data } = await db()
    .from("memorial_photos")
    .select("id, path, caption, sort_order")
    .eq("memorial_id", memorialId)
    .eq("kind", kind)
    .order("sort_order", { ascending: true });
  return ((data ?? []) as { id: string; path: string; caption: string | null; sort_order: number }[]).map((p) => ({
    id: p.id,
    path: p.path,
    caption: p.caption,
    sortOrder: p.sort_order,
  }));
}

/** 香典精算テーブル（対象年月ごとの合計・手数料・振込額） */
export type KodenSettlement = {
  month: string; // 2026-07
  label: string; // 7月分
  total: number;
  fee: number;
  payout: number;
  payoutDate: string; // 2026年08月31日(月)
};

const FEE_RATE = 0.05; // 香典決済代行手数料 5%
const WD = ["日", "月", "火", "水", "木", "金", "土"];

/** 対象月の翌月末日。＠葬儀の「振込予定日」と同じ算出。 */
function payoutDateOf(year: number, month1: number): string {
  const d = new Date(year, month1 + 1, 0); // month1は1始まり → 翌月0日 = 翌月末日
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}年${mm}月${dd}日(${WD[d.getDay()]})`;
}

export async function getKodenSettlement(memorialId: string, months = 3): Promise<KodenSettlement[]> {
  const { data } = await db()
    .from("koden_payments")
    .select("amount_jpy, status, created_at")
    .eq("memorial_id", memorialId);

  // 決済完了分のみを精算対象にする
  const paid = ((data ?? []) as { amount_jpy: number; status: string; created_at: string }[]).filter(
    (k) => k.status === "succeeded" || k.status === "paid"
  );

  const byMonth = new Map<string, number>();
  for (const k of paid) {
    const d = new Date(k.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + (k.amount_jpy ?? 0));
  }

  // 基準は葬儀月（最初の記帳月）。無ければ今月から。
  const base = new Date();
  const out: KodenSettlement[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const y = d.getFullYear();
    const m1 = d.getMonth() + 1;
    const key = `${y}-${String(m1).padStart(2, "0")}`;
    const total = byMonth.get(key) ?? 0;
    const fee = Math.floor(total * FEE_RATE);
    out.push({
      month: key,
      label: `${m1}月分`,
      total,
      fee,
      payout: total - fee,
      payoutDate: payoutDateOf(y, m1),
    });
  }
  return out;
}
