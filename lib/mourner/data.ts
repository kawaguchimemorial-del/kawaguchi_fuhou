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
  return { rows: rows.map(toAttendee), total: count ?? 0 };
}

function toAttendee(r: Record<string, unknown>): Attendee {
  return {
    id: String(r.id),
    name: String(r.sender_name ?? ""),
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
  return toAttendee(data as Record<string, unknown>);
}

/** CSV/TXT 出力用に全件取得（ページングなし） */
export async function listAllAttendees(memorialId: string): Promise<Attendee[]> {
  const { data } = await db()
    .from("condolence_messages")
    .select("*")
    .eq("memorial_id", memorialId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as Record<string, unknown>[]).map(toAttendee);
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
