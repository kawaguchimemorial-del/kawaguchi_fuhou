import { listInvoices } from "@/lib/kanri/invoices";

export const dynamic = "force-dynamic";

// 請求書一覧CSV（請求書ごとに1行。入金一覧CSVとは別物）。
// 一覧画面の列構成＋請求先・入金状況を付与。
const COLS = [
  "請求書ID", "顧客名", "対象者", "件名", "請求日", "支払期限",
  "合計金額", "入金額", "未入金残", "売上区分", "施行番号",
  "請求先名", "請求先郵便番号", "請求先住所", "発行会社", "計上担当者", "最終更新者",
];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function fmt(iso?: string | null) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export async function GET() {
  const invoices = await listInvoices();
  const lines = [COLS.join(",")];
  for (const iv of invoices) {
    const addr = [iv.invoiceTargetPrefecture, iv.invoiceTargetCity, iv.invoiceTargetStreet, iv.invoiceTargetBuilding].filter(Boolean).join("");
    lines.push([
      iv.invoiceNo ?? iv.id.slice(0, 8),          // 請求書ID
      iv.customerName ?? iv.mournerName ?? "",     // 顧客名
      iv.deceasedName ?? "",                       // 対象者
      iv.title ?? "",                              // 件名
      fmt(iv.billedOn),                            // 請求日
      fmt(iv.dueOn),                               // 支払期限
      iv.total ?? 0,                               // 合計金額
      iv.paidTotal ?? 0,                           // 入金額
      (iv.total ?? 0) - (iv.paidTotal ?? 0),       // 未入金残
      iv.saleCategory ?? "",                       // 売上区分
      iv.constructionNo ?? "",                     // 施行番号
      iv.invoiceTargetName ?? "",                  // 請求先名
      iv.invoiceTargetPostcode ?? "",              // 請求先郵便番号
      addr,                                        // 請求先住所
      iv.issuerCompany ?? "",                      // 発行会社
      iv.chargedUser ?? "",                        // 計上担当者
      iv.staffName ?? "",                          // 最終更新者
    ].map(esc).join(","));
  }
  // filename*: 請求書一覧_.csv
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoices.csv"; filename*=UTF-8''%E8%AB%8B%E6%B1%82%E6%9B%B8%E4%B8%80%E8%A6%A7_.csv`,
    },
  });
}
