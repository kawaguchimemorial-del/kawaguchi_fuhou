# 川口典礼 オンライン訃報案内・オンライン祭壇

株式会社川口典礼の、オンライン訃報案内＋オンライン祭壇システム。
（funeral.at-sougi.com 同等機能のクローン＋改善版）

## 技術スタック
- Next.js 16 (App Router) / React 19 / TypeScript
- Tailwind CSS 4
- Supabase（Auth / Postgres / Storage / RLS）※接続は後日
- zod / react-hook-form

## セットアップ
```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## 主要機能（実装状況は docs/02-roadmap-progress.md 参照）
- オンライン訃報案内（`/m/[slug]`）
- オンライン式場・祭壇（`/m/[slug]/venue`）
- バーチャル焼香 / お悔やみメッセージ（承認制）/ 供花注文
- 香典オンライン決済（Stripe Connect・法務確定後）

## ドキュメント
- `docs/01-unified-spec.md` … 25人専門家による統合仕様・改善設計書
- `docs/04-atsougi-screens-spec.md` … 実画面分析（クローン一次情報）
- `docs/02-roadmap-progress.md` … 実装ロードマップ進捗
- `docs/logs/BUILD-LOG.md` … 構築ログ（時系列）

## データベース
`supabase/migrations/` にスキーマSQL。Supabaseプロジェクトは後日接続予定。
それまでは `lib/memorial/data.ts` のシード＋インメモリストアで動作。

> 注: 実調査の巡回結果（個人情報を含む）と認証情報を含むスクリプトは `.gitignore` で除外しています。
