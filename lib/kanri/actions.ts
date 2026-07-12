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
// 請求書番号を連番採番（スマート葬儀と同方式・移植済み最大値の次から）。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function nextInvoiceNo(c: any): Promise<string | null> {
  const { data } = await c.rpc("next_invoice_no");
  return typeof data === "string" ? data : null;
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

export async function updateMasterItem(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  const type = s(fd, "master_type");
  if (!id || !type) return;
  const fields = masterFields(type);
  const row: Record<string, unknown> = {};
  const extra: Record<string, string | null> = {};
  for (const f of fields) {
    const v = s(fd, `f_${f.key}`);
    if (f.col === "name") row.name = v;
    else if (f.col === "kana") row.kana = v;
    else if (f.col === "price") row.price = v ? Number(v.replace(/,/g, "")) : null;
    else extra[f.key] = v;
  }
  if (row.name === null) return; // 名称は空にできない
  // 既存extraにマージ（fields外のキーを保持）
  const c = admin();
  const { data: cur } = await c.from("fk_master_items").select("name,extra").eq("id", id).maybeSingle();
  const oldName = cur?.name as string | undefined;
  row.extra = { ...(cur?.extra ?? {}), ...extra };
  await c.from("fk_master_items").update(row).eq("id", id);

  // 名称変更を、その名称で登録された商品/子カテゴリへ連動反映（非正規化のため手動カスケード）
  const newName = row.name as string;
  if (oldName && newName && oldName !== newName) {
    if (type === "product_kind") {
      // 商品の種別名
      await c.from("fk_products").update({ product_kind: newName }).eq("funeral_home_id", KANRI_HOME_ID).eq("product_kind", oldName);
      // 子カテゴリマスタの親参照（extra.parent）
      const { data: subs } = await c.from("fk_master_items").select("id,extra").eq("funeral_home_id", KANRI_HOME_ID).eq("master_type", "product_sub_kind").is("deleted_at", null);
      for (const sub of (subs ?? []) as { id: string; extra: Record<string, string> | null }[]) {
        if (sub.extra?.parent === oldName) await c.from("fk_master_items").update({ extra: { ...sub.extra, parent: newName } }).eq("id", sub.id);
      }
      revalidatePath("/kanri/settings/product_sub_kind");
    } else if (type === "product_sub_kind") {
      // 商品の子カテゴリ名（同名の他親と衝突しないよう親種別で限定）
      const parent = (row.extra as Record<string, string>)?.parent;
      let q = c.from("fk_products").update({ product_sub_kind: newName }).eq("funeral_home_id", KANRI_HOME_ID).eq("product_sub_kind", oldName);
      if (parent) q = q.eq("product_kind", parent);
      await q;
    }
    revalidatePath("/kanri/products");
  }
  revalidatePath(`/kanri/settings/${type}`);
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
    product_kind: s(fd, "product_kind"), product_sub_kind: s(fd, "product_sub_kind"), name, kana: s(fd, "kana"),
    unit_price: num(fd, "unit_price") ?? 0, cost_price: num(fd, "cost_price"),
    tax_rate: num(fd, "tax_rate") ?? 0.1, unit: s(fd, "unit"), supplier: s(fd, "supplier"), note: s(fd, "note"),
    // 実スマート葬儀の商品フィールド
    product_code: s(fd, "product_code"), model_code: s(fd, "model_code"),
    cost_tax: num(fd, "cost_tax") ?? 0.1, deduction: s(fd, "deduction"),
    refundable: bool(fd, "refundable"), description: s(fd, "description"), remarks: s(fd, "remarks"),
    available_ec: bool(fd, "available_ec"), available_homepage: bool(fd, "available_homepage"),
    available_attendant: bool(fd, "available_attendant"), available_returned_item: bool(fd, "available_returned_item"),
    available_item: bool(fd, "available_item"), grouped: bool(fd, "grouped"),
    not_ordering: bool(fd, "not_ordering"), order_only: bool(fd, "order_only"),
    hidden_picking: bool(fd, "hidden_picking"), hidden: bool(fd, "hidden"),
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
// ===== セット商品 =====
export async function saveProductSet(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  const name = s(fd, "name");
  if (!name) return { ok: false, error: "セット名は必須です。" };
  const id = s(fd, "id");
  const c = admin();
  const row = {
    funeral_home_id: KANRI_HOME_ID,
    code: s(fd, "code"), name, description: s(fd, "description"),
    price: num(fd, "price") ?? 0, tax_included_price: num(fd, "tax_included_price") ?? 0,
    tax: num(fd, "tax") ?? 0.1, hidden: bool(fd, "hidden"),
  };
  let setId = id;
  if (id) {
    const { error } = await c.from("fk_product_sets").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await c.from("fk_product_set_items").delete().eq("set_id", id);
  } else {
    const { data, error } = await c.from("fk_product_sets").insert(row).select("id").single();
    if (error) return { ok: false, error: error.message };
    setId = data.id;
  }
  // 内訳: product_id[], quantity[]
  const productIds = fd.getAll("item_product_id").map((v) => String(v));
  const quantities = fd.getAll("item_quantity").map((v) => Number(String(v)) || 1);
  const items = productIds.map((pid, i) => ({ set_id: setId, product_id: pid || null, quantity: quantities[i] ?? 1, sort_order: i })).filter((x) => x.product_id);
  if (items.length) await c.from("fk_product_set_items").insert(items);
  redirect("/kanri/product-sets");
}
export async function deleteProductSet(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  if (!id) return;
  await admin().from("fk_product_sets").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/kanri/product-sets");
}

export async function importProducts(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  let rows: Record<string, string>[] = [];
  try { rows = JSON.parse(s(fd, "rows") ?? "[]"); } catch { return { ok: false, error: "CSVの解析に失敗しました。" }; }
  const g = (r: Record<string, string>, ...k: string[]) => { for (const x of k) { if (r[x] != null && r[x] !== "") return r[x].trim(); } return null; };
  // 実スマート葬儀「商品一括登録フォーマット」のヘッダー名に対応（旧フォーマットも受容）
  const rate = (v: string | null) => {
    if (v == null || v === "") return 0.1;
    if (v.includes("非") || v === "0") return 0;
    if (v.includes("8")) return 0.08;
    const x = Number(v);
    return !isNaN(x) && x > 0 && x < 1 ? x : 0.1;
  };
  const payload = rows.filter((r) => g(r, "商品名", "name")).map((r) => ({
    funeral_home_id: KANRI_HOME_ID,
    product_kind: g(r, "商品種別:大", "商品種別"), name: g(r, "商品名", "name"), kana: g(r, "カナ"),
    unit_price: Number(g(r, "価格(税抜)", "単価", "価格")?.replace(/,/g, "") ?? 0) || 0,
    cost_price: g(r, "下代(税抜)", "原価") ? Number(g(r, "下代(税抜)", "原価")!.replace(/,/g, "")) : null,
    tax_rate: rate(g(r, "税率")),
    unit: g(r, "単位"), supplier: g(r, "発注先"), note: g(r, "商品説明", "備考"),
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
  const yes = (v: string | null) => v != null && ["1", "true", "はい", "する", "受け取る", "○", "〇"].includes(v);
  const payload = rows.map((r) => ({
    funeral_home_id: KANRI_HOME_ID,
    customer_no: g(r, "顧客番号"), last_name: g(r, "氏", "顧客氏", "last_name"), first_name: g(r, "名", "顧客名"),
    last_name_kana: g(r, "氏（カナ）", "セイ", "顧客セイ"), first_name_kana: g(r, "名（カナ）", "メイ", "顧客メイ"),
    status: g(r, "状態", "ステータス"), inflow: g(r, "流入経路"), staff_name: g(r, "顧客担当"), gender: g(r, "性別"),
    birth_date: (() => { const v = g(r, "生年月日"); return v && /\d/.test(v) ? v.replace(/\//g, "-").slice(0, 10) : null; })(),
    telephone_number: g(r, "自宅番号"), mobile_number: g(r, "携帯番号"), fax_number: g(r, "FAX番号"), email: g(r, "メールアドレス"),
    available_sms_auto_sent: yes(g(r, "SMS自動送信対象にする")),
    available_dm_send: yes(g(r, "ダイレクトメールを受け取る")),
    available_mail_magazine: yes(g(r, "メルマガを受け取る")),
    postcode: g(r, "郵便番号"), prefecture_code: g(r, "都道府県"), address_city: g(r, "市区町村"),
    address_street: g(r, "番地"), address_building: g(r, "建物など", "建物名"),
    note: g(r, "その他備考", "備考"), reason: g(r, "問い合わせ理由"), rank: g(r, "顧客ランク"),
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
// ===== アプリ設定（項目表示/必須/通知/サービス利用料 等） =====
// fk_master_items master_type="app_setting" name=設定キー extra=値JSON で保存
export async function saveAppSetting(fd: FormData): Promise<void> {
  const key = s(fd, "setting_key");
  const back = s(fd, "back") ?? "/kanri/settings";
  if (!key) return;
  const c = admin();
  const extra: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (["setting_key", "back"].includes(k) || typeof v !== "string") continue;
    if (extra[k] != null) extra[k] += "," + v; else extra[k] = v;
  }
  const { data: exist } = await c.from("fk_master_items").select("id").eq("funeral_home_id", KANRI_HOME_ID).eq("master_type", "app_setting").eq("name", key).is("deleted_at", null).limit(1).maybeSingle();
  if (exist) await c.from("fk_master_items").update({ extra }).eq("id", exist.id);
  else await c.from("fk_master_items").insert({ funeral_home_id: KANRI_HOME_ID, master_type: "app_setting", name: key, extra });
  revalidatePath(back);
  redirect(back);
}

// ===== 関連顧客 =====
export async function addRelatedCustomer(fd: FormData): Promise<void> {
  const customerId = s(fd, "customer_id");
  const relatedId = s(fd, "related_customer_id");
  if (!customerId || !relatedId || customerId === relatedId) return;
  await admin().from("fk_related_customers").insert({
    funeral_home_id: KANRI_HOME_ID, customer_id: customerId, related_customer_id: relatedId, relation: s(fd, "relation"),
  });
  revalidatePath(`/kanri/customers/${customerId}`);
}
export async function deleteRelatedCustomer(fd: FormData): Promise<void> {
  const id = s(fd, "id"); const customerId = s(fd, "customer_id");
  if (!id) return;
  await admin().from("fk_related_customers").delete().eq("id", id);
  if (customerId) revalidatePath(`/kanri/customers/${customerId}`);
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
  // 請求書追加モード: 見積＋請求書を同時作成して請求書へ遷移
  if (bool(fd, "create_invoice")) {
    const invoiceNo = await nextInvoiceNo(c);
    const { data: inv } = await c.from("fk_invoices").insert({
      funeral_home_id: KANRI_HOME_ID, estimate_id: estimateId, invoice_no: invoiceNo, source_id: invoiceNo, total, status: "unpaid",
      billed_on: s(fd, "billed_on") ?? s(fd, "estimate_on") ?? new Date().toISOString().slice(0, 10),
      due_on: s(fd, "due_on"),
    }).select("id").single();
    if (inv) redirect(`/kanri/billing/${inv.id}`);
  }
  redirect(`/kanri/estimates/${estimateId}`);
}

export async function deleteEstimate(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  if (!id) return;
  await admin().from("fk_estimates").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/kanri/estimates");
  redirect("/kanri/estimates");
}

export async function deleteInvoice(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  if (!id) return;
  await admin().from("fk_invoices").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/kanri/billing");
  redirect("/kanri/billing");
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
// 見積→請求書: 既に請求書があればその編集画面へ、無ければ見積内容をプレフィルした新規作成画面へ。
// (旧実装は合計だけの空請求書をその場でINSERTしていたため、顧客/件名/明細の無い請求書が量産されていた)
export async function createInvoiceFromEstimate(fd: FormData): Promise<void> {
  const estimateId = s(fd, "id");
  if (!estimateId) return;
  const c = admin();
  const { data: inv } = await c.from("fk_invoices").select("id").eq("estimate_id", estimateId).is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (inv) redirect(`/kanri/billing/${inv.id}/edit`);
  redirect(`/kanri/billing/new?from_estimate=${estimateId}`);
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

// ===== 見積/請求 作成（実スマート葬儀フォーム準拠: 顧客直結・宛名/請求先・セット商品） =====
type FullItem = {
  lineKind: "item" | "discount"; productId?: string | null; name: string;
  unitPrice: number; quantity: number; taxRate: number;
  isSetItem?: boolean; hidden?: boolean;
  tagName?: string | null; cost?: number; discount?: number;
  deposit?: boolean; refundable?: boolean;
  tradedOn?: string | null; returnedQty?: number; remarks?: string | null; divideTitle?: string | null;
};

async function resolveCustomerId(c: ReturnType<typeof admin>, fd: FormData): Promise<string | null> {
  let customerId = s(fd, "customer_id");
  if (!customerId && bool(fd, "create_customer")) {
    const last = s(fd, "new_customer_last_name");
    if (last) {
      const customerNo = `C${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const { data } = await c.from("fk_customers").insert({
        funeral_home_id: KANRI_HOME_ID, customer_no: customerNo,
        last_name: last, first_name: s(fd, "new_customer_first_name"),
        postcode: s(fd, "new_customer_postcode"), prefecture_code: s(fd, "new_customer_prefecture"),
        address_city: s(fd, "new_customer_city"), address_street: s(fd, "new_customer_street"),
        telephone_number: s(fd, "new_customer_tel"), mobile_number: s(fd, "new_customer_mobile"),
        email: s(fd, "new_customer_email"),
      }).select("id").single();
      customerId = data?.id ?? null;
    }
  }
  return customerId;
}

function addresseeCols(fd: FormData) {
  return {
    addressee_kind: s(fd, "addressee_kind") ?? "喪主",
    addressee_last_name: s(fd, "addressee_last_name"), addressee_first_name: s(fd, "addressee_first_name"),
    addressee_honorific: s(fd, "addressee_honorific") ?? "様",
    addressee_last_name_kana: s(fd, "addressee_last_name_kana"), addressee_first_name_kana: s(fd, "addressee_first_name_kana"),
    addressee_postcode: s(fd, "addressee_postcode"), addressee_prefecture: s(fd, "addressee_prefecture"),
    addressee_address_city: s(fd, "addressee_address_city"), addressee_address_street: s(fd, "addressee_address_street"),
    addressee_address_building: s(fd, "addressee_address_building"),
  };
}

function computeItems(fd: FormData) {
  let items: FullItem[] = [];
  try { items = JSON.parse(s(fd, "items") ?? "[]"); } catch { /* noop */ }
  let subtotal = 0, discountTotal = 0, taxTotal = 0;
  const computed = items.map((it, i) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const disc = Number(it.discount) || 0;
    // 割引(税抜)は行金額から控除
    const amount = it.lineKind === "discount" ? -Math.abs(price * qty) : Math.max(0, price * qty - disc);
    const rate = Number(it.taxRate) || 0;
    if (it.lineKind === "discount") discountTotal += Math.abs(amount); else subtotal += amount;
    taxTotal += amount * rate;
    return {
      product_id: it.productId || null, line_kind: it.lineKind, name: it.name, unit_price: price, quantity: qty, tax_rate: rate, amount, sort_order: i,
      is_set_item: !!it.isSetItem, hidden_paper: !!it.hidden,
      tag_name: it.tagName ?? null, cost: Number(it.cost) || 0, discount: disc,
      deposit: !!it.deposit, refundable: !!it.refundable,
      traded_on: it.tradedOn ?? null, returned_quantity: Number(it.returnedQty) || 0,
      remarks: it.remarks ?? null, divide_title: it.divideTitle ?? null,
    };
  });
  taxTotal = Math.round(taxTotal);
  return { computed, subtotal, discountTotal, taxTotal, total: subtotal - discountTotal + taxTotal };
}

export async function saveEstimateFull(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  const title = s(fd, "title");
  if (!title) return { ok: false, error: "件名は必須です。" };
  const c = admin();
  const customerId = await resolveCustomerId(c, fd);
  if (!customerId) return { ok: false, error: "顧客を選択してください。" };
  const { computed, subtotal, discountTotal, taxTotal, total } = computeItems(fd);
  // 対象者は氏・名を別フィールドで受ける（訃報案内で氏名が正しく分かれるように）
  const deceasedLast = s(fd, "deceased_last_name");
  const deceasedFirst = s(fd, "deceased_first_name");
  const now = new Date();
  const id = s(fd, "id");
  const estimateNo = s(fd, "construction_no") || `E${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const isPre = bool(fd, "is_pre_consultation");
  // 必須チェック（フロントと同条件。事前相談の有無で必須項目が変わる）
  const missing: string[] = [];
  if (!s(fd, "charged_user")) missing.push("計上担当者");
  if (!s(fd, "staff_name")) missing.push("担当者（葬儀担当）");
  if (!isPre) {
    if (!deceasedLast) missing.push("対象者氏");
    if (!s(fd, "deceased_gender")) missing.push("性別");
    if (!s(fd, "deceased_birth_date")) missing.push("生年月日");
    if (!s(fd, "deceased_death_date")) missing.push("没年月日");
    // 通夜日時は一日葬対応のため必須にしない(フロントと同条件)
    if (!s(fd, "funeral_at")) missing.push("告別式日時（火葬日時）");
  }
  if (missing.length) return { ok: false, error: `次の項目が未入力です：${missing.join("、")}` };
  const row = {
    funeral_home_id: KANRI_HOME_ID, customer_id: customerId, kind: isPre ? "pre" : "funeral", status: "confirmed",
    is_pre_consultation: isPre,
    estimate_no: estimateNo, title, memo: s(fd, "memo"),
    estimate_on: s(fd, "estimate_on"), estimate_limit_on: s(fd, "estimate_limit_on"),
    deceased_last_name: deceasedLast, deceased_first_name: deceasedFirst,
    deceased_gender: s(fd, "deceased_gender"), deceased_birth_date: s(fd, "deceased_birth_date"),
    deceased_death_date: s(fd, "deceased_death_date"), deceased_age: num(fd, "deceased_age"),
    mourner_relation: s(fd, "mourner_relation"),
    // 顧客と喪主が違う場合の喪主情報(チェックOFF時はフィールド未送信→null化)
    mourner_last_name: s(fd, "mourner_last_name"), mourner_first_name: s(fd, "mourner_first_name"),
    mourner_kana: s(fd, "mourner_kana"), mourner_phone: s(fd, "mourner_phone"),
    mourner_postcode: s(fd, "mourner_postcode"), mourner_prefecture: s(fd, "mourner_prefecture"),
    mourner_address_city: s(fd, "mourner_address_city"), mourner_address_street: s(fd, "mourner_address_street"),
    mourner_address_building: s(fd, "mourner_address_building"),
    wake_at: dt(fd, "wake_at"), funeral_at: dt(fd, "funeral_at"),
    venue_name: s(fd, "venue_name"),
    crematorium_name: s(fd, "crematorium_name"), brand: s(fd, "brand"),
    product_set_id: s(fd, "product_set_id"), product_set_price: num(fd, "product_set_price") ?? 0,
    issuer_company: s(fd, "issuer_company"), charged_org: s(fd, "charged_org"), charged_user: s(fd, "charged_user"),
    staff_name: s(fd, "staff_name"),
    advance_payment: num(fd, "advance_payment") ?? 0,
    subtotal, discount_total: discountTotal, tax_total: taxTotal, total,
    ...addresseeCols(fd),
  };
  let estimateId = id;
  if (id) {
    const { error } = await c.from("fk_estimates").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await c.from("fk_estimate_items").delete().eq("estimate_id", id);
  } else {
    const { data, error } = await c.from("fk_estimates").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: error?.message ?? "保存に失敗しました。" };
    estimateId = data.id;
  }
  if (computed.length) await c.from("fk_estimate_items").insert(computed.map((x) => ({ ...x, estimate_id: estimateId })));
  redirect(`/kanri/estimates/${estimateId}`);
}

export async function saveInvoiceFull(_prev: KanriResult | null, fd: FormData): Promise<KanriResult> {
  const title = s(fd, "title");
  if (!title) return { ok: false, error: "件名は必須です。" };
  const billedOn = s(fd, "billed_on");
  if (!billedOn) return { ok: false, error: "請求日は必須です。" };
  const c = admin();
  const customerId = await resolveCustomerId(c, fd);
  if (!customerId) return { ok: false, error: "顧客を選択してください。" };
  const { computed, total } = computeItems(fd);
  const a = addresseeCols(fd);
  const targetName = [a.addressee_last_name, a.addressee_first_name].filter(Boolean).join(" ");
  const id = s(fd, "id");
  const row = {
    funeral_home_id: KANRI_HOME_ID, customer_id: customerId,
    title, billed_on: billedOn, due_on: s(fd, "due_on"),
    construction_no: s(fd, "construction_no"), deceased_name: s(fd, "deceased_name"),
    mourner_name: [s(fd, "mourner_last_name"), s(fd, "mourner_first_name")].filter(Boolean).join(" ") || null,
    invoice_target_kind: a.addressee_kind, invoice_target_name: targetName || null,
    invoice_target_first_name: a.addressee_first_name, invoice_target_name_kana: [a.addressee_last_name_kana, a.addressee_first_name_kana].filter(Boolean).join(" ") || null,
    invoice_target_postcode: a.addressee_postcode, invoice_target_prefecture: a.addressee_prefecture,
    invoice_target_address_city: a.addressee_address_city, invoice_target_address_street: a.addressee_address_street,
    invoice_target_address_building: a.addressee_address_building,
    product_set_id: s(fd, "product_set_id"), advance_payment: num(fd, "advance_payment") ?? 0,
    issuer_company: s(fd, "issuer_company"), charged_org: s(fd, "charged_org"), charged_user: s(fd, "charged_user"),
    staff_name: s(fd, "staff_name"),
    total,
  };
  let invoiceId = id;
  if (id) {
    const { error } = await c.from("fk_invoices").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await c.from("fk_invoice_details").delete().eq("invoice_id", id);
  } else {
    const invoiceNo = await nextInvoiceNo(c);
    const { data, error } = await c.from("fk_invoices").insert({ ...row, estimate_id: s(fd, "estimate_id") || null, invoice_no: invoiceNo, source_id: invoiceNo, paid_total: 0, status: "unpaid" }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message ?? "保存に失敗しました。" };
    invoiceId = data.id;
  }
  if (computed.length) {
    await c.from("fk_invoice_details").insert(computed.map((x, i) => ({
      invoice_id: invoiceId, title: x.name, price: x.unit_price, tax: x.tax_rate, quantity: x.quantity,
      amount: x.amount, tax_amount: Math.round(x.amount * x.tax_rate), amount_including_tax: x.amount + Math.round(x.amount * x.tax_rate),
      sort_order: i, is_set_item: x.is_set_item, hidden_paper: x.hidden_paper,
      tag_name: x.tag_name, cost: x.cost, discount: x.discount,
      deposit: x.deposit, refundable: x.refundable,
      traded_on: x.traded_on, returned_quantity: x.returned_quantity,
      remarks: x.remarks, divide_title: x.divide_title,
    })));
  }
  redirect(`/kanri/billing/${invoiceId}`);
}

// ===== 請求書 一括登録（宛先ごとに請求書を作成） =====
export async function createBulkInvoices(fd: FormData): Promise<void> {
  const customerId = s(fd, "customer_id");
  const billedOn = s(fd, "billed_on") ?? new Date().toISOString().slice(0, 10);
  const productName = s(fd, "product_name") ?? "商品";
  const unitPrice0 = num(fd, "product_price") ?? 0;
  if (!customerId) return;
  const c = admin();
  const recipients = fd.getAll("recipient").map((v) => String(v).trim());
  const amounts = fd.getAll("amount").map((v) => Number(String(v).replace(/,/g, "")));
  const quantities = fd.getAll("quantity").map((v) => Number(String(v)) || 1);
  let created = 0;
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const amount = amounts[i];
    const qty = quantities[i] || 1;
    if (!recipient || !amount) continue; // 宛先・金額が揃った行のみ
    const unit = unitPrice0 || amount;
    const lineAmount = unit * qty;
    const tax = Math.round(lineAmount * 0.1);
    const total = lineAmount + tax;
    const { data: est } = await c.from("fk_estimates").insert({
      funeral_home_id: KANRI_HOME_ID, customer_id: customerId, title: productName, kind: "funeral",
      estimate_on: billedOn, mourner_last_name: recipient,
      subtotal: lineAmount, discount_total: 0, tax_total: tax, total, status: "confirmed",
    }).select("id").single();
    if (!est) continue;
    await c.from("fk_estimate_items").insert({ estimate_id: est.id, line_kind: "item", name: productName, unit_price: unit, quantity: qty, tax_rate: 0.1, amount: lineAmount, sort_order: 0 });
    const invNo = await nextInvoiceNo(c);
    await c.from("fk_invoices").insert({ funeral_home_id: KANRI_HOME_ID, estimate_id: est.id, invoice_no: invNo, source_id: invNo, total, status: "unpaid", billed_on: billedOn });
    created++;
  }
  revalidatePath("/kanri/billing");
  redirect(`/kanri/billing?bulk=${created}`);
}

// ===== 請求書 CSVインポート（実スマート葬儀 請求書一括CSVフォーマット準拠） =====
// 実物50列ヘッダーの列名で値を取得。件名がある行=新規請求書、無い行=直前の請求書の明細行。
function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export async function importInvoices(fd: FormData): Promise<void> {
  const text = s(fd, "csv");
  if (!text) return;
  const c = admin();
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return;
  const header = splitCsvLine(lines[0]);
  const col = (name: string) => header.findIndex((h) => h === name);
  const ix = {
    lastName: col("顧客氏"), firstName: col("顧客名"), title: col("件名"), billedOn: col("請求日"), dueOn: col("お支払い期限"),
    performanceNo: col("施行番号"), itemName: col("項目名"), unitPrice: col("単価"), taxRate: col("消費税率"), qty: col("数量"),
    discName: col("値引商品項目名"), discQty: col("値引商品数量"), discPrice: col("値引商品単価"),
    venue: col("葬儀会場"), funeralAt: col("葬儀日時"), postcode: col("郵便番号"), pref: col("都道府県"), city: col("市区町村"), street: col("番地"), building: col("建物名など"),
    payAmount: col("入金額"), payOn: col("入金日"), payMethod: col("入金方法"),
  };
  const g = (cols: string[], i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");
  const n = (v: string) => { const x = Number(v.replace(/,/g, "")); return isNaN(x) ? 0 : x; };
  const dateNorm = (v: string) => (v && /\d/.test(v) ? v.replace(/\//g, "-").slice(0, 10) : null);

  type Item = { lineKind: "item" | "discount"; name: string; unitPrice: number; quantity: number; taxRate: number };
  type Group = { lastName: string; firstName: string; title: string; billedOn: string | null; dueOn: string | null; performanceNo: string; venue: string; funeralAt: string | null; postcode: string; pref: string; city: string; street: string; building: string; items: Item[] };
  const groups: Group[] = [];

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const title = g(cols, ix.title);
    if (title || groups.length === 0) {
      groups.push({
        lastName: g(cols, ix.lastName), firstName: g(cols, ix.firstName), title: title || "請求",
        billedOn: dateNorm(g(cols, ix.billedOn)), dueOn: dateNorm(g(cols, ix.dueOn)), performanceNo: g(cols, ix.performanceNo),
        venue: g(cols, ix.venue), funeralAt: dateNorm(g(cols, ix.funeralAt)),
        postcode: g(cols, ix.postcode), pref: g(cols, ix.pref), city: g(cols, ix.city), street: g(cols, ix.street), building: g(cols, ix.building),
        items: [],
      });
    }
    const grp = groups[groups.length - 1];
    const itemName = g(cols, ix.itemName);
    if (itemName) {
      const rateRaw = g(cols, ix.taxRate);
      const rate = rateRaw.includes("8") ? 0.08 : rateRaw === "0" || rateRaw.includes("非") ? 0 : 0.1;
      grp.items.push({ lineKind: "item", name: itemName, unitPrice: n(g(cols, ix.unitPrice)), quantity: n(g(cols, ix.qty)) || 1, taxRate: rate });
    }
    const discName = g(cols, ix.discName);
    if (discName) {
      grp.items.push({ lineKind: "discount", name: discName, unitPrice: n(g(cols, ix.discPrice)), quantity: n(g(cols, ix.discQty)) || 1, taxRate: 0.1 });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  let created = 0;
  for (const grp of groups) {
    if (!grp.lastName && grp.items.length === 0) continue;
    let subtotal = 0, discountTotal = 0, taxTotal = 0;
    const computed = grp.items.map((it, i) => {
      const amount = it.lineKind === "discount" ? -Math.abs(it.unitPrice * it.quantity) : it.unitPrice * it.quantity;
      if (it.lineKind === "discount") discountTotal += Math.abs(amount); else subtotal += amount;
      taxTotal += amount * it.taxRate;
      return { line_kind: it.lineKind, name: it.name, unit_price: it.unitPrice, quantity: it.quantity, tax_rate: it.taxRate, amount, sort_order: i };
    });
    taxTotal = Math.round(taxTotal);
    const total = subtotal - discountTotal + taxTotal;
    const { data: est } = await c.from("fk_estimates").insert({
      funeral_home_id: KANRI_HOME_ID, estimate_no: grp.performanceNo || null, title: grp.title, kind: "funeral",
      estimate_on: grp.billedOn ?? today, funeral_at: grp.funeralAt, venue_name: grp.venue || null,
      mourner_last_name: grp.lastName || null, mourner_first_name: grp.firstName || null,
      mourner_postcode: grp.postcode || null, mourner_prefecture: grp.pref || null,
      mourner_address_city: grp.city || null, mourner_address_street: grp.street || null, mourner_address_building: grp.building || null,
      subtotal, discount_total: discountTotal, tax_total: taxTotal, total, status: "confirmed",
    }).select("id").single();
    if (!est) continue;
    if (computed.length) await c.from("fk_estimate_items").insert(computed.map((x) => ({ ...x, estimate_id: est.id })));
    const invNo = await nextInvoiceNo(c);
    await c.from("fk_invoices").insert({ funeral_home_id: KANRI_HOME_ID, estimate_id: est.id, invoice_no: invNo, source_id: invNo, total, status: "unpaid", billed_on: grp.billedOn ?? today, due_on: grp.dueOn });
    created++;
  }
  revalidatePath("/kanri/billing");
  redirect(`/kanri/billing?imported=${created}`);
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
