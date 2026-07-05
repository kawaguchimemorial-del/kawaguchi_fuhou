import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export interface Product {
  id: string;
  productKind?: string;
  name: string;
  kana?: string;
  unitPrice: number;
  costPrice?: number;
  taxRate: number;
  unit?: string;
  supplier?: string;
  note?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): Product {
  return { id: r.id, productKind: r.product_kind ?? undefined, name: r.name, kana: r.kana ?? undefined,
    unitPrice: r.unit_price ?? 0, costPrice: r.cost_price ?? undefined, taxRate: Number(r.tax_rate ?? 0.1),
    unit: r.unit ?? undefined, supplier: r.supplier ?? undefined, note: r.note ?? undefined };
}

export async function listProducts(): Promise<Product[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_products").select("*").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null)
    .order("product_kind", { ascending: true }).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(map);
}

export async function getProduct(id: string): Promise<Product | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.from("fk_products").select("*").eq("id", id).is("deleted_at", null).single();
  return data ? map(data) : null;
}
