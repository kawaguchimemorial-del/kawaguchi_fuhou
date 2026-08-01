import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DBの型生成をしていないため行の型が存在しない（lib/admin/actions.ts と同じ扱い）。
 * PostgREST のクエリビルダを緩く受けるための最小型で、any をここに閉じ込める。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseTable = any;
type AdminDb = { from: (table: string) => LooseTable };

/** admin_users の行（このファイル内でのみ使う読み取り形） */
type AdminUserRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string | null;
  is_active: boolean;
};

/** ログイン中の管理ユーザー。admin_users に有効な行がある場合のみ返す。 */
export type AdminUser = {
  userId: string;
  email: string;
  displayName: string;
  role: "admin" | "staff" | "viewer";
};

/** ログイン画面のパス。middleware・サインアウト後の戻り先と共有する。 */
export const SIGN_IN_PATH = "/account/sign-in";

/**
 * 現在のセッションから管理ユーザーを取得する。
 * 未ログイン、または admin_users に有効な行が無い場合は null。
 *
 * セッションの検証は getUser()（Supabase の認証サーバーに問い合わせる）で行う。
 * getSession() はCookieの中身をそのまま信じるため、権限判定には使わない。
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  // 許可リストの参照は service_role で行う。RLSの都合でユーザー自身の行しか読めない状況でも
  // 判定がぶれないようにするため（RLSポリシーの設定漏れでログイン不能になるのを防ぐ）。
  const admin = createAdminClient() as unknown as AdminDb;
  const { data: row } = (await admin
    .from("admin_users")
    .select("user_id, email, display_name, role, is_active")
    .eq("user_id", data.user.id)
    .maybeSingle()) as { data: AdminUserRow | null };

  if (!row || !row.is_active) return null;

  return {
    userId: row.user_id,
    email: row.email || data.user.email || "",
    displayName: row.display_name || row.email || data.user.email || "",
    role: (row.role as AdminUser["role"]) ?? "admin",
  };
}

/**
 * 管理ユーザーであることを要求する。そうでなければログイン画面へ。
 * 管理画面のレイアウト・Server Action の入口で呼ぶ。
 */
export async function requireAdmin(returnTo?: string): Promise<AdminUser> {
  const user = await getAdminUser();
  if (user) return user;
  const q = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
  redirect(`${SIGN_IN_PATH}${q}`);
}

/** 最終ログイン時刻の記録。失敗しても認証は妨げない。 */
export async function touchLastLogin(userId: string): Promise<void> {
  try {
    const admin = createAdminClient() as unknown as AdminDb;
    await admin
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", userId);
  } catch {
    // 記録できなくてもログイン自体は成立させる
  }
}
