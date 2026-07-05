import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";
import type { MasterItem } from "./master-defs";

export * from "./master-defs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export async function listMasterItems(type: string): Promise<MasterItem[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_master_items").select("id,name,kana,price,extra,sort_order,is_active")
    .eq("funeral_home_id", KANRI_HOME_ID).eq("master_type", type).is("deleted_at", null)
    .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, name: r.name, kana: r.kana ?? undefined, price: r.price ?? undefined, extra: r.extra ?? {}, sortOrder: r.sort_order, isActive: r.is_active }));
}

export async function getCompanyInfo(): Promise<Record<string, string>> {
  const c = db();
  if (!c) return {};
  const { data } = await c.from("fk_master_items").select("extra").eq("funeral_home_id", KANRI_HOME_ID).eq("master_type", "company_info").is("deleted_at", null).limit(1).maybeSingle();
  return data?.extra ?? {};
}

export async function masterCounts(): Promise<Record<string, number>> {
  const c = db();
  if (!c) return {};
  const { data } = await c.from("fk_master_items").select("master_type").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null);
  const m: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) m[r.master_type] = (m[r.master_type] ?? 0) + 1;
  return m;
}
