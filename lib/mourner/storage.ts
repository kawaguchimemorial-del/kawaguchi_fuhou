/**
 * Storage のパスから公開URLを組み立てる。
 * 既に絶対URLならそのまま返す（旧データ互換）。
 */
export function photoPublicUrl(path: string, bucket = "product-images"): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;
}
