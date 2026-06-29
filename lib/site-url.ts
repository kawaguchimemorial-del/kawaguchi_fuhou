import "server-only";
import { headers } from "next/headers";

/** 実リクエストから現在のサイトのオリジン(https://ドメイン)を取得。
 *  Vercel等のプロキシ配下でも x-forwarded-* を見て正しいURLを返す。 */
export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  // フォールバック
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
