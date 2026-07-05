import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";
import { getEstimate, type Estimate } from "./estimates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export interface Invoice {
  id: string; invoiceNo?: string; estimateId?: string | null;
  billedOn?: string; dueOn?: string; total: number; paidTotal: number; status: string; createdAt: string;
  deceasedName?: string; mournerName?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): Invoice {
  const e = r.fk_estimates;
  return {
    id: r.id, invoiceNo: r.invoice_no ?? undefined, estimateId: r.estimate_id ?? undefined,
    billedOn: r.billed_on ?? undefined, dueOn: r.due_on ?? undefined, total: r.total ?? 0, paidTotal: r.paid_total ?? 0,
    status: r.status ?? "unpaid", createdAt: r.created_at,
    deceasedName: e ? [e.deceased_last_name, e.deceased_first_name].filter(Boolean).join(" ") : undefined,
    mournerName: e ? [e.mourner_last_name, e.mourner_first_name].filter(Boolean).join(" ") : undefined,
  };
}

export async function listInvoices(): Promise<Invoice[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_invoices").select("*,fk_estimates(deceased_last_name,deceased_first_name,mourner_last_name,mourner_first_name)").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(map);
}

export async function getInvoice(id: string): Promise<{ invoice: Invoice; estimate: Estimate | null } | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.from("fk_invoices").select("*,fk_estimates(deceased_last_name,deceased_first_name,mourner_last_name,mourner_first_name)").eq("id", id).is("deleted_at", null).single();
  if (!data) return null;
  const invoice = map(data);
  const estimate = invoice.estimateId ? await getEstimate(invoice.estimateId) : null;
  return { invoice, estimate };
}

export const INVOICE_STATUS_LABEL: Record<string, string> = { unpaid: "未入金", partial: "一部入金", paid: "入金済" };
