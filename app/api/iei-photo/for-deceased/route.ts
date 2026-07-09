import { findAiPortraitByDeceased } from "@/lib/kanri/ai-portraits";

export const dynamic = "force-dynamic";

// 対象者名に一致する最新のAI遺影を返す(祭壇への反映用)。
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!name.trim()) return Response.json({ found: false });
  const p = await findAiPortraitByDeceased(name);
  if (!p) return Response.json({ found: false });
  // 祭壇には手札を使う。無ければ基準写真。
  return Response.json({ found: true, tefudaUrl: p.tefudaUrl ?? null, imageUrl: p.imageUrl ?? null, deceasedName: p.deceasedName ?? null });
}
