import { listInvoices, listInvoice8pctBreakdown } from "@/lib/kanri/invoices";

export const dynamic = "force-dynamic";

// 請求書一覧CSV（請求書ごとに1行。入金一覧CSVとは別物）。
// 会計ソフト取込用途: 税率別の税抜金額・消費税額を合計金額の前に出す。
// 8%(軽減税率)列は該当明細がある場合のみ値が入る（無ければ空欄）。
const COLS = [
  "請求書ID", "顧客名", "対象者", "件名", "請求日", "支払期限",
  "税抜金額（10%）", "税抜金額（8%）", "消費税額（10%）", "消費税額（8%）", "合計金額",
  "入金額", "未入金残", "売上区分", "施行番号",
  "請求先名", "請求先郵便番号", "請求先住所", "発行会社", "計上担当者", "最終更新者",
];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function fmt(iso?: string | null) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export async function GET() {
  const invoices = await listInvoices();
  const b8 = await listInvoice8pctBreakdown(invoices.map((i) => i.id));
  const lines = [COLS.join(",")];
  for (const iv of invoices) {
    const addr = [iv.invoiceTargetPrefecture, iv.invoiceTargetCity, iv.invoiceTargetStreet, iv.invoiceTargetBuilding].filter(Boolean).join("");
    const total = iv.total ?? 0;
    // 8%(軽減税率)分は明細から集計。無ければ空欄。
    const bd = b8.get(iv.id);
    const ex8 = bd?.ex8 ?? 0;
    const tax8 = bd?.tax8 ?? 0;
    // 10%分は合計金額から8%分を差し引いて逆算（税抜/消費税の合算が合計と必ず一致）。
    const inc10 = total - ex8 - tax8;               // 10%対象の税込金額
    const ex10 = inc10 > 0 ? Math.round(inc10 / 1.1) : 0;
    const tax10 = inc10 > 0 ? inc10 - ex10 : 0;
    lines.push([
      iv.invoiceNo ?? iv.id.slice(0, 8),          // 請求書ID
      iv.customerName ?? iv.mournerName ?? "",     // 顧客名
      iv.deceasedName ?? "",                       // 対象者
      iv.title ?? "",                              // 件名
      fmt(iv.billedOn),                            // 請求日
      fmt(iv.dueOn),                               // 支払期限
      ex10,                                        // 税抜金額（10%）
      bd ? ex8 : "",                               // 税抜金額（8%）※該当時のみ
      tax10,                                       // 消費税額（10%）
      bd ? tax8 : "",                              // 消費税額（8%）※該当時のみ
      total,                                       // 合計金額
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
