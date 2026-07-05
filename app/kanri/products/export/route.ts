import { listProducts } from "@/lib/kanri/products";

export const dynamic = "force-dynamic";

// 実スマート葬儀「商品一括登録フォーマット.csv」と同一の26列
const COLS = ["ID（空の場合は新規登録）", "発注先", "商品種別:大", "商品種別:中", "商品種別:小", "商品種別:細", "商品コード", "商品名", "型番", "価格(税抜)", "価格(税込)", "税率", "下代(税抜)", "下代用税率", "非適格事業者用控除", "立替金", "商品説明", "非表示", "ECに表示する", "ホームページ内販売に表示する", "参列者のECに表示する", "返礼品のECに表示する", "一般販売品のECに表示する", "グループ商品として登録", "発注しない", "発注のみに利用する"];

function esc(v: string | number | null | undefined) { const s = String(v ?? ""); return s === "" ? '""' : /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

export async function GET() {
  const rows = await listProducts();
  const lines = [COLS.join(",")];
  for (const p of rows) {
    const withTax = Math.round(p.unitPrice * (1 + p.taxRate));
    const rateLabel = p.taxRate === 0 ? "非課税" : "課税";
    lines.push([
      p.id,                    // ID
      p.supplier ?? "",        // 発注先
      p.productKind ?? "",     // 商品種別:大
      "", "", "",              // 商品種別:中/小/細
      "",                      // 商品コード
      p.name,                  // 商品名
      "",                      // 型番
      p.unitPrice,             // 価格(税抜)
      withTax,                 // 価格(税込)
      rateLabel,               // 税率
      p.costPrice ?? 0,        // 下代(税抜)
      rateLabel,               // 下代用税率
      "", "",                  // 非適格事業者用控除 / 立替金
      p.note ?? "",            // 商品説明
      "",                      // 非表示
      "", "", "", "", "",      // EC系5列
      "", "", "",              // グループ商品 / 発注しない / 発注のみ
    ].map(esc).join(","));
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''%E5%95%86%E5%93%81%E4%B8%80%E6%8B%AC%E7%99%BB%E9%8C%B2%E3%83%95%E3%82%A9%E3%83%BC%E3%83%9E%E3%83%83%E3%83%88.csv` } });
}
