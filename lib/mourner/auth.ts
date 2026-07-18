import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

// 喪主マイページの自前認証。
// ＠葬儀(bereaved.at-sougi.com)に倣い「10桁ログインID + 初期パスワード=電話番号下6桁」。
// 葬儀社スタッフの Supabase Auth とは完全に別系統（喪主に auth.users を作らない）。

const COOKIE = "mourner_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7日

/** セッション署名鍵。専用の環境変数が無ければ service role key を流用する。 */
function secret(): string {
  const s = process.env.MOURNER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("MOURNER_SESSION_SECRET / SUPABASE_SERVICE_ROLE_KEY が未設定です");
  return s;
}

// ── パスワード ────────────────────────────────────────

/** scrypt でハッシュ化（形式: salt:hash の hex）。bcrypt 等の追加依存を避ける。 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(plain, Buffer.from(saltHex, "hex"), expected.length);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** 10桁のログインID。紛らわしい文字(0/o/1/l/i)を除外し、電話口でも伝えられるようにする。 */
export function generateLoginId(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = randomBytes(10);
  let id = "";
  for (let i = 0; i < 10; i++) id += chars[buf[i] % chars.length];
  return id;
}

/** 初期パスワード = 電話番号の下6桁（＠葬儀と同じルール） */
export function initialPasswordFromPhone(phone: string): string | null {
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length >= 6 ? digits.slice(-6) : null;
}

// ── セッション（HMAC署名Cookie）────────────────────────

type SessionPayload = { memorialId: string; loginId: string; exp: number };

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function encode(p: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  // 署名長が違うと timingSafeEqual が例外を投げるため長さを先に比較する
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!p.memorialId || typeof p.exp !== "number" || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

export async function createMournerSession(memorialId: string, loginId: string): Promise<void> {
  const token = encode({ memorialId, loginId, exp: Date.now() + MAX_AGE * 1000 });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroyMournerSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getMournerSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return decode(jar.get(COOKIE)?.value);
}

/**
 * 指定案件へのアクセス可否。URL の memorialId とセッションの memorialId が一致する場合のみ true。
 * 喪主は自分の案件1件しか見られない（他案件のIDを打っても弾く）。
 */
export async function assertMournerAccess(memorialId: string): Promise<boolean> {
  const s = await getMournerSession();
  return s?.memorialId === memorialId;
}

// ── ログイン ─────────────────────────────────────────

export type SignInResult = { ok: true; memorialId: string } | { ok: false; error: string };

// 存在しないIDでも scrypt を1回走らせるためのダミー（タイミング攻撃対策）
const DUMMY_HASH = hashPassword("dummy-password-for-constant-time");

export async function signInMourner(loginId: string, password: string): Promise<SignInResult> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "システムが未設定です。葬儀社へお問い合わせください。" };
  }
  // ID は「tp2sjzg2jp」でも「tp2sjzg2jp@..." 形式でも受け付ける（＠葬儀のメール欄運用に合わせる）
  const id = loginId.trim().toLowerCase().split("@")[0];
  if (!id || !password) return { ok: false, error: "ログインIDとパスワードを入力してください。" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data } = await admin
    .from("memorials")
    .select("id, mourner_password_hash, deleted_at")
    .eq("mourner_login_id", id)
    .maybeSingle();

  // ID が存在しない場合もダミーハッシュで照合し、応答時間からIDの存在有無を推測させない
  const stored: string | null = data?.mourner_password_hash ?? null;
  const ok = verifyPassword(password, stored ?? DUMMY_HASH) && Boolean(stored) && !data?.deleted_at;
  if (!ok) return { ok: false, error: "ログインIDまたはパスワードが正しくありません。" };

  await admin.from("memorials").update({ mourner_last_login_at: new Date().toISOString() }).eq("id", data.id);
  return { ok: true, memorialId: data.id as string };
}
