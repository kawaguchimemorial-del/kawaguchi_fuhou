# 自社アット葬儀 — 構築ログ (BUILD-LOG)

> このファイルは全作業の時系列ログ。後から「いつ・何を・なぜ」やったか追跡できるようにする。
> 各セッションの先頭に日付と概要を追記していく。新しいエントリは下に追加。

---

## 2026-06-28 — セッション#1: 調査・基盤決定

### やったこと
- ログイン情報確認: `tmp/IDPASS.txt`（kawaguchi.memorial@gmail.com）
- 対象サイト `funeral.at-sougi.com` を調査
  - JSレンダリング型SPAのためWebFetchではタイトルのみ取得（要ログイン）。
  - Web検索で公開機能仕様を把握。
- 既存環境 `f:\LP\01\myweb\glifejapan` の技術スタック確認:
  Next.js 16 / React 19 / Supabase(@supabase/ssr) / Tailwind 4 / base-ui / react-hook-form。Node v24。
- ユーザー意思決定:
  1. 構築場所 = **F:\自社アット葬儀 に新規構築**（独立した自社製品）
  2. 25人専門家 = **マルチエージェントWorkflowで実施**

### 把握したアット葬儀の機能（公開情報ベース）
1. **オンライン訃報案内** — 訃報をメール/SNSで送付、受信者が案内確認・供花供物注文可。
2. **オンライン祭壇** — 祭壇/会場/故人の思い出を静止画・動画で閲覧。
3. **オンライン香典決済** — 参列者がクレカ決済、喪主へ届ける。現金管理不要。
4. **メッセージ機能** — 喪主/遺族へメッセージ+画像送信（お悔やみ・思い出話）。
5. **供花・供物オンライン注文** — 訃報受信者から直接注文受付。

### プロジェクト雛形作成（完了）
- create-next-appは日本語フォルダ名で失敗 → 手動で雛形作成（package名 `jisha-at-sougi`）。
- 構成: Next.js 16 / React 19 / Tailwind 4 / @supabase/ssr / zod / react-hook-form。glifejapanに準拠。
- 作成物: package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs, .gitignore,
  app/{layout,page,globals.css}, lib/utils.ts, lib/supabase/{client,server}.ts, types/database.ts(仮),
  .env.example。
- `npm install` 成功（moderate脆弱性2件・後で対応）、`tsc --noEmit` 0エラー。
- デザイン方針: 和紙生成り背景＋墨色文字、Noto Sans/Serif JP、本文17px・行間1.8（高齢者配慮）。

### 25人専門家Workflow（完了）
- 26エージェント・約68万トークン・約7.5分で完了。25人全員回答。
- 統合仕様書を `docs/01-unified-spec.md`（451行）に保存。9章構成（要件/改善/非機能/データモデル/アーキ/リスク/ロードマップ28ステップ）。
- 重要指摘: ①超最短公開フロー ②香典は資金決済法リスク→Stripe Connectで喪主直接帰属 ③プライバシー既定 ④宗派出し分け ⑤高齢者モバイル ⑥マルチテナントRLS ⑦グリーフ配慮トーン。

### 実装ループ#1（フェーズ0-2 / 1-8 完了）
- `supabase/migrations/0001_core_tenant_memorial.sql` 作成: funeral_homes/profiles/memorials/memorial_members/
  deceased/funeral_events/memorial_revisions/audit_logs。enum群・updated_atトリガ・JWTクレーム駆動RLS
  (deny-by-default+FORCE)・obituary_public_view(PII除外)。
- ドメイン層: `lib/memorial/{types,religion,data}.ts`、`lib/format.ts`。宗派語彙辞書（焼香/玉串/献花・表書き・浄土真宗配慮）。
- データ層 `lib/memorial/data.ts` はシード返却（Supabase接続時に view 参照へ差し替え予定、UI無改修）。
- 公開訃報ページ `app/m/[slug]/page.tsx`: 遺影/故人/略歴・日程会場タイムライン・喪主・辞退案内・
  下部固定アクションバー（焼香/お悔やみ/香典/供花を辞退フラグ・締切で出し分け）・限定公開はnoindex厳守。
- 検証: `tsc --noEmit` 0エラー / `next build` 成功（/ と /m/[slug] 生成）。サンプル: /m/sample-haruko。

## 2026-06-29 — セッション#2: 実ログイン調査

### やったこと
- Playwright + Chromium を導入（私が実行）。`scripts/crawl-atsougi*.mjs` で実アカウント自動ログイン・巡回（閲覧のみ）。
- ログイン成功（株式会社川口典礼 本社）。管理画面=`/my/{uid}/...`。11ページ取得（スクショ＋本文＋UI項目）→ `docs/research/atsougi/`。
- 分析を `docs/03-atsougi-real-analysis.md` に保存。

### 主要発見
- これは「葬儀社管理画面」。葬儀社が案件を代理作成・管理。喪主連携あり。
- 案件タイプ「訃報のみ / 訃報+式場」、テスト葬儀モード、オンライン会場公開期間(約2ヶ月)。
- 香典=「記帳」（オンライン香典帳、実データ多数。3,000〜30,000円）。
- 供花供物/贈答品/お悔やみのおくりもの のEC。**5日経過で自動売上計上**ルール。のし・配送先・税込。
- 設定: 葬儀社管理/ユーザー管理/商品登録(供花供物・贈答品)/メール設定(通知先・自動文言)。
- **ライブ配信は YouTube Live**（資料DLに手順書）。
- 未取得: 新規作成ウィザード全項目・参列者向け公開ゲストページ（SPAが実操作要・slug非露出）。

