/**
 * 管理画面のログインIDとメールアドレスの対応。
 *
 * Supabase Auth はメールアドレスで人を識別するが、社内では「ishikawa」のような
 * 短いIDで運用したい。そこで、IDに社内専用ドメインを付けた値を内部のメールアドレスとして扱う。
 * このドメインは実在しないため、ここ宛のメールは送られない（送る必要も無い）。
 */
export const ADMIN_LOGIN_DOMAIN = "kawaguchi-tenrei.local";

/**
 * 入力されたログインIDを内部のメールアドレスに直す。
 * 将来メールアドレスで運用したくなった場合に備え、@ を含む入力はそのまま使う。
 */
export function toLoginEmail(input: string): string {
  const v = input.trim().toLowerCase();
  if (!v) return "";
  return v.includes("@") ? v : `${v}@${ADMIN_LOGIN_DOMAIN}`;
}

/** 内部のメールアドレスを画面表示用のログインIDに戻す。 */
export function toLoginId(email: string): string {
  const v = (email || "").trim().toLowerCase();
  return v.endsWith(`@${ADMIN_LOGIN_DOMAIN}`) ? v.slice(0, -1 - ADMIN_LOGIN_DOMAIN.length) : v;
}
