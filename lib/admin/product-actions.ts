"use server";

import { randomUUID } from "crypto";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

const DEMO_FUNERAL_HOME_ID = "11111111-1111-1111-1111-111111111111";
const BUCKET = "product-images";

export interface ProductInput {
  id?: string;
  type: "供花" | "供物";
  name: string;
  priceJpy: number;
  description?: string;
  size?: string;
  imagePath?: string;
}
export interface Product extends ProductInput {
  id: string;
  imagePath?: string;
}

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as unknown as { from: (t: string) => any; storage: any };
}
function enabled() {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function listProducts(type?: "供花" | "供物"): Promise<Product[]> {
  if (!enabled()) return [];
  let qb = db().from("offering_products_master").select("*").eq("funeral_home_id", DEMO_FUNERAL_HOME_ID).order("sort_order");
  if (type) qb = qb.eq("type", type);
  const { data } = await qb;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id, type: r.type, name: r.name, priceJpy: r.price_jpy,
    description: r.description ?? "", size: r.size ?? "", imagePath: r.image_path ?? undefined,
  }));
}

/** 画像アップロード（FormData の file）。公開URLを返す */
export async function uploadProductImage(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!enabled()) return { ok: false, error: "Supabase未設定" };
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "ファイルがありません" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "画像ファイルを選んでください" };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "画像は5MBまで" };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${DEMO_FUNERAL_HOME_ID}/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await db().storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: "アップロード失敗: " + error.message };
  const { data } = db().storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export async function saveProduct(p: ProductInput): Promise<{ ok: boolean; error?: string }> {
  if (!enabled()) return { ok: false, error: "Supabase未設定" };
  if (!p.name) return { ok: false, error: "商品名は必須です" };
  const row = {
    type: p.type, name: p.name, price_jpy: Math.round(p.priceJpy) || 0,
    description: p.description || null, size: p.size || null, image_path: p.imagePath || null,
    updated_at: new Date().toISOString(),
  };
  if (p.id) {
    const { error } = await db().from("offering_products_master").update(row).eq("id", p.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  } else {
    const { error } = await db().from("offering_products_master").insert({ ...row, funeral_home_id: DEMO_FUNERAL_HOME_ID });
    return error ? { ok: false, error: error.message } : { ok: true };
  }
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!enabled()) return { ok: false, error: "Supabase未設定" };
  const { error } = await db().from("offering_products_master").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** 注文設定（支払い方法等）の保存 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveOrderSettings(settings: any): Promise<{ ok: boolean; error?: string }> {
  if (!enabled()) return { ok: false, error: "Supabase未設定" };
  const { error } = await db().from("funeral_homes").update({ order_settings: settings }).eq("id", DEMO_FUNERAL_HOME_ID);
  return error ? { ok: false, error: error.message } : { ok: true };
}