### 仕様反映
- docs/01 に追加すべき機能を docs/03 第7章にリスト化（タイプ切替/テストモード/公開期間/種別別締切/贈答品・レコメンドギフト/5日自動計上/ユーザー管理/YouTube Live/商品マスタ/自動メール文言）。

### 実ログイン調査 続き（ユーザー提供スクショ35枚を分析）
- `tmp/画面/*.png` に作成ウィザード全5ステップ・祭壇設定・オンライン式場・公開ゲストページ・供花注文フォーム等。
- 公開ゲストURL = `https://app.at-sougi.com/obituary/{uuid}`。運営=Microwave Co.。
- 分析を `docs/04-atsougi-screens-spec.md` に保存（作成フロー/祭壇レイヤー/公開ページ/配色トークン）。
- **重大発見**: オンライン祭壇は「レイヤー合成式」（遺影＋額縁7種＋左右花4種＋中央祭壇8種＋天板2種＋背景5種）。
- 確定配色: 紺#1b2a4a × 金茶#a8842f × 生成り#faf8f3、明朝見出し。テスト帯=赤。管理画面=紫。

### 実装ループ#2（実態に合わせて全面リファイン）
- globals.css 配色を実トークンに更新。共通部品 `components/guest/parts.tsx`（TestBanner/GoldButton/ShareRow/SiteFooter）。
- 訃報ページ `app/m/[slug]/page.tsx` を実レイアウトに刷新（金枠訃報文／記／式カード(GoogleMap)／オンライン式場導線／SNS共有／御用達／下部供花注文バー／テスト帯）。
- オンライン式場: `venue/page.tsx`（入場前TOP）＋ `venue/hall/page.tsx`（祭壇）。
- 祭壇合成コンポーネント `components/guest/AltarView.tsx`（額縁色/背景/中央/天板を反映。実PNG素材は後で差し替え）。
- 式場内: 焼香ボタン・ご記帳受付・葬儀の写真・アルバム・喪主挨拶・公開期間・SNS。
- 型/シード拡張（testMode/obituaryBody/OnlineVenue/AltarConfig）。
- 検証: next build 成功（5ルート）、dev で3画面 200。

### 実装ループ#3（弔意3機能 + ブランド変更）
- ブランド「＠葬儀/at SOUGI/おくやみ」→「川口典礼」に全面変更（フッター/タイトル/トップ）。
- 画像・素材系は最後にまとめて作成する方針に決定（[[asset-work-deferred]]）。
- 開発用インメモリストア `lib/memorial/store.ts` ＋ Server Actions `lib/memorial/actions.ts`（zod検証）。
- 供花商品マスタ `lib/memorial/products.ts`（画像なし暫定）。
- 実装ページ: `/m/[slug]/worship`（焼香・匿名可）, `/message`（お悔やみ・既定pending承認制）, `/flower`（供花注文・札名/旧字体/特商法同意・受付終了判定）。
- フォーム部品 `components/guest/forms/{WorshipForm,MessageForm,FlowerOrderForm}.tsx`（useActionState）。
- 検証: next build 成功（全8ルート）、dev で3ページ 200。
- 注: 永続化はインメモリ（再起動で消える）。Supabase接続時に各テーブルINSERTへ差し替え（TODOコメント記載済み）。

### Supabaseの現状（ユーザー質問への回答, 2026-06-29）
- **Supabaseプロジェクトはまだ作成していない**。現状あるのは `supabase/migrations/0001_*.sql`（スキーマSQL）のみ。
- config.toml・.env.local 共になし＝未初期化。仕様どおり「DBは後で構築」段階。
- 接続するには: ①Supabaseアカウントでプロジェクト作成（クラウド）or `supabase init`+`supabase start`（ローカル/Docker）、
  ②環境変数(.env.local)設定、③0001マイグレーション適用、④`lib/memorial/data.ts`/`store.ts` のTODOをクエリに差し替え。

### 次のステップ（ループ#4以降）
- [ ] 祭壇レイヤーの実PNG素材セット作成・差し替え（Canva/画像生成）
- [ ] バーチャル焼香 `/worship`・お悔やみ記帳 `/message`（承認制）
- [ ] 供花注文フォーム `/flower`（札名・旧字体・確認画面・特商法）
- [ ] 作成ウィザード5ステップ（管理側）
- [ ] DBスキーマに式1〜5/祭壇設定/公開期間/贈答品 を追加（0002マイグレーション）

### （旧）次のステップ（ループ#2以降）
- [ ] 1-6 超最短作成フロー（必須4項目）+プレビュー（喪主/葬儀社の管理UI）
- [ ] 1-7 アクセス制御4段階（passcode/invite RPC）+ 公開ビュー接続
- [ ] 2-12 バーチャル参拝、2-13 お悔やみメッセージ（承認制）
- [ ] 0-3 法務3点セット、Supabase実接続（ローカル/本番プロジェクト）
- [ ] ⏸ フェーズ3決済は法務レビュー後（Stripe Connect）
