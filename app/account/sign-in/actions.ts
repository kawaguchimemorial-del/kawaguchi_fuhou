"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, touchLastLogin, SIGN_IN_PATH } from "@/lib/admin/auth";
import { toLoginEmail } from "@/lib/admin/login-id";

/**
 * 失敗時は入力されたログインIDも返す。
 * これが無いと、やり直しのたびにフォームが再描画されてID欄まで空になり、
 * パスワードだけ打ち直した人が何度やっても入れない（実機で確認した）。
 * パスワードは返さない。
 */
export type SignInState = { error: string | null; email: string };

/** 遷移先に外部URLや別サイトを渡されないよう、自サイト内の絶対パスだけ許可する。 */
function safeNext(next: unknown): string {
  const v = typeof next === "string" ? next : "";
  if (!v.startsWith("/") || v.startsWith("//")) return "/kanri";
  if (v.startsWith(SIGN_IN_PATH)) return "/kanri";
  return v;
}

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  // 画面の入力欄はログインID（例: ishikawa）。内部ではメールアドレスに直して認証する。
  const loginId = String(formData.get("email") || "").trim();
  const email = toLoginEmail(loginId);
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));

  if (!loginId || !password) {
    return { error: "IDとパスワードをご入力ください。", email: loginId };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // 画面には理由を出さないので、原因調査用にサーバー側だけに残す。
    console.error("[signIn] 失敗", error.status, error.message);
    // どちらが違うかは伝えない（存在するIDを探られないため）。
    return { error: "IDまたはパスワードが違います。", email: loginId };
  }

  // 認証は通ったが管理画面の許可が無い（=退職などで停止した）場合はここで止める。
  const admin = await getAdminUser();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "このアカウントは管理画面をご利用いただけません。", email: loginId };
  }

  await touchLastLogin(admin.userId);
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(SIGN_IN_PATH);
}
