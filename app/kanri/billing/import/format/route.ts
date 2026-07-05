export const dynamic = "force-dynamic";

// 実スマート葬儀「請求書一括CSVフォーマット.csv」と同一の50列ヘッダー
const INVOICE_IMPORT_COLS = ["ID（空の場合は新規登録）", "顧客氏", "顧客名", "顧客を同時に新規登録", "対象者", "請求書枝番", "施行番号", "件名", "請求日", "お支払い期限", "札名", "プラン", "仕入先", "取引日", "項目名", "単価", "下代", "消費税率", "数量", "立替金", "値引商品取引日", "値引商品項目名", "値引商品数量", "値引商品単価", "値引商品税率", "値引商品下代", "請求書に表示しない", "葬儀会場", "通夜会場", "葬儀日時", "通夜日時", "計上組織", "計上担当者", "計上先会館", "売上区分", "請求先", "請求先名", "郵便番号", "都道府県", "市区町村", "番地", "建物名など", "発行日", "伝票番号", "宛名", "入金方法", "入金種別", "入金額", "備考", "入金日"];

export async function GET() {
  const csv = "﻿" + INVOICE_IMPORT_COLS.join(",") + "\r\n";
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''%E8%AB%8B%E6%B1%82%E6%9B%B8%E4%B8%80%E6%8B%ACCSV%E3%83%95%E3%82%A9%E3%83%BC%E3%83%9E%E3%83%83%E3%83%88.csv` } });
}
