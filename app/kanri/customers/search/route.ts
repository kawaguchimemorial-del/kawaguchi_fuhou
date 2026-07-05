import { listCustomers } from "@/lib/kanri/data";

export const dynamic = "force-dynamic";

// 関連追加モーダルの顧客検索
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const exclude = new URL(req.url).searchParams.get("exclude") ?? "";
  const rows = await listCustomers({ q: q.trim() || undefined });
  const out = rows.filter((c) => c.id !== exclude).slice(0, 30).map((c) => ({
    id: c.id,
    name: `${c.lastName} ${c.firstName ?? ""}`.trim(),
    phone: c.mobileNumber ?? c.telephoneNumber ?? "",
    address: [c.prefectureCode, c.addressCity, c.addressStreet].filter(Boolean).join(""),
    birth: c.birthDate ?? "",
  }));
  return Response.json(out);
}
