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
  // 実スマート葬儀の商品フィールド
  productCode?: string;
  modelCode?: string;
  costTax?: number;
  deduction?: string;
  refundable?: boolean;
  description?: string;
  remarks?: string;
  availableEc?: boolean;
  availableHomepage?: boolean;
  availableAttendant?: boolean;
  availableReturnedItem?: boolean;
  availableItem?: boolean;
  grouped?: boolean;
  notOrdering?: boolean;
  orderOnly?: boolean;
  hiddenPicking?: boolean;
  hidden?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): Product {
  return { id: r.id, productKind: r.product_kind ?? undefined, name: r.name, kana: r.kana ?? undefined,
    unitPrice: r.unit_price ?? 0, costPrice: r.cost_price ?? undefined, taxRate: Number(r.tax_rate ?? 0.1),
    unit: r.unit ?? undefined, supplier: r.supplier ?? undefined, note: r.note ?? undefined,
    productCode: r.product_code ?? undefined, modelCode: r.model_code ?? undefined,
    costTax: r.cost_tax != null ? Number(r.cost_tax) : undefined, deduction: r.deduction ?? undefined,
    refundable: !!r.refundable, description: r.description ?? undefined, remarks: r.remarks ?? undefined,
    availableEc: !!r.available_ec, availableHomepage: !!r.available_homepage, availableAttendant: !!r.available_attendant,
    availableReturnedItem: !!r.available_returned_item, availableItem: !!r.available_item,
    grouped: !!r.grouped, notOrdering: !!r.not_ordering, orderOnly: !!r.order_only,
    hiddenPicking: !!r.hidden_picking, hidden: !!r.hidden };
}

export interface ProductSetItem { id: string; productSourceId?: string; productId?: string; productName?: string; quantity: number; hideOnInvoice: boolean; notOrdering: boolean }
export interface ProductSet {
  id: string; code?: string; name: string; description?: string;
  price: number; taxIncludedPrice: number; tax: number; selfPlanning: boolean; hidden: boolean;
  items?: ProductSetItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSet(r: any): ProductSet {
  return { id: r.id, code: r.code ?? undefined, name: r.name, description: r.description ?? undefined,
    price: r.price ?? 0, taxIncludedPrice: r.tax_included_price ?? 0, tax: Number(r.tax ?? 0.1),
    selfPlanning: !!r.self_planning, hidden: !!r.hidden };
}

export async function listProductSets(): Promise<ProductSet[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_product_sets").select("*").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("created_at", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(mapSet);
}

export async function getProductSet(id: string): Promise<ProductSet | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.from("fk_product_sets").select("*").eq("id", id).is("deleted_at", null).single();
  if (!data) return null;
  const set = mapSet(data);
  const { data: items } = await c.from("fk_product_set_items").select("*,fk_products(name)").eq("set_id", id).order("sort_order", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set.items = ((items ?? []) as any[]).map((it) => ({ id: it.id, productSourceId: it.product_source_id ?? undefined, productId: it.product_id ?? undefined, productName: it.fk_products?.name ?? undefined, quantity: it.quantity ?? 1, hideOnInvoice: !!it.hide_on_invoice, notOrdering: !!it.not_ordering }));
  return set;
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
