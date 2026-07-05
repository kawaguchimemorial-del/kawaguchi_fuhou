export const dynamic = "force-dynamic";

// 請求書CSVインポート用フォーマット
export async function GET() {
  const header = ["顧客名", "件名", "請求日", "金額"];
  const sample = ["山田 太郎", "一般葬 ご葬儀", "2026/07/05", "500000"];
  const csv = "﻿" + [header.join(","), sample.join(",")].join("\r\n") + "\r\n";
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="invoice_import_format.csv"' } });
}
