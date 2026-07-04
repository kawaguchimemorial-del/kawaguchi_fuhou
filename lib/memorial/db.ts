import "server-only";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export function dbEnabled(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** slug から memorial の UUID を解決（公開済みのみ） */
export async function resolveMemorialId(slug: string): Promise<string | null> {
  if (!dbEnabled()) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as unknown as { from: (t: string) => any };
  const { data, error } = await db
    .from("memorials")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();
  if (error || !data) return null;
  return data.id as string;
}

// 入場カウントの重複除外ウィンドウ（同一訪問者は30分以内は再カウントしない）
const VIEW_DEDUP_MINUTES = 30;

/** リクエストの接続元IPをソルト付きでハッシュ化（生IPは保存しない）。取得不可なら null。
 *  ランタイム非依存: Web Crypto(crypto.subtle)を優先し、失敗時のみ Node createHash。 */
async function getIpHash(): Promise<string | null> {
  try {
    const h = await headers();
    // Vercel/プロキシ経由のクライアントIP。複数ヘッダをフォールバック。
    const cand = [
      h.get("x-forwarded-for"),
      h.get("x-vercel-forwarded-for"),
      h.get("x-real-ip"),
      h.get("cf-connecting-ip"),
    ];
    let ip = "";
    for (const v of cand) {
      const first = (v ?? "").split(",")[0].trim();
      if (first) { ip = first; break; }
    }
    if (!ip) return null;
    const salt = process.env.VIEW_HASH_SALT ?? "atsougi-view";
    const input = `${salt}:${ip}`;
    // Web Crypto（Node20+ / Edge 両対応）
    try {
      const subtle = globalThis.crypto?.subtle;
      if (subtle) {
        const buf = await subtle.digest("SHA-256", new TextEncoder().encode(input));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    } catch {
      /* fall through to Node crypto */
    }
    return createHash("sha256").update(input).digest("hex");
  } catch {
    return null;
  }
}

/** オンライン式場の閲覧（入場）を記録。
 *  同一IP（ハッシュ）が30分以内に閲覧済みなら再カウントしない＝訪問者単位のカウント。 */
export async function logView(slug: string, kind: "obituary" | "venue" = "venue"): Promise<void> {
  if (!dbEnabled()) return;
  const mid = await resolveMemorialId(slug);
  if (!mid) return;

  const ipHash = await getIpHash();
  if (ipHash) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as unknown as { from: (t: string) => any };
    const since = new Date(Date.now() - VIEW_DEDUP_MINUTES * 60 * 1000).toISOString();
    const { data: recent } = await db
      .from("memorial_views")
      .select("id")
      .eq("memorial_id", mid)
      .eq("kind", kind)
      .eq("ip_hash", ipHash)
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) return; // 30分以内の同一訪問者はカウントしない
  }

  await insertRow("memorial_views", { memorial_id: mid, kind, ip_hash: ipHash });
}

// 供花・供物の商品マスタ（葬儀社ごと）。現状は単一葬儀社のためデモIDで絞る。
const DEMO_FUNERAL_HOME_ID = "11111111-1111-1111-1111-111111111111";

export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  priceJpy: number;
  type: "供花" | "供物";
  size?: string;
  imagePath?: string;
}

/** 公開注文フォーム用：有効な商品マスタを並び順で取得（service_role）。
 *  type を省略すると供花・供物すべて。未設定・未取得時は空配列。 */
export async function getPublicProducts(type?: "供花" | "供物"): Promise<PublicProduct[]> {
  if (!dbEnabled()) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as unknown as { from: (t: string) => any };
  let qb = db
    .from("offering_products_master")
    .select("*")
    .eq("funeral_home_id", DEMO_FUNERAL_HOME_ID)
    .eq("is_active", true)
    .order("sort_order");
  if (type) qb = qb.eq("type", type);
  const { data, error } = await qb;
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description ?? "") as string,
    priceJpy: r.price_jpy as number,
    type: r.type as "供花" | "供物",
    size: r.size ?? undefined,
    imagePath: r.image_path ?? undefined,
  }));
}

/** 任意テーブルへ1行INSERT（service_role） */
export async function insertRow(table: string, row: Record<string, unknown>): Promise<string | null> {
  if (!dbEnabled()) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as unknown as { from: (t: string) => any };
  const { error } = await db.from(table).insert(row);
  return error ? error.message : null;
}
