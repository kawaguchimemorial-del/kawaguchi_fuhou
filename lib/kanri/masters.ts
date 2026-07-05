import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

// 管理するマスタ種別（設定画面の左メニュー）
export const MASTER_TYPES: { type: string; label: string; hasPrice?: boolean }[] = [
  { type: "venue", label: "会場" },
  { type: "crematorium", label: "斎場・火葬場" },
  { type: "org_company", label: "発行会社" },
  { type: "customer_kind", label: "顧客種別" },
  { type: "inflow", label: "流入経路" },
  { type: "product_kind", label: "商品種別" },
  { type: "supplier", label: "発注先" },
  { type: "religion", label: "宗教者・宗旨" },
  { type: "sale_category", label: "売上区分" },
  { type: "purchase_category", label: "仕入区分" },
  { type: "shipping", label: "送料", hasPrice: true },
  { type: "note_master", label: "備考定型文" },
];

export function masterLabel(type: string): string {
  return MASTER_TYPES.find((m) => m.type === type)?.label ?? type;
}

export interface MasterItem { id: string; name: string; kana?: string; price?: number; sortOrder: number; isActive: boolean }

export async function listMasterItems(type: string): Promise<MasterItem[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_master_items").select("id,name,kana,price,sort_order,is_active")
    .eq("funeral_home_id", KANRI_HOME_ID).eq("master_type", type).is("deleted_at", null)
    .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, name: r.name, kana: r.kana ?? undefined, price: r.price ?? undefined, sortOrder: r.sort_order, isActive: r.is_active }));
}

/** マスタ種別ごとの件数（設定トップ用）。 */
export async function masterCounts(): Promise<Record<string, number>> {
  const c = db();
  if (!c) return {};
  const { data } = await c.from("fk_master_items").select("master_type").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null);
  const m: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) m[r.master_type] = (m[r.master_type] ?? 0) + 1;
  return m;
}
