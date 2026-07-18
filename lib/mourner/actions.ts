"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertMournerAccess,
  createMournerSession,
  destroyMournerSession,
  getMournerSession,
  hashPassword,
  signInMourner,
  verifyPassword,
} from "@/lib/mourner/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createAdminClient() as unknown as { from: (t: string) => any };

import type { ActionState } from "@/lib/mourner/types";
import { MAX_PHOTOS } from "@/lib/mourner/types";

/** ログイン。成功したらマイページへ。 */
export async function signInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const loginId = String(form.get("loginId") ?? "");
  const password = String(form.get("password") ?? "");
  const r = await signInMourner(loginId, password);
  if (!r.ok) return { error: r.error };
  await createMournerSession(r.memorialId, loginId.trim().toLowerCase().split("@")[0]);
  redirect(`/mypage/${r.memorialId}`);
}

export async function signOutAction(): Promise<void> {
  await destroyMournerSession();
  redirect("/mypage/sign-in");
}

/** 以降のアクションは全て本人確認を通す */
async function guard(memorialId: string): Promise<boolean> {
  return assertMournerAccess(memorialId);
}

/** 喪主挨拶の保存 */
export async function saveGreetingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const memorialId = String(form.get("memorialId") ?? "");
  if (!(await guard(memorialId))) return { error: "セッションが切れました。もう一度ログインしてください。" };
  const greeting = String(form.get("greeting") ?? "").slice(0, 2000);
  const { error } = await db().from("memorials").update({ mourner_greeting: greeting }).eq("id", memorialId);
  if (error) return { error: "保存に失敗しました: " + error.message };
  revalidatePath(`/mypage/${memorialId}/online`);
  return { ok: "喪主挨拶を保存しました。" };
}

/** メール通知設定の保存 */
export async function saveNotifyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const memorialId = String(form.get("memorialId") ?? "");
  if (!(await guard(memorialId))) return { error: "セッションが切れました。もう一度ログインしてください。" };
  const email = String(form.get("email") ?? "").trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "メールアドレスの形式が正しくありません。" };
  }
  const { error } = await db()
    .from("memorials")
    .update({
      mourner_notify_email: email || null,
      mourner_notify_receipt: form.get("receipt") === "on",
      mourner_notify_koden: form.get("incense") === "on",
    })
    .eq("id", memorialId);
  if (error) return { error: "保存に失敗しました: " + error.message };
  revalidatePath(`/mypage/${memorialId}/mail-settings`);
  return { ok: "通知設定を保存しました。" };
}

/** パスワード変更 */
export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const memorialId = String(form.get("memorialId") ?? "");
  if (!(await guard(memorialId))) return { error: "セッションが切れました。もう一度ログインしてください。" };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (next.length < 6) return { error: "新しいパスワードは6文字以上で入力してください。" };
  if (next !== confirm) return { error: "新しいパスワードが一致しません。" };

  const { data } = await db().from("memorials").select("mourner_password_hash").eq("id", memorialId).maybeSingle();
  if (!verifyPassword(current, data?.mourner_password_hash)) {
    return { error: "現在のパスワードが正しくありません。" };
  }
  const { error } = await db()
    .from("memorials")
    .update({ mourner_password_hash: hashPassword(next), mourner_password_updated_at: new Date().toISOString() })
    .eq("id", memorialId);
  if (error) return { error: "変更に失敗しました: " + error.message };
  return { ok: "パスワードを変更しました。" };
}

// ── 写真管理 ─────────────────────────────────────────

const PHOTO_BUCKET = "product-images";

/** アップロード用の署名付きURLを発行（本文サイズ上限を避けブラウザから直送させる） */
export async function createPhotoUploadUrl(
  memorialId: string,
  kind: "funeral" | "album",
  ext: string
): Promise<{ ok: true; path: string; token: string; bucket: string } | { ok: false; error: string }> {
  if (!(await guard(memorialId))) return { ok: false, error: "セッションが切れました。" };

  const { count } = await db()
    .from("memorial_photos")
    .select("id", { count: "exact", head: true })
    .eq("memorial_id", memorialId)
    .eq("kind", kind);
  if ((count ?? 0) >= MAX_PHOTOS) return { ok: false, error: `登録できるのは最大${MAX_PHOTOS}枚までです。` };

  const safeExt = /^(jpg|jpeg|png|webp|gif)$/i.test(ext) ? ext.toLowerCase() : "jpg";
  const path = `mourner/${memorialId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = (createAdminClient() as any).storage.from(PHOTO_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error) return { ok: false, error: "アップロードの準備に失敗しました: " + error.message };
  return { ok: true, path, token: data.token, bucket: PHOTO_BUCKET };
}

/** アップロード完了後にDBへ登録 */
export async function registerPhoto(
  memorialId: string,
  kind: "funeral" | "album",
  path: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await guard(memorialId))) return { ok: false, error: "セッションが切れました。" };
  const { count } = await db()
    .from("memorial_photos")
    .select("id", { count: "exact", head: true })
    .eq("memorial_id", memorialId)
    .eq("kind", kind);
  const { error } = await db()
    .from("memorial_photos")
    .insert({ memorial_id: memorialId, kind, path, sort_order: count ?? 0 });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/mypage/${memorialId}/${kind === "funeral" ? "funeral-photos" : "album"}`);
  return { ok: true };
}

/** 並び順と削除をまとめて保存（＠葬儀の「並び替え/削除」→「保存」に相当） */
export async function savePhotoOrder(
  memorialId: string,
  kind: "funeral" | "album",
  orderedIds: string[],
  deletedIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  if (!(await guard(memorialId))) return { ok: false, error: "セッションが切れました。" };

  if (deletedIds.length) {
    // Storage の実体も消す（消し漏れてもDB削除は続行する）
    const { data: rows } = await db()
      .from("memorial_photos")
      .select("path")
      .eq("memorial_id", memorialId)
      .in("id", deletedIds);
    const paths = ((rows ?? []) as { path: string }[]).map((r) => r.path);
    if (paths.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (createAdminClient() as any).storage.from(PHOTO_BUCKET).remove(paths).catch(() => {});
    }
    const { error } = await db().from("memorial_photos").delete().eq("memorial_id", memorialId).in("id", deletedIds);
    if (error) return { ok: false, error: error.message };
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db()
      .from("memorial_photos")
      .update({ sort_order: i })
      .eq("memorial_id", memorialId)
      .eq("id", orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/mypage/${memorialId}/${kind === "funeral" ? "funeral-photos" : "album"}`);
  return { ok: true };
}

/** セッションの案件IDを返す（ページ側のガード用） */
export async function currentMemorialId(): Promise<string | null> {
  return (await getMournerSession())?.memorialId ?? null;
}
