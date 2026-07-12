import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): { from: (t: string) => any; rpc: (n: string) => any } | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any; rpc: (n: string) => any };
}

export interface FlowerOrderInvoiceInput {
  memorialId: string;
  productName: string;
  unitPriceIncTax: number; // 供花商品の税込単価
  quantity: number;
  paymentMethod: string; // 請求書払い（銀行振込） / 当日現地払い
  invoiceName?: string; // 請求書・領収書宛名(指定時は請求先名に優先反映)
  orderer: { lastName: string; firstName?: string; kana?: string; company?: string; postcode?: string; prefecture?: string; city?: string; street?: string; building?: string; phone?: string; email?: string };
}

// オンライン供花注文 → 社内管理用の請求書(fk_invoices)を作成。
// 請求先種別は「オンライン供花注文」、請求先名=注文者。顧客は訃報(memorial)→見積→顧客で解決。
export async function createFlowerOrderInvoice(input: FlowerOrderInvoiceInput): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  const c = db();
  if (!c) return { ok: false, error: "db未設定" };
  // 訃報から 見積ID・顧客ID・故人/喪主名 を解決
  const { data: mem } = await c.from("memorials").select("id, estimate_id, announce_mourner_name").eq("id", input.memorialId).maybeSingle();
  let customerId: string | null = null;
  let constructionNo: string | null = null;
  let deceasedName: string | null = null;
  if (mem?.estimate_id) {
    const { data: est } = await c.from("fk_estimates").select("customer_id, estimate_no, deceased_last_name, deceased_first_name").eq("id", mem.estimate_id).maybeSingle();
    if (est) {
      customerId = est.customer_id ?? null;
      constructionNo = est.estimate_no ?? null;
      deceasedName = [est.deceased_last_name, est.deceased_first_name].filter(Boolean).join(" ") || null;
    }
  }
  if (!deceasedName) {
    const { data: dec } = await c.from("deceased").select("name_kanji").eq("memorial_id", input.memorialId).maybeSingle();
    deceasedName = dec?.name_kanji ?? null;
  }
  const mournerName = mem?.announce_mourner_name ? String(mem.announce_mourner_name).replace(/^喪主\s*/, "") : null;

  const inc = Math.round(input.unitPriceIncTax) * input.quantity;
  const ex = Math.round(input.unitPriceIncTax / 1.1) * input.quantity;
  const tax = inc - ex;

  const { data: no } = await c.rpc("next_invoice_no");
  const invoiceNo = typeof no === "string" ? no : `F${Date.now()}`;

  const o = input.orderer;
  // 請求先名: 「請求書・領収書宛名」が入力されていればそれを優先(会社名等)。無ければ注文者氏名。
  const invName = (input.invoiceName || "").trim();
  const targetName = invName || o.lastName || null;
  const targetFirst = invName ? null : (o.firstName || null);
  const deceasedForTitle = deceasedName ? `故${deceasedName}様　御葬儀　` : "";
  const title = `${deceasedForTitle}オンライン供花注文（${input.productName}）`;

  const { data: inv, error } = await c.from("fk_invoices").insert({
    funeral_home_id: KANRI_HOME_ID,
    invoice_no: invoiceNo, source_id: invoiceNo,
    customer_id: customerId,
    estimate_id: mem?.estimate_id ?? null,
    title,
    sale_category: "供花・供物",
    construction_no: constructionNo,
    deceased_name: deceasedName, mourner_name: mournerName,
    invoice_target_kind: "オンライン供花注文",
    invoice_target_name: targetName,
    invoice_target_first_name: targetFirst,
    invoice_target_postcode: o.postcode || null,
    invoice_target_prefecture: o.prefecture || null,
    invoice_target_address_city: o.city || null,
    invoice_target_address_street: o.street || null,
    invoice_target_address_building: o.building || null,
    billed_on: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10),
    total: inc, paid_total: 0, status: "unpaid",
    due_note: `お支払い方法：${input.paymentMethod}`,
  }).select("id").single();
  if (error || !inv) return { ok: false, error: error?.message ?? "請求書作成に失敗" };

  await c.from("fk_invoice_details").insert({
    invoice_id: inv.id,
    title: `${input.productName}（オンライン供花）`,
    price: Math.round(input.unitPriceIncTax / 1.1),
    price_including_tax: Math.round(input.unitPriceIncTax),
    tax: 0.1, quantity: input.quantity,
    amount: ex, tax_amount: tax, amount_including_tax: inc,
    sale_kind: "一般", category_large: "供花・供物", sort_order: 0,
  });
  return { ok: true, invoiceId: inv.id };
}
