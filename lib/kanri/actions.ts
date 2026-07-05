"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";
import { masterFields } from "./master-defs";

export type KanriResult = { ok: true; id: string } | { ok: false; error: string };

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}
function bool(fd: FormData, k: string): boolean {
  return fd.get(k) === "on" || fd.get(k) === "true";
}

export async function createCustomer(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  const lastName = s(fd, "last_name");
  if (!lastName) return { ok: false, error: "顧客氏は必須です。" };
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "DB未接続です。" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as unknown as { from: (t: string) => any };
  const bd = [s(fd, "birth_y"), s(fd, "birth_m"), s(fd, "birth_d")];
  const birthDate = bd.every(Boolean) ? `${bd[0]}-${String(bd[1]).padStart(2, "0")}-${String(bd[2]).padStart(2, "0")}` : null;

  // 顧客番号：空なら自動採番
  let customerNo = s(fd, "customer_no");
  if (!customerNo) customerNo = `C${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const row = {
    funeral_home_id: KANRI_HOME_ID,
    customer_no: customerNo,
    last_name: lastName, first_name: s(fd, "first_name"),
    last_name_kana: s(fd, "last_name_kana"), first_name_kana: s(fd, "first_name_kana"),
    status: s(fd, "status"), inflow: s(fd, "inflow"), staff_name: s(fd, "staff_name"),
    gender: s(fd, "gender"), birth_date: birthDate,
    telephone_number: s(fd, "telephone_number"), mobile_number: s(fd, "mobile_number"),
    fax_number: s(fd, "fax_number"), email: s(fd, "email"),
    available_sms_auto_sent: bool(fd, "available_sms_auto_sent"),
    available_dm_send: bool(fd, "available_dm_send"),
    available_mail_magazine: bool(fd, "available_mail_magazine"),
    postcode: s(fd, "postcode"), prefecture_code: s(fd, "prefecture_code"),
    address_city: s(fd, "address_city"), address_street: s(fd, "address_street"), address_building: s(fd, "address_building"),
    note: s(fd, "note"), rank: s(fd, "rank"), reason: s(fd, "reason"),
  };
  const { data, error } = await db.from("fk_customers").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  redirect(`/kanri/customers/${data.id}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function admin(): { from: (t: string) => any } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any };
}
function num(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (v == null) return null;
  const n = Number(v.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// ===== マスタ =====
export async function addMasterItem(fd: FormData): Promise<void> {
  const type = s(fd, "master_type");
  if (!type) return;
  const fields = masterFields(type);
  const row: Record<string, unknown> = { funeral_home_id: KANRI_HOME_ID, master_type: type, sort_order: 0 };
  const extra: Record<string, string> = {};
  for (const f of fields) {
    const v = s(fd, `f_${f.key}`);
    if (f.col === "name") row.name = v;
    else if (f.col === "kana") row.kana = v;
    else if (f.col === "price") row.price = v ? Number(v.replace(/,/g, "")) : null;
    else if (v != null) extra[f.key] = v;
  }
  if (!row.name) return; // 名称必須
  row.extra = extra;
  await admin().from("fk_master_items").insert(row);
  revalidatePath(`/kanri/settings/${type}`);
}
export async function saveCompanyInfo(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  const { COMPANY_FIELDS } = await import("./master-defs");
  const extra: Record<string, string> = {};
  for (const f of COMPANY_FIELDS) { const v = s(fd, `f_${f.key}`); if (v != null) extra[f.key] = v; }
  const c = admin();
  const { data: existing } = await c.from("fk_master_items").select("id").eq("funeral_home_id", KANRI_HOME_ID).eq("master_type", "company_info").is("deleted_at", null).limit(1).maybeSingle();
  if (existing) await c.from("fk_master_items").update({ extra, name: extra.company_name || "会社情報" }).eq("id", existing.id);
  else await c.from("fk_master_items").insert({ funeral_home_id: KANRI_HOME_ID, master_type: "company_info", name: extra.company_name || "会社情報", extra });
  revalidatePath("/kanri/settings/company");
  return { ok: true, id: "company" };
}

export async function deleteMasterItem(fd: FormData): Promise<void> {
  const id = s(fd, "id"); const type = s(fd, "master_type");
  if (!id) return;
  await admin().from("fk_master_items").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (type) revalidatePath(`/kanri/settings/${type}`);
}

// ===== 商品 =====
export async function saveProduct(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  const name = s(fd, "name");
  if (!name) return { ok: false, error: "商品名は必須です。" };
  const id = s(fd, "id");
  const row = {
    funeral_home_id: KANRI_HOME_ID,
    product_kind: s(fd, "product_kind"), name, kana: s(fd, "kana"),
    unit_price: num(fd, "unit_price") ?? 0, cost_price: num(fd, "cost_price"),
    tax_rate: num(fd, "tax_rate") ?? 0.1, unit: s(fd, "unit"), supplier: s(fd, "supplier"), note: s(fd, "note"),
  };
  const c = admin();
  if (id) {
    const { error } = await c.from("fk_products").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await c.from("fk_products").insert(row);
    if (error) return { ok: false, error: error.message };
  }
  redirect("/kanri/products");
}
export async function importProducts(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  let rows: Record<string, string>[] = [];
  try { rows = JSON.parse(s(fd, "rows") ?? "[]"); } catch { return { ok: false, error: "CSVの解析に失敗しました。" }; }
  const g = (r: Record<string, string>, ...k: string[]) => { for (const x of k) { if (r[x] != null && r[x] !== "") return r[x].trim(); } return null; };
  const payload = rows.filter((r) => g(r, "商品名", "name")).map((r) => ({
    funeral_home_id: KANRI_HOME_ID,
    product_kind: g(r, "商品種別"), name: g(r, "商品名", "name"), kana: g(r, "カナ"),
    unit_price: Number(g(r, "単価")?.replace(/,/g, "") ?? 0) || 0,
    cost_price: g(r, "原価") ? Number(g(r, "原価")!.replace(/,/g, "")) : null,
    tax_rate: Number(g(r, "税率") ?? 0.1) || 0.1,
    unit: g(r, "単位"), supplier: g(r, "発注先"), note: g(r, "備考"),
  }));
  if (payload.length === 0) return { ok: false, error: "取り込む商品がありません（商品名が必須）。" };
  const { error } = await admin().from("fk_products").insert(payload);
  if (error) return { ok: false, error: error.message };
  redirect("/kanri/products");
}
export async function deleteProduct(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  if (!id) return;
  await admin().from("fk_products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/kanri/products");
}

export async function updateCustomer(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  const id = s(fd, "id");
  const lastName = s(fd, "last_name");
  if (!id) return { ok: false, error: "対象が不明です。" };
  if (!lastName) return { ok: false, error: "顧客氏は必須です。" };
  const bd = [s(fd, "birth_y"), s(fd, "birth_m"), s(fd, "birth_d")];
  const birthDate = bd.every(Boolean) ? `${bd[0]}-${String(bd[1]).padStart(2, "0")}-${String(bd[2]).padStart(2, "0")}` : null;
  const row = {
    customer_no: s(fd, "customer_no"), last_name: lastName, first_name: s(fd, "first_name"),
    last_name_kana: s(fd, "last_name_kana"), first_name_kana: s(fd, "first_name_kana"),
    status: s(fd, "status"), inflow: s(fd, "inflow"), staff_name: s(fd, "staff_name"),
    gender: s(fd, "gender"), birth_date: birthDate,
    telephone_number: s(fd, "telephone_number"), mobile_number: s(fd, "mobile_number"),
    fax_number: s(fd, "fax_number"), email: s(fd, "email"),
    available_sms_auto_sent: bool(fd, "available_sms_auto_sent"), available_dm_send: bool(fd, "available_dm_send"), available_mail_magazine: bool(fd, "available_mail_magazine"),
    postcode: s(fd, "postcode"), prefecture_code: s(fd, "prefecture_code"), address_city: s(fd, "address_city"),
    address_street: s(fd, "address_street"), address_building: s(fd, "address_building"),
    note: s(fd, "note"), rank: s(fd, "rank"), reason: s(fd, "reason"),
  };
  const { error } = await admin().from("fk_customers").update(row).eq("id", id);
  if (error) return { ok: false, error: error.message };
  redirect(`/kanri/customers/${id}`);
}

export async function deleteCustomer(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  if (!id) return;
  await admin().from("fk_customers").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/kanri/customers");
}

// ===== 顧客 CSV一括取り込み =====
export async function importCustomers(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  let rows: Record<string, string>[] = [];
  try { rows = JSON.parse(s(fd, "rows") ?? "[]"); } catch { return { ok: false, error: "CSVの解析に失敗しました。" }; }
  rows = rows.filter((r) => (r["氏"] || r["顧客氏"] || r["last_name"] || "").trim());
  if (rows.length === 0) return { ok: false, error: "取り込む行がありません（氏が必須）。" };
  const g = (r: Record<string, string>, ...keys: string[]) => { for (const k of keys) { if (r[k] != null && r[k] !== "") return r[k].trim(); } return null; };
  const payload = rows.map((r) => ({
    funeral_home_id: KANRI_HOME_ID,
    customer_no: g(r, "顧客番号"), last_name: g(r, "氏", "顧客氏", "last_name"), first_name: g(r, "名", "顧客名"),
    last_name_kana: g(r, "セイ", "顧客セイ"), first_name_kana: g(r, "メイ", "顧客メイ"),
    status: g(r, "ステータス"), inflow: g(r, "流入経路"), gender: g(r, "性別"),
    telephone_number: g(r, "自宅番号"), mobile_number: g(r, "携帯番号"), email: g(r, "メールアドレス"),
    postcode: g(r, "郵便番号"), prefecture_code: g(r, "都道府県"), address_city: g(r, "市区町村"),
    address_street: g(r, "番地"), address_building: g(r, "建物名"), note: g(r, "備考"),
  }));
  const { error } = await admin().from("fk_customers").insert(payload);
  if (error) return { ok: false, error: error.message };
  redirect("/kanri/customers");
}

// ===== 顧客 対応履歴 =====
export async function addCustomerNote(fd: FormData): Promise<void> {
  const customerId = s(fd, "customer_id");
  const body = s(fd, "body");
  if (!customerId || !body) return;
  await admin().from("fk_customer_notes").insert({
    funeral_home_id: KANRI_HOME_ID, customer_id: customerId, kind: s(fd, "kind"), body, created_by: "松澤 覚",
  });
  revalidatePath(`/kanri/customers/${customerId}`);
}
// ===== 顧客ダブりチェック =====
// 統合: survivor_id に他のidを統合（FK付け替え＋他をソフト削除）
export async function mergeCustomers(fd: FormData): Promise<void> {
  const survivor = s(fd, "survivor_id");
  const ids = fd.getAll("id").map((v) => String(v)).filter((v) => v && v !== survivor);
  if (!survivor || ids.length === 0) return;
  const c = admin();
  // 関連レコードを survivor に付け替え
  await c.from("fk_estimates").update({ customer_id: survivor }).in("customer_id", ids);
  await c.from("fk_customer_notes").update({ customer_id: survivor }).in("customer_id", ids);
  // 残りをソフト削除
  await c.from("fk_customers").update({ deleted_at: new Date().toISOString() }).in("id", ids);
  revalidatePath("/kanri/customers/duplicates");
}

// ダブり対象から除外（グループ内全員に除外フラグ）
export async function excludeFromDedup(fd: FormData): Promise<void> {
  const ids = fd.getAll("id").map((v) => String(v)).filter(Boolean);
  if (ids.length === 0) return;
  await admin().from("fk_customers").update({ dedup_excluded: true }).in("id", ids);
  revalidatePath("/kanri/customers/duplicates");
}

export async function deleteCustomerFromDedup(fd: FormData): Promise<void> {
  const id = s(fd, "del_id");
  if (!id) return;
  await admin().from("fk_customers").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/kanri/customers/duplicates");
}

export async function deleteCustomerNote(fd: FormData): Promise<void> {
  const id = s(fd, "id"); const customerId = s(fd, "customer_id");
  if (!id) return;
  await admin().from("fk_customer_notes").delete().eq("id", id);
  if (customerId) revalidatePath(`/kanri/customers/${customerId}`);
}

// ===== 見積 =====
function dt(fd: FormData, k: string): string | null {
  const v = s(fd, k);
  if (!v) return null;
  // datetime-local (YYYY-MM-DDTHH:mm) を +09:00 として保存
  return /T/.test(v) ? `${v}:00+09:00` : v;
}

interface RawItem { productId?: string | null; lineKind: "item" | "discount"; name: string; unitPrice: number; quantity: number; taxRate: number }

export async function saveEstimate(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  const c = admin();
  const id = s(fd, "id");
  let items: RawItem[] = [];
  try { items = JSON.parse(s(fd, "items") ?? "[]"); } catch { items = []; }
  items = items.filter((it) => it && it.name && (it.unitPrice || it.quantity));

  let subtotal = 0, discountTotal = 0, taxTotal = 0;
  const computed = items.map((it, i) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const amount = it.lineKind === "discount" ? -Math.abs(price * qty) : price * qty;
    const rate = Number(it.taxRate) || 0;
    if (it.lineKind === "discount") discountTotal += Math.abs(amount); else subtotal += amount;
    taxTotal += amount * rate;
    return { product_id: it.productId || null, line_kind: it.lineKind, name: it.name, unit_price: price, quantity: qty, tax_rate: rate, amount, sort_order: i };
  });
  taxTotal = Math.round(taxTotal);
  const total = subtotal - discountTotal + taxTotal;

  // 施行番号(見積番号)の自動採番（未指定・新規時）
  let estimateNo = s(fd, "estimate_no");
  if (!estimateNo && !id) {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    estimateNo = `E${ymd}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  }
  const row = {
    funeral_home_id: KANRI_HOME_ID,
    estimate_no: estimateNo,
    customer_id: s(fd, "customer_id"),
    title: s(fd, "title"), memo: s(fd, "memo"),
    estimate_on: s(fd, "estimate_on"), estimate_limit_on: s(fd, "estimate_limit_on"),
    kind: s(fd, "kind") ?? "funeral",
    deceased_last_name: s(fd, "deceased_last_name"), deceased_first_name: s(fd, "deceased_first_name"),
    deceased_last_name_kana: s(fd, "deceased_last_name_kana"), deceased_first_name_kana: s(fd, "deceased_first_name_kana"),
    deceased_gender: s(fd, "deceased_gender"), deceased_birth_date: s(fd, "deceased_birth_date"),
    deceased_death_date: s(fd, "deceased_death_date"), deceased_age: num(fd, "deceased_age"),
    mourner_last_name: s(fd, "mourner_last_name"), mourner_first_name: s(fd, "mourner_first_name"),
    mourner_kana: s(fd, "mourner_kana"), mourner_relation: s(fd, "mourner_relation"),
    mourner_phone: s(fd, "mourner_phone"), mourner_postcode: s(fd, "mourner_postcode"), mourner_prefecture: s(fd, "mourner_prefecture"),
    mourner_address_city: s(fd, "mourner_address_city"), mourner_address_street: s(fd, "mourner_address_street"), mourner_address_building: s(fd, "mourner_address_building"),
    religion: s(fd, "religion"), wake_at: dt(fd, "wake_at"), funeral_at: dt(fd, "funeral_at"),
    venue_name: s(fd, "venue_name"), venue_address: s(fd, "venue_address"), crematorium_name: s(fd, "crematorium_name"),
    subtotal, discount_total: discountTotal, tax_total: taxTotal, total, advance_payment: num(fd, "advance_payment") ?? 0,
  };

  let estimateId = id;
  if (id) {
    const { error } = await c.from("fk_estimates").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await c.from("fk_estimate_items").delete().eq("estimate_id", id);
  } else {
    const { data, error } = await c.from("fk_estimates").insert(row).select("id").single();
    if (error) return { ok: false, error: error.message };
    estimateId = data.id;
  }
  if (computed.length) {
    const { error } = await c.from("fk_estimate_items").insert(computed.map((x) => ({ ...x, estimate_id: estimateId })));
    if (error) return { ok: false, error: error.message };
  }
  redirect(`/kanri/estimates/${estimateId}`);
}

export async function deleteEstimate(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  if (!id) return;
  await admin().from("fk_estimates").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  redirect("/kanri/estimates");
}

// ===== 訃報案内連携: 見積の故人・喪主・日程から訃報案内(memorials)を作成 =====
const RELIGION_MAP: Record<string, string> = { "仏式": "仏式", "浄土真宗": "浄土真宗", "神式": "神式", "神道": "神式", "キリスト教": "キリスト教式", "キリスト教式": "キリスト教式", "無宗教": "無宗教" };

export async function createMemorialFromEstimate(fd: FormData): Promise<void> {
  const estimateId = s(fd, "id");
  if (!estimateId) return;
  const c = admin();
  const { data: e } = await c.from("fk_estimates").select("*").eq("id", estimateId).single();
  if (!e) return;

  // slug（推測不能）
  const slug = (globalThis.crypto?.randomUUID?.() ?? `est-${estimateId}`).replace(/-/g, "").slice(0, 24);
  const mournerName = [e.mourner_last_name, e.mourner_first_name].filter(Boolean).join(" ");
  const religion = RELIGION_MAP[(e.religion ?? "").trim()] ?? "仏式";

  const { data: mem, error: me } = await c.from("memorials").insert({
    funeral_home_id: KANRI_HOME_ID, slug, status: "draft", access_level: "unlisted", noindex_flag: true,
    religion_type: religion, koden_decline: true,
    obituary_title: "訃報", announce_mourner_name: mournerName ? `喪主 ${mournerName}` : null,
  }).select("id").single();
  if (me || !mem) return;
  const mid = mem.id;

  await c.from("deceased").insert({
    memorial_id: mid,
    name_kanji: [e.deceased_last_name, e.deceased_first_name].filter(Boolean).join(" ") || "—",
    name_kana: [e.deceased_last_name_kana, e.deceased_first_name_kana].filter(Boolean).join(" ") || null,
    age_kazoe: e.deceased_age ?? null, death_date: e.deceased_death_date ?? null,
    relation_to_mourner: e.mourner_relation ?? null,
  });

  const events: Record<string, unknown>[] = [];
  if (e.wake_at) events.push({ memorial_id: mid, event_type: "通夜", start_at: e.wake_at, venue_name: e.venue_name ?? null, venue_address: e.venue_address ?? null, sort_order: 0 });
  if (e.funeral_at) events.push({ memorial_id: mid, event_type: "葬儀", start_at: e.funeral_at, venue_name: e.venue_name ?? null, venue_address: e.venue_address ?? null, sort_order: 1 });
  if (events.length) await c.from("funeral_events").insert(events);

  await c.from("fk_estimates").update({ memorial_id: mid }).eq("id", estimateId);
  redirect(`/admin/ceremonies/${slug}`);
}

// ===== 請求 =====
export async function createInvoiceFromEstimate(fd: FormData): Promise<void> {
  const estimateId = s(fd, "id");
  if (!estimateId) return;
  const c = admin();
  const { data: e } = await c.from("fk_estimates").select("total").eq("id", estimateId).single();
  if (!e) return;
  const today = new Date().toISOString().slice(0, 10);
  const { data: inv, error } = await c.from("fk_invoices").insert({
    funeral_home_id: KANRI_HOME_ID, estimate_id: estimateId, total: e.total ?? 0, status: "unpaid", billed_on: today,
  }).select("id").single();
  if (error || !inv) return;
  redirect(`/kanri/billing/${inv.id}`);
}

export async function recordPayment(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  const amount = num(fd, "amount") ?? 0;
  if (!id) return;
  const c = admin();
  const { data: inv } = await c.from("fk_invoices").select("total,paid_total").eq("id", id).single();
  if (!inv) return;
  const paid = (inv.paid_total ?? 0) + amount;
  const status = paid <= 0 ? "unpaid" : paid >= (inv.total ?? 0) ? "paid" : "partial";
  await c.from("fk_invoices").update({ paid_total: paid, status }).eq("id", id);
  revalidatePath(`/kanri/billing/${id}`);
}

// 入金合計から請求書のpaid_total/statusを再計算
async function recalcInvoice(c: ReturnType<typeof admin>, invoiceId: string) {
  const { data: pays } = await c.from("fk_payments").select("amount").eq("invoice_id", invoiceId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paid = ((pays ?? []) as any[]).reduce((a, p) => a + (p.amount ?? 0), 0);
  const { data: inv } = await c.from("fk_invoices").select("total").eq("id", invoiceId).single();
  const total = inv?.total ?? 0;
  const status = paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";
  await c.from("fk_invoices").update({ paid_total: paid, status }).eq("id", invoiceId);
}

// ===== 伝票発行（入金伝票＋入金明細） =====
export async function createPaymentSlip(fd: FormData): Promise<void> {
  const invoiceId = s(fd, "invoice_id");
  if (!invoiceId) return;
  const c = admin();
  const today = new Date().toISOString().slice(0, 10);
  let slipNo = s(fd, "slip_no");
  if (!slipNo) slipNo = `D${today.replace(/-/g, "")}${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const { data: slip, error } = await c.from("fk_payment_slips").insert({
    funeral_home_id: KANRI_HOME_ID, invoice_id: invoiceId,
    source: s(fd, "source"), slip_kind: s(fd, "slip_kind"), performance_no: s(fd, "performance_no"),
    slip_no: slipNo, issued_on: s(fd, "issued_on") ?? today,
    addressee: s(fd, "addressee"), honorific: s(fd, "honorific") ?? "様", note: s(fd, "note"),
    issuer_company: s(fd, "issuer_company"), transfer_name: s(fd, "transfer_name"),
    summary: s(fd, "summary"), remark: s(fd, "remark"),
  }).select("id").single();
  if (error || !slip) return;

  // 入金明細（動的行）: amount[], paid_on[], method[], category[]
  const amounts = fd.getAll("amount").map((v) => Number(String(v).replace(/,/g, "")));
  const paidOns = fd.getAll("paid_on").map((v) => String(v));
  const methods = fd.getAll("method").map((v) => String(v));
  const categories = fd.getAll("category").map((v) => String(v));
  const rows = amounts.map((amount, i) => ({
    slip_id: slip.id, invoice_id: invoiceId, amount: isNaN(amount) ? 0 : amount,
    paid_on: paidOns[i] || null, method: methods[i] || null, category: categories[i] || null, sort_order: i,
  })).filter((r) => r.amount !== 0 || r.paid_on);
  if (rows.length) await c.from("fk_payments").insert(rows);

  await recalcInvoice(c, invoiceId);
  redirect(`/kanri/billing/${invoiceId}`);
}

export async function deletePaymentSlip(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  const invoiceId = s(fd, "invoice_id");
  if (!id || !invoiceId) return;
  const c = admin();
  await c.from("fk_payment_slips").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  await c.from("fk_payments").delete().eq("slip_id", id);
  await recalcInvoice(c, invoiceId);
  revalidatePath(`/kanri/billing/${invoiceId}`);
}

// ===== 発注（見積の商品を発注先ごとにまとめて発注） =====
export async function createPurchaseOrdersFromEstimate(fd: FormData): Promise<void> {
  const estimateId = s(fd, "id");
  if (!estimateId) return;
  const c = admin();
  const { data: items } = await c.from("fk_estimate_items").select("name,unit_price,quantity,line_kind,fk_products(supplier,cost_price)").eq("estimate_id", estimateId);
  if (!items) return;
  const today = new Date().toISOString().slice(0, 10);
  // 発注先ごとにグループ化（原価があれば原価、なければ売価）
  const groups = new Map<string, { name: string; unit_price: number; quantity: number; amount: number }[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const it of items as any[]) {
    if (it.line_kind !== "item") continue;
    const prod = Array.isArray(it.fk_products) ? it.fk_products[0] : it.fk_products;
    const supplier = prod?.supplier || "未設定";
    const unit = prod?.cost_price ?? it.unit_price ?? 0;
    const qty = it.quantity ?? 1;
    if (!groups.has(supplier)) groups.set(supplier, []);
    groups.get(supplier)!.push({ name: it.name, unit_price: unit, quantity: qty, amount: unit * qty });
  }
  for (const [supplier, rows] of groups) {
    const total = rows.reduce((a, r) => a + r.amount, 0);
    const { data: po } = await c.from("fk_purchase_orders").insert({
      funeral_home_id: KANRI_HOME_ID, estimate_id: estimateId, supplier, ordered_on: today, status: "ordered", total,
    }).select("id").single();
    if (po) await c.from("fk_purchase_order_items").insert(rows.map((r, i) => ({ ...r, order_id: po.id, sort_order: i })));
  }
  redirect("/kanri/orders");
}
export async function markOrderDelivered(fd: FormData): Promise<void> {
  const id = s(fd, "id"); if (!id) return;
  await admin().from("fk_purchase_orders").update({ status: "delivered", delivered_on: new Date().toISOString().slice(0, 10) }).eq("id", id);
  revalidatePath(`/kanri/orders/${id}`); revalidatePath("/kanri/orders");
}
export async function toggleOrderPaid(fd: FormData): Promise<void> {
  const id = s(fd, "id"); const paid = s(fd, "paid") === "1"; if (!id) return;
  await admin().from("fk_purchase_orders").update({ payment_status: paid ? "paid" : "unpaid" }).eq("id", id);
  revalidatePath(`/kanri/orders/${id}`); revalidatePath("/kanri/orders");
}
export async function deletePurchaseOrder(fd: FormData): Promise<void> {
  const id = s(fd, "id"); if (!id) return;
  await admin().from("fk_purchase_orders").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  redirect("/kanri/orders");
}

// ===== SMS（送信ログ記録。実送信は外部プロバイダ連携時に差し替え） =====
export async function sendSms(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  const phone = s(fd, "phone");
  const body = s(fd, "body");
  if (!phone || !body) return { ok: false, error: "電話番号と本文は必須です。" };
  const { error } = await admin().from("fk_sms_logs").insert({
    funeral_home_id: KANRI_HOME_ID, customer_id: s(fd, "customer_id"), phone, body, status: "sent",
  });
  if (error) return { ok: false, error: error.message };
  redirect("/kanri/sms?sent=1");
}
