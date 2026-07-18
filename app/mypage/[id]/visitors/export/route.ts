import { assertMournerAccess } from "@/lib/mourner/auth";
import { listVisitors } from "@/lib/mourner/data";

export const dynamic = "force-dynamic";

const WD = ["日", "月", "火", "水", "木", "金", "土"];
const KIND_JA: Record<string, string> = { obituary: "訃報ページ", venue: "オンライン式場" };

function jpDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日(${WD[d.getDay()]}) ${p(d.getHours())}時${p(d.getMinutes())}分`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) return new Response("Unauthorized", { status: 401 });

  // 入場記録は件数が多くなりうるため上限を大きく取る
  const { rows } = await listVisitors(id, 10000, 0);
  const lines = ["日時,ページ,お名前"];
  for (const v of rows) lines.push(`${jpDateTime(v.createdAt)},${KIND_JA[v.kind] ?? v.kind},お名前不明`);
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nyujo_${id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
