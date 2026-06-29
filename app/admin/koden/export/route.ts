import { listKoden } from "@/lib/admin/data";

// 香典帳CSVエクスポート（Excel対応：UTF-8 BOM付き）。半返し（おおむね半額）目安を自動計算。
// TODO(auth): 葬儀社authで自社案件のみに限定。TODO(supabase): koden_register ビューから出力。
export async function GET() {
  const rows = await listKoden();
  const header = ["記帳日時", "喪主名", "故人名", "式1", "記帳者名", "香典金額(円)", "半返し目安(円)"];
  const lines = rows.map((r) =>
    [
      r.registeredAt,
      r.mournerName,
      r.deceasedName,
      r.event1,
      r.donorName,
      String(r.amountJpy),
      String(Math.round(r.amountJpy / 2)), // 半返し目安
    ]
      .map((c) => `"${c.replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="koden_register.csv"`,
    },
  });
}
