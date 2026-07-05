import { listMasterItems } from "@/lib/kanri/masters";

export const dynamic = "force-dynamic";

// 実スマート葬儀「発注先一括登録フォーマット.csv」と同一の14列
const COLS = ["発注先ID(空の場合は新規登録)", "適格請求書発行事業者", "適格請求書発行事業者登録番号", "発注先名", "メールアドレス", "電話番号", "FAX番号", "郵便番号", "都道府県", "市区町村", "番地", "建物名など", "非表示", "順番"];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

export async function GET() {
  const rows = await listMasterItems("supplier");
  const lines = [COLS.join(",")];
  rows.forEach((m, i) => {
    lines.push([
      m.id,                       // 発注先ID
      "",                         // 適格請求書発行事業者
      m.extra?.invoice_no ?? "",  // 登録番号
      m.name,                     // 発注先名
      m.extra?.email ?? "",       // メールアドレス
      m.extra?.tel ?? "",         // 電話番号
      m.extra?.fax ?? "",         // FAX番号
      m.extra?.postcode ?? "",    // 郵便番号
      m.extra?.prefecture ?? "",  // 都道府県
      m.extra?.address_city ?? "",// 市区町村
      m.extra?.address_street ?? "", // 番地
      m.extra?.address_building ?? "", // 建物名など
      m.isActive ? "" : "1",      // 非表示
      i + 1,                      // 順番
    ].map(esc).join(","));
  });
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''%E7%99%BA%E6%B3%A8%E5%85%88%E4%B8%80%E6%8B%AC%E7%99%BB%E9%8C%B2%E3%83%95%E3%82%A9%E3%83%BC%E3%83%9E%E3%83%83%E3%83%88.csv` } });
}
