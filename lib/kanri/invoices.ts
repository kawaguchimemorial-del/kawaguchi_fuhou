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
  // リレーション（実スマート葬儀準拠: 請求書は顧客に直接紐付く）
  customerId?: string | null; customerName?: string;
  title?: string; saleCategory?: string; constructionNo?: string;
  invoiceTargetName?: string; // 請求先（顧客と異なる宛先に請求できる）
  invoiceTargetKind?: string; invoiceTargetFirstName?: string; invoiceTargetNameKana?: string;
  invoiceTargetPostcode?: string; invoiceTargetPrefecture?: string;
  invoiceTargetCity?: string; invoiceTargetStreet?: string; invoiceTargetBuilding?: string;
  issuerCompany?: string; chargedOrg?: string; chargedUser?: string;
  productSetId?: string; advancePayment?: number;
}

export interface InvoiceDetail {
  id: string; divideTitle?: string; title: string; tagName?: string;
  price: number; priceIncludingTax?: number; tax: number; quantity: number;
  amount: number; taxAmount: number; amountIncludingTax: number;
  supplier?: string; categoryLarge?: string; saleKind?: string;
  isSetItem?: boolean; hiddenPaper?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): Invoice {
  const e = r.fk_estimates;
  const cu = r.fk_customers;
  return {
    id: r.id, invoiceNo: r.invoice_no ?? undefined, estimateId: r.estimate_id ?? undefined,
    billedOn: r.billed_on ?? undefined, dueOn: r.due_on ?? undefined, total: r.total ?? 0, paidTotal: r.paid_total ?? 0,
    status: r.status ?? "unpaid", createdAt: r.created_at,
    deceasedName: r.deceased_name ?? (e ? [e.deceased_last_name, e.deceased_first_name].filter(Boolean).join(" ") : undefined) ?? undefined,
    mournerName: r.mourner_name ?? (e ? [e.mourner_last_name, e.mourner_first_name].filter(Boolean).join(" ") : undefined) ?? undefined,
    customerId: r.customer_id ?? undefined,
    customerName: cu ? [cu.last_name, cu.first_name].filter(Boolean).join(" ") : undefined,
    title: r.title ?? undefined, saleCategory: r.sale_category ?? undefined, constructionNo: r.construction_no ?? undefined,
    invoiceTargetName: r.invoice_target_name ?? undefined,
    invoiceTargetKind: r.invoice_target_kind ?? undefined, invoiceTargetFirstName: r.invoice_target_first_name ?? undefined,
    invoiceTargetNameKana: r.invoice_target_name_kana ?? undefined,
    invoiceTargetPostcode: r.invoice_target_postcode ?? undefined, invoiceTargetPrefecture: r.invoice_target_prefecture ?? undefined,
    invoiceTargetCity: r.invoice_target_address_city ?? undefined, invoiceTargetStreet: r.invoice_target_address_street ?? undefined,
    invoiceTargetBuilding: r.invoice_target_address_building ?? undefined,
    issuerCompany: r.issuer_company ?? undefined, chargedOrg: r.charged_org ?? undefined, chargedUser: r.charged_user ?? undefined,
    productSetId: r.product_set_id ?? undefined, advancePayment: r.advance_payment ?? undefined,
  };
}

const SELECT = "*,fk_estimates(deceased_last_name,deceased_first_name,mourner_last_name,mourner_first_name),fk_customers(last_name,first_name)";

export async function listInvoices(): Promise<Invoice[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_invoices").select(SELECT).eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("billed_on", { ascending: false }).limit(3000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(map);
}

export async function getInvoice(id: string): Promise<{ invoice: Invoice; estimate: Estimate | null; details: InvoiceDetail[] } | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.from("fk_invoices").select(SELECT).eq("id", id).is("deleted_at", null).single();
  if (!data) return null;
  const invoice = map(data);
  const estimate = invoice.estimateId ? await getEstimate(invoice.estimateId) : null;
  const { data: det } = await c.from("fk_invoice_details").select("*").eq("invoice_id", id).order("sort_order", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const details = ((det ?? []) as any[]).map((d) => ({
    id: d.id, divideTitle: d.divide_title ?? undefined, title: d.title, tagName: d.tag_name ?? undefined,
    price: d.price ?? 0, priceIncludingTax: d.price_including_tax ?? undefined, tax: Number(d.tax ?? 0.1), quantity: Number(d.quantity ?? 1),
    amount: d.amount ?? 0, taxAmount: d.tax_amount ?? 0, amountIncludingTax: d.amount_including_tax ?? 0,
    supplier: d.supplier ?? undefined, categoryLarge: d.category_large ?? undefined, saleKind: d.sale_kind ?? undefined,
    isSetItem: !!d.is_set_item, hiddenPaper: !!d.hidden_paper,
  }));
  return { invoice, estimate, details };
}

// 顧客に紐づく請求書（customer_id 直接リレーション）
export async function listInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from("fk_invoices").select(SELECT).eq("funeral_home_id", KANRI_HOME_ID).eq("customer_id", customerId).is("deleted_at", null).order("billed_on", { ascending: false }).limit(10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(map);
}

export const INVOICE_STATUS_LABEL: Record<string, string> = { unpaid: "未入金", partial: "一部入金", paid: "入金済" };
