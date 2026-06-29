import "server-only";
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

/** オンライン式場の閲覧（入場）を記録 */
export async function logView(slug: string, kind: "obituary" | "venue" = "venue"): Promise<void> {
  if (!dbEnabled()) return;
  const mid = await resolveMemorialId(slug);
  if (mid) await insertRow("memorial_views", { memorial_id: mid, kind });
}

/** 任意テーブルへ1行INSERT（service_role） */
export async function insertRow(table: string, row: Record<string, unknown>): Promise<string | null> {
  if (!dbEnabled()) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as unknown as { from: (t: string) => any };
  const { error } = await db.from(table).insert(row);
  return error ? error.message : null;
}
