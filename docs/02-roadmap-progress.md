# 実装ロードマップ進捗トラッカー

> `docs/01-unified-spec.md` 第9章の28ステップに対する進捗。loopで1つずつ進める。
> 状態: ⬜未着手 / 🔄進行中 / ✅完了 / ⏸保留(法務/外部依存待ち)
> 各完了時に `docs/logs/BUILD-LOG.md` へ記録。

## フェーズ0: 基盤
- ✅ (env) Next.js+Supabaseクライアント雛形・デザイントークン下地
- ✅ 0-2 テナント/ユーザースキーマ + RLS(deny-by-default/FORCE) + audit_logs + 公開ビュー（`supabase/migrations/0001`）
- ⬜ 0-3 法務3点セット + legal_disclosures + consent_records
- 🔄 0-4 デザインシステム(@theme 色/17px/Noto JP) + 宗派語彙辞書(`lib/memorial/religion.ts`)。※ruby/reduced-motion/copy_messagesは残

## メモ: 現状はSupabase未接続。`lib/memorial/data.ts` がシードを返す。接続時は中身を obituary_public_view 参照に差し替えるだけ（UI無改修）。

## フェーズ1: 訃報案内コア（MVPの心臓）
- 🔄 1-5 memorials/deceased/funeral_events/revisions + 状態機械（SQL）
- ⬜ 1-6 超最短作成フロー(必須4項目)+プレビュー+後追い更新 + 代理作成→QR引継ぎ
- ⬜ 1-7 アクセス制御4段階 + noindex既定 + 公開ビュー(PII除外)
- ✅ 1-8 公開訃報ページ `/m/[slug]`（実レイアウト準拠：金枠訃報文/記/式カード/GoogleMap/オンライン式場導線/SNS共有/御用達/下部供花バー/テスト帯）
- ✅ 実調査(35枚スクショ)→`docs/04-atsougi-screens-spec.md`。公開URL=app.at-sougi.com/obituary/{uuid}、祭壇=レイヤー合成、配色確定
- 🔄 2-11 オンライン式場（入場TOP+祭壇`venue/hall`+AltarView合成+焼香/記帳/アルバム/喪主挨拶）。※実PNG素材差替が残
- ⬜ 1-9 LINE/メール/SMS/QR共有 + OGP

## フェーズ2: 弔意・祭壇・メッセージ
- ⬜ 2-10 メディアパイプライン
- ⬜ 2-11 オンライン祭壇ギャラリー
- ⬜ 2-12 バーチャル参拝(宗派別/連打抑止/aria-live)
- ⬜ 2-13 お悔やみメッセージ(承認制/忌み言葉/XSS対策)

## フェーズ3: 決済・送金（法務確定後）
- ⏸ 3-14 法務レビュー確定 → Stripe Connect オンボーディング
- ⏸ 3-15 香典決済 / ⏸ 3-16 Webhook基盤 / ⏸ 3-17 ペイアウト
- ⏸ 3-18 供花・供物 / ⏸ 3-19 返金・チャージバック

## フェーズ4: 実務価値・差別化
- ⬜ 4-20 RSVP+受付QR / ⬜ 4-21 香典帳エクスポート / ⬜ 4-22 通知自動化 / ⬜ 4-23 葬儀社KPI+請求

## フェーズ5: 継続・拡張
- ⬜ 5-24 継続供養 / ⬜ 5-25 ライブ配信+VOD / ⬜ 5-26 AI下書き/ルビ/読み上げ / ⬜ 5-27 多言語 / ⬜ 5-28 データ保持自動化

## 横断（全フェーズ並走）
- ⬜ セキュリティ / アクセシビリティ(axe) / パフォーマンス(CWV) / 可観測性 / テスト(RLS/決済冪等)
