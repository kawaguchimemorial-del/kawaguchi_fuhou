import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export interface PurchaseOrderItem { name: string; unitPrice: number; quantity: number; amount: number }
export interface PurchaseOrder {
  id: string; supplier?: string; orderNo?: string; orderedOn?: string; deliveredOn?: string;
  status: string; paymentStatus: string; total: number; note?: string; createdAt: string;
  estimateId?: string | null; deceasedName?: string;
  items?: PurchaseOrderItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): PurchaseOrder {
  const e = r.fk_estimates;
  return {
    id: r.id, supplier: r.supplier ?? undefined, orderNo: r.order_no ?? undefined,
    orderedOn: r.ordered_on ?? undefined, deliveredOn: r.delivered_on ?? undefined,
    status: r.status ?? "ordered", paymentStatus: r.payment_status ?? "unpaid", total: r.total ?? 0, note: r.note ?? undefined,
    estimateId: r.estimate_id ?? undefined, createdAt: r.created_at,
    deceasedName: e ? [e.deceased_last_name, e.deceased_first_name].filter(Boolean).join(" ") : undefined,
  };
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_purchase_orders").select("*,fk_estimates(deceased_last_name,deceased_first_name)").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(map);
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.from("fk_purchase_orders").select("*,fk_estimates(deceased_last_name,deceased_first_name)").eq("id", id).is("deleted_at", null).single();
  if (!data) return null;
  const po = map(data);
  const { data: items } = await c.from("fk_purchase_order_items").select("*").eq("order_id", id).order("sort_order", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  po.items = ((items ?? []) as any[]).map((r) => ({ name: r.name, unitPrice: r.unit_price, quantity: r.quantity, amount: r.amount }));
  return po;
}

export const ORDER_STATUS_LABEL: Record<string, string> = { ordered: "発注済", delivered: "納品済" };
export const PAYABLE_STATUS_LABEL: Record<string, string> = { unpaid: "未払", paid: "支払済" };

export interface SmsLog { id: string; phone?: string; body: string; status: string; sentAt: string }
export async function listSmsLogs(): Promise<SmsLog[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_sms_logs").select("id,phone,body,status,sent_at").eq("funeral_home_id", KANRI_HOME_ID).order("sent_at", { ascending: false }).limit(200);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, phone: r.phone ?? undefined, body: r.body, status: r.status, sentAt: r.sent_at }));
}
