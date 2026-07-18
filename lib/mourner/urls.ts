import "server-only";
import { headers } from "next/headers";

/**
 * 参列者に案内する公開ページの絶対URL基底。
 * 環境変数があればそれを使い、無ければリクエストヘッダから組み立てる
 * （Vercel のプレビュー環境でも正しいURLをコピーできるようにするため）。
 */
export async function publicBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
