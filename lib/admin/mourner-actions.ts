"use server";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export type IssueResult =
  | { ok: true; loginId: string; tempPassword: string; authCreated: boolean }
  | { ok: false; error: string };

function enabled() {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function genPassword(): string {
  // 紛らわしい文字を除いた8桁
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 8; i++) p += chars[Math.floor((i * 7 + Date.now()) % chars.length)];
  return p;
}

/** 喪主アカウントを発行（電話番号 or メール） */
export async function issueMournerAccount(
  slug: string,
  method: "phone" | "email",
  contact: string
): Promise<IssueResult> {
  if (!enabled()) return { ok: false, error: "Supabaseが未設定です。" };
  const c = contact.trim();
  if (method === "email") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) return { ok: false, error: "メールアドレスの形式が正しくありません。" };
  } else {
    if (!/^\d{10,11}$/.test(c)) return { ok: false, error: "電話番号は10〜11桁の数字で入力してください。" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // 対象案件
  const { data: mem, error: findErr } = await admin.from("memorials").select("id").eq("slug", slug).single();
  if (findErr || !mem) return { ok: false, error: "対象の案件が見つかりません。" };

  // 初期パスワード: 電話番号発行なら電話番号の下6桁。メール発行は電話が無いためランダム。
  const tempPassword = method === "phone" ? c.slice(-6) : genPassword();

  // Supabase Auth に実ユーザー作成（ベストエフォート。失敗してもDB記録は行う）
  let authCreated = false;
  try {
    const payload =
      method === "email"
        ? { email: c, password: tempPassword, email_confirm: true, user_metadata: { role: "mourner", memorial_slug: slug } }
        : { phone: c, password: tempPassword, phone_confirm: true, user_metadata: { role: "mourner", memorial_slug: slug } };
    const { error: authErr } = await admin.auth.admin.createUser(payload);
    if (!authErr) authCreated = true;
  } catch {
    // 認証ユーザー作成は後でログイン実装時に整備
  }

  const { error: upErr } = await admin
    .from("memorials")
    .update({
      mourner_account_issued: true,
      mourner_login_id: c,
      mourner_contact_method: method,
      mourner_issued_at: new Date().toISOString(),
    })
    .eq("id", mem.id);
  if (upErr) return { ok: false, error: "発行の記録に失敗しました: " + upErr.message };

  return { ok: true, loginId: c, tempPassword, authCreated };
}

/** 詳細表示用：喪主アカウントの発行状態 */
export async function getMournerAccount(
  slug: string
): Promise<{ issued: boolean; loginId: string | null; method: string | null }> {
  if (!enabled()) return { issued: false, loginId: null, method: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data } = await admin
    .from("memorials")
    .select("mourner_account_issued,mourner_login_id,mourner_contact_method")
    .eq("slug", slug)
    .single();
  if (!data) return { issued: false, loginId: null, method: null };
  return { issued: !!data.mourner_account_issued, loginId: data.mourner_login_id ?? null, method: data.mourner_contact_method ?? null };
}

// 喪主アカウント発行フォームの初期値(発行方法/電話/メール)。
// 優先: 訃報作成時の入力(form_state idMethod/idContact) → 連携見積の喪主電話 → 顧客電話/メール。
export async function getMournerContactDefaults(
  slug: string
): Promise<{ method: "phone" | "email"; phone: string; email: string }> {
  if (!enabled()) return { method: "phone", phone: "", email: "" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: mem } = await admin.from("memorials").select("estimate_id, form_state").eq("slug", slug).single();
  if (!mem) return { method: "phone", phone: "", email: "" };
  const fs = (mem.form_state ?? {}) as { idMethod?: string; idContact?: string };
  const wantEmail = fs.idMethod === "メールアドレス";
  const idContact = (fs.idContact ?? "").trim();
  let phone = "";
  let email = "";
  // 作成時の入力を最優先(発行方法に応じて電話orメールへ)
  if (idContact) {
    if (wantEmail || idContact.includes("@")) email = idContact;
    else phone = idContact.replace(/[^0-9]/g, "");
  }
  // 見積・顧客で不足分を補完
  if (mem.estimate_id && (!phone || !email)) {
    const { data: est } = await admin.from("fk_estimates").select("mourner_phone, customer_id").eq("id", mem.estimate_id).maybeSingle();
    if (!phone) phone = (est?.mourner_phone ?? "").replace(/[^0-9]/g, "");
    if (est?.customer_id) {
      const { data: cu } = await admin.from("fk_customers").select("telephone_number, mobile_number, email").eq("id", est.customer_id).maybeSingle();
      if (!phone) phone = ((cu?.mobile_number || cu?.telephone_number) ?? "").replace(/[^0-9]/g, "");
      if (!email) email = cu?.email ?? "";
    }
  }
  return { method: wantEmail ? "email" : "phone", phone, email };
}
