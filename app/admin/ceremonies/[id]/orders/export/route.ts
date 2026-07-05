import { NextRequest } from "next/server";
import { getOrdersForExport } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

// 供花・供物 注文一覧のエクスポート（CSV / Excel互換）。error=決済未成立は除外。
const COLUMNS = [
  "注文日時", "ステータス", "商品名", "数量", "金額(税込)",
  "注文者", "法人・団体名", "札名", "郵便番号", "住所", "電話番号", "メールアドレス", "領収書宛名",
  "喪主名", "故人名",
];

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function esc(v: string | number): string {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function htmlEsc(v: string | number): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const fmtParam = (req.nextUrl.searchParams.get("fmt") ?? "csv").toLowerCase();
  const rows = await getOrdersForExport(id);
  const cells = (r: (typeof rows)[number]) => [
    fmt(r.createdAt), r.status, r.productName, r.quantity, r.amountJpy,
    r.ordererName, r.company, r.namePlate, r.postalCode, r.address, r.phone, r.email, r.invoiceName,
    r.mournerName, r.deceasedName,
  ];

  if (fmtParam === "excel" || fmtParam === "xls") {
    // Excelが確実に開けるHTMLテーブル（.xls）
    const body =
      `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>` +
      COLUMNS.map((h) => `<th>${htmlEsc(h)}</th>`).join("") +
      `</tr>` +
      rows.map((r) => `<tr>${cells(r).map((v) => `<td>${htmlEsc(v)}</td>`).join("")}</tr>`).join("") +
      `</table></body></html>`;
    return new Response("﻿" + body, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders_${id}.xls"`,
      },
    });
  }

  // CSV（UTF-8 BOM）
  const csv =
    "﻿" +
    [COLUMNS.join(","), ...rows.map((r) => cells(r).map(esc).join(","))].join("\r\n") +
    "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${id}.csv"`,
    },
  });
}
