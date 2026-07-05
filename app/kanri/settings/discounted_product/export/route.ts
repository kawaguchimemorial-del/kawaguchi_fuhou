import { listMasterItems } from "@/lib/kanri/masters";

export const dynamic = "force-dynamic";

// 実スマート葬儀「割引商品一覧.csv」と同一の14列
const COLS = ["ID（空の場合は新規登録）", "商品種別:大", "商品種別:中", "商品種別:小", "商品種別:細", "商品コード", "商品名", "型番", "価格", "税率", "下代", "下代用税率", "適用税率", "非表示"];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

export async function GET() {
  const rows = await listMasterItems("discounted_product");
  const lines = [COLS.join(",")];
  for (const m of rows) {
    lines.push([
      m.id,               // ID
      "その他",           // 商品種別:大（実データは「その他」運用）
      "", "", "",         // 中/小/細
      "",                 // 商品コード
      m.name,             // 商品名
      "",                 // 型番
      m.price ?? 0,       // 価格
      "課税",             // 税率
      0,                  // 下代
      "課税",             // 下代用税率
      "",                 // 適用税率
      m.isActive ? "" : "1", // 非表示
    ].map(esc).join(","));
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''%E5%89%B2%E5%BC%95%E5%95%86%E5%93%81%E4%B8%80%E8%A6%A7.csv` } });
}
