import { NextRequest } from "next/server";

// 供花/供物/贈答品 注文一覧のエクスポート（CSV/Excel互換のCSV・UTF-8 BOM）。
// TODO(supabase): offering_orders から当該案件・種別で取得して出力。現状はヘッダのみ。
const HEADERS = [
  "商品", "商品名", "数量", "金額(税込)", "支払い方法", "ステータス",
  "喪主名", "注文者", "注文日時", "法人・団体名", "メールアドレス", "領収書宛名",
];

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") ?? "flower";
  const csv = "﻿" + HEADERS.join(",") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${kind}.csv"`,
    },
  });
}
