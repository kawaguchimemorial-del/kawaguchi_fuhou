"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "./constants";

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

  const row = {
    funeral_home_id: KANRI_HOME_ID,
    customer_no: s(fd, "customer_no"),
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
  const name = s(fd, "name");
  if (!type || !name) return;
  await admin().from("fk_master_items").insert({
    funeral_home_id: KANRI_HOME_ID, master_type: type, name,
    kana: s(fd, "kana"), price: num(fd, "price"), sort_order: num(fd, "sort_order") ?? 0,
  });
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
export async function deleteProduct(fd: FormData): Promise<void> {
  const id = s(fd, "id");
  if (!id) return;
  await admin().from("fk_products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/kanri/products");
}
