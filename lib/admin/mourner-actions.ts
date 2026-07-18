"use server";

import { randomBytes } from "node:crypto";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { generateLoginId, hashPassword, initialPasswordFromPhone } from "@/lib/mourner/auth";

export type IssueResult =
  | { ok: true; loginId: string; tempPassword: string; authCreated: boolean }
  | { ok: false; error: string };

function enabled() {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function genPassword(): string {
  // 紛らわしい文字を除いた8桁（電話番号が無い＝メール発行時のみ使用）
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = randomBytes(8);
  let p = "";
  for (let i = 0; i < 8; i++) p += chars[buf[i] % chars.length];
  return p;
}

/**
 * 喪主アカウントを発行。
 * ログインID = 10桁ランダム英数字（案件横断で一意）／初期パスワード = 電話番号の下6桁。
 * メール発行時のみ電話が無いためランダム8桁。＠葬儀と同じ運用（docs/bereaved-portal-spec.md）。
 */
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

  // 初期パスワード: 電話番号発行なら下6桁。メール発行は電話が無いためランダム。
  const tempPassword = (method === "phone" ? initialPasswordFromPhone(c) : null) ?? genPassword();
  const passwordHash = hashPassword(tempPassword);

  // ログインIDには一意制約がある。万一衝突したら採番し直す。
  let lastErr = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const loginId = generateLoginId();
    const { error: upErr } = await admin
      .from("memorials")
      .update({
        mourner_account_issued: true,
        mourner_login_id: loginId,
        mourner_password_hash: passwordHash,
        mourner_password_updated_at: new Date().toISOString(),
        mourner_contact_method: method,
        mourner_phone: method === "phone" ? c : null,
        mourner_notify_email: method === "email" ? c : null,
        mourner_issued_at: new Date().toISOString(),
      })
      .eq("id", mem.id);
    if (!upErr) return { ok: true, loginId, tempPassword, authCreated: true };
    lastErr = upErr.message;
    if (!/duplicate key|unique/i.test(upErr.message)) break; // 衝突以外は再試行しない
  }
  return { ok: false, error: "発行の記録に失敗しました: " + lastErr };
}

/** パスワード再発行（喪主が初期パスワードを紛失した際に葬儀社が操作） */
export async function resetMournerPassword(slug: string): Promise<IssueResult> {
  if (!enabled()) return { ok: false, error: "Supabaseが未設定です。" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: mem } = await admin
    .from("memorials")
    .select("id, mourner_login_id, mourner_phone")
    .eq("slug", slug)
    .single();
  if (!mem?.mourner_login_id) return { ok: false, error: "まだ喪主アカウントが発行されていません。" };

  const tempPassword = (mem.mourner_phone ? initialPasswordFromPhone(mem.mourner_phone) : null) ?? genPassword();
  const { error } = await admin
    .from("memorials")
    .update({ mourner_password_hash: hashPassword(tempPassword), mourner_password_updated_at: new Date().toISOString() })
    .eq("id", mem.id);
  if (error) return { ok: false, error: "再発行に失敗しました: " + error.message };
  return { ok: true, loginId: mem.mourner_login_id, tempPassword, authCreated: true };
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
