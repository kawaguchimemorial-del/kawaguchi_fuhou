import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}

export interface Payment { id: string; amount: number; paidOn?: string; method?: string; category?: string }
export interface PaymentSlip {
  id: string; invoiceId: string; source?: string; slipKind?: string; performanceNo?: string; slipNo?: string;
  issuedOn?: string; addressee?: string; honorific?: string; note?: string; issuerCompany?: string;
  transferName?: string; summary?: string; remark?: string; createdAt: string; payments: Payment[];
}

// 請求書に紐づく入金伝票（履歴）
export async function listPaymentSlips(invoiceId: string): Promise<PaymentSlip[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_payment_slips").select("*,fk_payments(*)").eq("invoice_id", invoiceId).is("deleted_at", null).order("created_at", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id, invoiceId: r.invoice_id, source: r.source ?? undefined, slipKind: r.slip_kind ?? undefined,
    performanceNo: r.performance_no ?? undefined, slipNo: r.slip_no ?? undefined, issuedOn: r.issued_on ?? undefined,
    addressee: r.addressee ?? undefined, honorific: r.honorific ?? undefined, note: r.note ?? undefined,
    issuerCompany: r.issuer_company ?? undefined, transferName: r.transfer_name ?? undefined,
    summary: r.summary ?? undefined, remark: r.remark ?? undefined, createdAt: r.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payments: ((r.fk_payments ?? []) as any[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((p) => ({
      id: p.id, amount: p.amount ?? 0, paidOn: p.paid_on ?? undefined, method: p.method ?? undefined, category: p.category ?? undefined,
    })),
  }));
}
