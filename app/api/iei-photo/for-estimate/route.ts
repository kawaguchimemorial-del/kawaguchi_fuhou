import { findAiPortraitByEstimate } from "@/lib/kanri/ai-portraits";

export const dynamic = "force-dynamic";

// 施行(見積)に紐づく最新のAI遺影を返す(祭壇への反映用・一意照合)。
export async function GET(req: Request) {
  const estimateId = new URL(req.url).searchParams.get("estimate_id") ?? "";
  if (!estimateId.trim()) return Response.json({ found: false });
  const p = await findAiPortraitByEstimate(estimateId);
  if (!p) return Response.json({ found: false });
  return Response.json({ found: true, tefudaUrl: p.tefudaUrl ?? null, imageUrl: p.imageUrl ?? null, deceasedName: p.deceasedName ?? null });
}
