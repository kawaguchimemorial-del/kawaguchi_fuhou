import { listEstimatesByCustomer, deceasedFullName } from "@/lib/kanri/estimates";

export const dynamic = "force-dynamic";

// 顧客の見積(施行)一覧。AI遺影の事前登録で施行を選ぶために使う。
export async function GET(req: Request) {
  const customerId = new URL(req.url).searchParams.get("customer_id") ?? "";
  if (!customerId.trim()) return Response.json([]);
  const rows = await listEstimatesByCustomer(customerId);
  const out = rows.slice(0, 30).map((e) => ({
    id: e.id,
    estimateNo: e.estimateNo ?? "",
    deceased: deceasedFullName(e),
    title: e.title ?? "",
    on: e.estimateOn ?? e.createdAt ?? "",
  }));
  return Response.json(out);
}
