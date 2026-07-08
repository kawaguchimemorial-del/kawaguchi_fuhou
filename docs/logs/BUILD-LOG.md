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

### GitHub接続（2026-06-29）
- リポジトリ `https://github.com/kawaguchimemorial-del/kawaguchi_fuhou.git` に接続・push成功（main）。
- 機密除外: `.gitignore` で docs/research/（実顧客の香典帳=個人情報）と scripts/crawl-atsougi*.mjs（PW直書き）と .env.local を除外。
  ※.gitignoreは行末コメント不可。一度混入したが git rm --cached で除去済み。

### 実装ループ#4〜#7（管理画面・作成・決済・出欠を一気に構築、各loopでpush）
- #4 管理画面基盤(紫テーマ・サイドナビ)＋ダッシュボード(利用数/お知らせ/作成ドロップダウン)＋葬儀一覧(実列構成)。
- #5 作成ウィザード5ステップ(①喪主故人 ②訃報・香典(式1〜5・調整中フラグ・香典オプション) ③記帳 ④供花 ⑤オンライン式場・祭壇レイヤー設定)。
- #6 香典オンライン決済(プリセット3千〜5万・**金額サーバ再検証**・手数料負担選択・表書き宗派出し分け・芳名公開) ＋ Stripe Webhook骨組み(`/api/webhooks/stripe`・署名検証/dedup TODO) ＋ 香典帳管理(合計表示)。
- #7 香典帳**CSVエクスポート**(Excel BOM・半返し自動計算) ＋ 供花注文管理 ＋ **RSVP(WEB出欠)** ＋ 設定/贈答品/お悔やみ/資料DL/問い合わせ。
- 検証: next build 成功（全22ルート）、dev で主要12ルート 200。
- 永続化は全てインメモリ＋シード（再起動で消える）。Supabase接続時に差し替え（各所TODO記載）。

### 現状サマリ（ループ#7完了時点）
- ゲスト側: 訃報案内 / オンライン式場(祭壇/焼香/記帳/アルバム/喪主挨拶) / 焼香 / お悔やみ(承認制) / 香典決済 / 供花注文 / RSVP。
- 管理側: ダッシュボード / 葬儀一覧 / 作成ウィザード5段 / 香典帳(+CSV) / 注文一覧 / 設定 / 各種スタブ。
- 未了(意図的): 画像素材一式・Supabase実接続・Stripe実決済(法務後)・各設定の編集UI・通知配信・ライブ配信(YouTube)。

## 2026-06-29 — 仕様取り違えの是正（葬儀詳細フロー）
- ユーザー指摘: 葬儀一覧の「編集」/喪主名クリック後が実物と全然違う。
- 実物（スクショ再精読）: 「編集」→ **5ステップ再入力ではなく「葬儀詳細」1枚ページ**（セクション折りたたみ＋各セクション「登録内容を編集」）。
- 実仕様を **Skill `.claude/skills/atsougi-spec/SKILL.md`** に保存（葬儀詳細の全セクション・一覧・公開ページ・設定を網羅）。今後クローンを作る/直す前に必ず参照。
- **要対応(次)**: 現在の `/admin/ceremonies/[id]`(簡易詳細) と `/edit`(ウィザード再入力) を、実物の葬儀詳細1枚ページ＋セクション編集に作り直す。

### 次のステップ（ループ#8以降・要相談）
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

## 2026-06-29 — 供花注文フォームを本番運用化（ダミー→実商品マスタ）
- ユーザー指摘: 「ご注文はこちら」→注文フォームの**ご注文商品が設定した供花でなくダミーのまま**。
- 原因: 管理画面の供花は Supabase `offering_products_master` に保存済みだが、**公開側がDBを読まずハードコードのダミー `lib/memorial/products.ts`（棺中花/供花一基/供花一対の3点）を参照していた**。
- 修正:
  - `lib/memorial/db.ts`: 公開用 `getPublicProducts(type?)` を追加（`funeral_home_id`=デモID・`is_active=true`・`sort_order`順、service_roleで読取）。
  - `app/m/[slug]/flower/page.tsx`: DBから実商品を取得して `FlowerOrderForm` へ。未登録/DB未接続時のみダミーにフォールバック。
  - `lib/memorial/actions.ts`(submitOrder): 注文確定の商品名・価格をクライアント送信値でなくDBから再取得して照合（価格改ざん防止）。
- **Supabase実接続を確認**: `.env.local` の URL/SERVICE_ROLE_KEY 有効。REST直叩きで `offering_products_master` 取得→HTTP200・**9商品**（洋花23100/29400/44000・枕花12100/18150・バラ供花24200/31900/46200・棺中花22000、全て active）取得成功。スクショの供花一覧と完全一致。
- `npx tsc --noEmit` パス。コミット&プッシュ済み。

## 2026-06-29 — 供花注文フォームに商品画像サムネイルを追加
- ユーザー指摘: 注文フォームが文字と金額だけで画像が無く、客が選びにくい。
- 修正: `components/guest/forms/FlowerOrderForm.tsx` の商品選択リスト各行に80×80のサムネイル表示を追加（`imagePath`、object-cover・lazy）。画像未設定時は「画像準備中」プレースホルダ。
- 画像は `public/products/*.webp`（9枚実在）を商品マスタ `image_path`（例 `/products/yoka-23100.webp`）が参照。
- `npx tsc --noEmit` パス。コミット&プッシュ済み。

## 2026-06-29 — 供花注文フォームを画像中心UIに刷新＋画像拡大ライトボックス
- ユーザー要望: 供花画像が小さく選びにくい。PC/スマホとも中くらいに表示し、画像をタップ/クリックで元画像を拡大、✕や背景タップで閉じられるように。
- 修正 `components/guest/forms/FlowerOrderForm.tsx`:
  - 商品リストを縦並びの小サムネ→**レスポンシブカードグリッド**（mobile1列/sm2列）。画像は `h-44 w-full object-cover` の中サイズ。
  - 画像はボタン化し**ライトボックス拡大**（`max-h-[85vh]` の元画像）。背景タップ・✕ボタン・Escキーで閉じる。ラジオ選択とは独立（preventDefault/stopPropagation）。
  - 「タップで拡大」バッジ／案内文を追加。選択中カードは accent リング表示。
- `npx tsc --noEmit` パス。コミット&プッシュ済み。

## 2026-06-29 — SNS共有ボタンを新ボタン画像に差し替え
- ユーザー提供: `tmp/ボタン/` に新しい共有ボタン画像（Facebook/LINE/MAIL/SMS/X）。
- 対応:
  - 各PNG(約900KB)を sharp で160pxの透過webp(約4-5KB)に最適化し `public/share/`（facebook/x/line/mail/sms.webp）に配置。
  - `components/guest/parts.tsx` の `ShareRow` を lucideアイコン+紺丸背景 → 新ボタン画像(`<img className="h-10 w-10">`)に差し替え。lucide import削除。
  - リンク先(facebook sharer / x intent / line.me / mailto / sms)は従来どおり。
- 反映先: 共通部品のため**訃報案内ページ `/m/[slug]`** と **オンライン式場 `/venue/hall`** の両方に自動反映。
- `npx tsc --noEmit` パス。コミット&プッシュ済み。

## 2026-06-30 — 管理画面のスマホ表示修正（ナビが出ずメニュー到達不可）
- ユーザー報告: スマホで管理画面のマイページを開くと、PCで出る「葬儀一覧」以下のメニューが表示されず到達できない。
- 原因: `app/admin/layout.tsx` のサイドナビが `hidden md:block`（PC専用）で、**モバイル用ナビが無かった**。
- 修正:
  - ヘッダー下に **モバイル用ナビ（`md:hidden`・横スクロールのピル型リンク）** を追加。マイページ/葬儀一覧/注文一覧/設定/資料DL/お問い合わせを網羅。
  - NAV配列に「各種お問い合わせ」を統合（PC側も同配列から描画）。
  - `main` に `min-w-0` を付与しflex子要素の横はみ出しを防止。
- 葬儀一覧テーブルは既に `overflow-x-auto` 済みで問題なし。
- `npx tsc --noEmit` パス。コミット&プッシュ済み。

## 2026-06-30 — 遺影写真アップロード機能を実装（オンライン式場の祭壇に表示）
- ユーザー要望: 遺影写真(jpg/png)をアップロードしオンライン会場の写真部分に表示。アップロードは「葬儀詳細 › オンライン式場 › 登録内容を編集」に。5MB超は不可。
- 実装:
  - `lib/admin/actions.ts`: `uploadPortrait(formData)` 追加。jpg/png限定・**5MB上限**を検証、sharpでEXIF回転反映＋長辺1200pxにリサイズしWebP(q85)化、`product-images` バケットの `portraits/<fh>/<uuid>.webp` に保存し公開URLを返す。`CeremonyPayload.portraitPath` を追加し `venue.altar.portraitPath` に保存。
  - `components/admin/CeremonyWizard.tsx`: StepVenue（オンライン式場）の「祭壇設定」に `PortraitUpload`（プレビュー＋選択/変更/削除、クライアント側でも5MB・形式チェック）を追加。handleSaveのpayloadに `portraitPath` を連携。
  - 表示: `venue` jsonb はRPC `get_public_obituary`(0004)が返却→`AltarView` が既存の `altar.portraitPath` を参照して祭壇の遺影枠に表示。バケットは公開読取(0007)済み。
- form_state に丸ごと保存されるため編集再開時もプレビュー復元。
- `npx tsc --noEmit` パス。コミット&プッシュ済み。

## 2026-06-30 — 遺影アップロードが反映されない不具合を修正（Server Actionボディ上限）
- ユーザー報告: 遺影をアップロードしてもプレビューに出ず、更新しても式場に表示されない。
- 原因: **Next.js Server Actions の既定ボディ上限が1MB**。数MBの写真をFormDataで渡すと拒否され、`uploadPortrait` が失敗していた（Supabase/sharp/Storageは正常）。
- 修正: `next.config.ts` に `experimental.serverActions.bodySizeLimit: "8mb"` を設定（5MB画像＋オーバーヘッドを許容）。
- 検証(Playwright・dev): 2.69MBのJPEGをアップロード→プレビューにSupabase webp URL表示・エラーなし。`venue.altar.portraitPath` を設定し公開式場 `/m/[slug]/venue/hall` で祭壇の遺影枠(alt=ご遺影)に画像描画を確認。検証用データ・Storageオブジェクトは片付け済み。
- ※同上限は商品画像アップロードにも影響していたため併せて解消。

## 2026-06-30 — 遺影アップロードを署名付き直接アップロードに刷新（本番の上限問題を根治）＋編集時プレビュー復元
- ユーザー報告: 8MB設定後もプレビュー/式場に表示されない。編集時に既存写真もプレビュー表示が必要。新規アップロード時のみ更新したい。
- 根本原因: Server Action経由のFormDataアップロードは **Vercelのサーバーレス関数ボディ上限(約4.5MB)** に阻まれ、本番で5MB級の写真が失敗していた（dev(8MB)では成功するため見抜きにくい）。
- 解決（方式変更）:
  - `lib/admin/actions.ts`: `uploadPortrait`(ファイル受信)を廃止し、**`createPortraitUploadUrl(ext)`**（署名付きアップロードURLを発行・ファイルは送らない極小ペイロード）に変更。sharp依存も削除。
  - `components/admin/CeremonyWizard.tsx` `PortraitUpload`: ①サーバーで署名URL発行→②**ブラウザからSupabase Storageへ直接 `uploadToSignedUrl`**→③公開URLをstateに反映。Next/Vercelのボディ上限を完全回避。jpg/png・5MBの検証はクライアントで実施。キャッシュ対策に `?v=` 付与。
  - 編集時の既存写真復元: `getCeremonyFormState` で form_state に portraitPath が無くても **`venue.altar.portraitPath` から補完**。→ 編集を開くと既存遺影がプレビュー表示。
  - 新規アップロード時のみ更新: 保存時 `portraitPath=g("portraitPath")`（復元値を保持、新規アップロードで置換、削除ボタンで明示クリア）。
- 検証(Playwright・dev, 2.69MB JPEG): ①アップロード→プレビュー表示 ②編集再開で既存写真プレビュー復元 ③公開式場 `/m/[slug]/venue/hall` の祭壇遺影に表示、すべてOK。テストデータ/Storageは片付け済み。
- `npx tsc --noEmit` パス。

## 2026-06-30 — 遺影がDBに保存されず式場に出ない不具合を修正（アップロード即時保存）
- ユーザー報告: アップロードはされるが、オンライン式場の遺影部分に反映されない（松澤様の式・スクショで「ご遺影」プレースホルダのまま）。
- 原因: 当該案件は `form_state` が空のため、フォーム全体保存(`updateCeremony`)が「故人名必須」guardで失敗し、遺影URLがDBに永続化されていなかった（Storageには上がっている）。`venue.altar.portraitPath`/`form_state.portraitPath` ともに未保存だった。
- 解決: フォーム全体保存に依存せず、**アップロード成功時点で遺影だけを即DB保存**する `savePortrait(slug, url|null)` を追加。`venue.altar.portraitPath`・`form_state.portraitPath`・`deceased.portrait_path` を更新。`PortraitUpload` に `editSlug` を渡し、編集中の案件はアップロード/削除の直後に即保存（「保存しました」表示）。新規作成時は従来どおり最終保存で確定。
- 検証(Playwright・dev, form_state空の実案件 cb4cea): アップロード→緑「保存しました」→DBに altar/form_state 保存確認→公開式場 `/m/[slug]/venue/hall` の祭壇遺影に表示、すべてOK。テストデータ/Storage片付け済み。
- `npx tsc --noEmit` パス。

## 2026-06-30 — 「やはり表示されない」の真因＝デプロイ反映前のアップロード（本番で実動作を確認）
- 調査: Storageにユーザー由来の `0ba23764….jpg` が存在するがDBの portraitPath は空。ファイル作成 16:46:38 JST に対し savePortrait修正(47ad689)のpushは 16:44:24 JST。**Vercelビルド完了前(約2分後)にアップロードしたため旧コード(保存処理なし版)が稼働**していた＝Storageには上がるがDB未保存。
- 本番URL特定: `https://kawaguchi-fuhou.vercel.app`。
- 本番(Playwright)で実検証: 編集step4でアップロード→緑「保存しました」→プレビュー表示→本番式場 `/m/[slug]/venue/hall` の祭壇遺影に表示、**すべてOK**。最新コードはデプロイ済みで正常動作。テストデータ/Storageは片付け済み。
- 結論: コードは正しく本番で動作する。ユーザーは**最新デプロイ後に再アップロード**すれば反映される（push直後の即アップロードはビルド未完了で旧コードに当たる点に注意）。
- `next build` 成功。venue/hall は ƒ(動的) でキャッシュなし。

## 2026-06-30 — オンライン式場の遺影を拡大（PC大きく・モバイル調整）
- ユーザー要望: 式場の遺影が小さい。PCはもっと大きく、モバイルも調整。
- 修正:
  - `components/guest/AltarView.tsx`: 遺影額縁を `h-40 w-32`(固定) → **`h-48 w-40 sm:h-64 sm:w-52 md:h-80 md:w-64`**（レスポンシブ拡大）。左右花の絵文字も `sm:text-5xl md:text-6xl`。祭壇コンテナ `max-w-md → sm:max-w-lg md:max-w-2xl`。
  - `app/m/[slug]/venue/hall/page.tsx`: 祭壇セクションをPCで本文幅(max-w-xl)を超えて広く表示（`md:left-1/2 md:w-[90vw] md:-translate-x-1/2`、フルブリード）。
- 検証(Playwright): 遺影フレーム PC=256×320px(旧128×160の2倍)・モバイル=160×192px。PC/モバイルとも**横スクロールなし**。スクショで見た目良好。
- `npx tsc --noEmit` パス。

## 2026-07-02 — オンライン式場設定の既定値をフォーム表示にも反映
- ユーザー要望: オンライン式名=「故人名＋オンライン葬儀会場」、挨拶文見出し=既定「喪主挨拶」、挨拶文右下=入力済み喪主名を既定表示。
- 現状: 保存時(handleSave)は既定フォールバック済みだったが、**見出しがフォーム上で空欄表示**（placeholderのみ）だった。
- 修正 `components/admin/CeremonyWizard.tsx` StepVenue:
  - 見出しを汎用Text→専用inputに変更し `greetingHeading = g("greetingHeading") || "喪主挨拶"` を初期表示。
  - オンライン式名は従来どおり `defaultVenueName`（故 ●● 儀　オンライン葬儀会場）を初期表示。
  - 挨拶文右下は従来どおり `喪主 {入力済み喪主名}` を初期表示。
- `npx tsc --noEmit` パス。

## 2026-07-02 — 供花注文設定の文言修正（他社サービス名を除去）
- ユーザー指摘: 供花・供物の注文方法選択の「＠葬儀の注文フォームを利用」は他社サービス名なので「注文フォームを利用」に。
- 修正 `components/admin/ProductSettings.tsx`: ラジオ文言を「注文フォームを利用」に変更（外部注文システム側は変更なし）。

## 2026-07-02 — 葬儀一覧: 行クリックで詳細（編集）へ遷移・公開ページボタン削除
- ユーザー要望: 一覧の行（枠）クリックで編集ページへ飛ぶ仕様に。公開ページボタンは不要。
- 修正:
  - `components/admin/CeremonyRow.tsx`（新規・client）: 行全体を `onClick`で `/admin/ceremonies/{id}` へ遷移、cursor-pointer＋hover。
  - `app/admin/ceremonies/page.tsx`: 各行を CeremonyRow に置換。末尾の操作列（編集/公開ページ）を撤去し、ヘッダーの空列も削除。喪主名は行内テキスト表示に。
- `npx tsc --noEmit` パス。

## 2026-07-02 — 編集時に既存内容が空欄になる不具合を修正（実データから復元）
- ユーザー報告: オンライン式場編集ボタンを押すと中身が空で表示される。既存内容が入った状態で編集したい（他の編集も同様に）。
- 原因: 編集は `form_state` からのみ復元。`form_state` が未保存/不完全な既存案件（例 cb4cea）は全項目が空になっていた（実データは memorials/deceased/funeral_events/venue に存在）。
- 修正 `lib/admin/actions.ts` `getCeremonyFormState`:
  - `reconstructState()` を追加し、memorial/deceased/funeral_events/venue から各ウィザード項目を復元（故人・カナ・没日・享年・続柄・喪主名(announceから推定)・訃報タイトル/本文・儀式形態・香典/供花受付・式1日時/会場・オンライン式名・挨拶見出し/本文/署名・公開日時・入場制御・祭壇レイヤー・遺影）。
  - form_state を優先し、欠けている項目のみ復元値で補完してマージ。
- 効果: 全編集ボタンで現在の内容が表示される。単一セクション編集で保存してもデータが消えない（全項目が揃うためguard通過＆再構築）。
- 検証(Playwright・cb4cea/form_state空): step0/1/4すべて既存内容が復元表示されることを確認。`npx tsc --noEmit` パス。

## 2026-07-02 アルバム専用の登録・編集画面を新設
- 課題: 葬儀詳細の「アルバム」セクションの編集ボタンが葬儀編集ウィザードへ遷移し、写真をアップロードできなかった。
- 追加 `lib/admin/actions.ts`:
  - `createAlbumUploadUrl(ext)` … album/ 配下への署名付きアップロードURL発行（遺影と同方式）。
  - `saveAlbum(slug, paths[])` … venue.albumPaths / form_state.albumPaths を即時保存（最大30枚）。
  - `CeremonyPayload.albumPaths` を追加、`buildRows` でウィザード保存時も既存アルバムを温存（従来は `[]` で消えていた）。
- 追加 `components/admin/AlbumManager.tsx` … 複数選択で最大30枚アップロード（JPG/PNG・5MB）、サムネイル一覧・個別削除・即時保存。
- 追加 `app/admin/ceremonies/[id]/album/page.tsx` … アルバム登録・編集ページ。オンライン式場未設定時は案内表示。
- 変更 `app/admin/ceremonies/[id]/page.tsx` … 「アルバム」セクションの編集ボタンを `/album` 専用画面へ。
- 変更 `components/admin/CeremonyWizard.tsx` … 保存ペイロードに `albumPaths` を温存渡し。
- 検証: `npx tsc --noEmit` パス。

## 2026-07-02 「故人の写真」→「葬儀の様子」に変更し複数写真アップロード対応
- 変更 `lib/memorial/types.ts`: OnlineVenue に `scenePaths?: string[]`（葬儀の様子）を追加。ceremonyPhotoPath は旧仕様フォールバックとして残置。
- 変更 `lib/admin/actions.ts`:
  - `saveAlbum` → `saveVenuePhotos(slug, field, paths)` に汎用化（field: albumPaths | scenePaths）。
  - CeremonyPayload / buildRows に scenePaths を追加しウィザード保存時も温存。
  - getCeremonyFormState: form_state に無い旧案件でも venue から albumPaths/scenePaths を取り込み温存。
- 変更 `components/admin/AlbumManager.tsx`: field/lead/note を props化しアルバム・葬儀の様子で共用。
- 追加 `app/admin/ceremonies/[id]/scene/page.tsx`: 葬儀の様子の登録・編集ページ（旧単写真からの初期取込あり）。
- 変更 `app/admin/ceremonies/[id]/page.tsx`: 「故人の写真」セクションを「葬儀の様子」に変更、/scene 専用画面へ。
- 変更 `app/m/[slug]/venue/hall/page.tsx`: 公開側を「葬儀の様子」複数写真ギャラリー（AlbumGalleryライトボックス）に変更。旧単写真はフォールバック表示。
- 検証: `npx tsc --noEmit` パス。

## 2026-07-02 オンライン祭壇の額縁を透過PNG画像で重ね、額縁選択を画像化
- 追加 `lib/memorial/altar-frames.ts`: 額縁キー(黒/黒リボン/白/白花/グレー/ピンク/ブルー)・旧名エイリアス正規化・public/tmp/オンライン祭壇/額縁/png/ のPNG URL生成(日本語パスencodeURI)。
- 変更 `components/guest/AltarView.tsx`: 遺影写真の上に透過PNG額縁を絶対配置で重ねて実写風に表示（写真は開口内側に inset 配置）。旧CSS枠色(FRAME_COLOR)は廃止。
- 変更 `components/admin/CeremonyWizard.tsx`: 額縁選択を文字Pillsから見本画像クリック選択(FramePicker)へ。FRAMES定数を撤去しキーをファイル名基準に統一。
- 素材はPNGのまま（透過維持のため変換しない）。
- 検証: `npx tsc --noEmit` パス。

## 2026-07-02 オンライン祭壇を実素材レイヤー合成に刷新＋焼香/線香の煙演出
- 素材の偽透過を修正: 追加素材PNG（額縁/花飾り/祭壇中央/天板）は書き出し時にチェッカー柄が焼き込まれた偽透過だった。`scripts/clean-altar-assets.mjs`（sharp・四辺＋額縁中央からのフラッド塗り＋トリミング）で実透過に復元し `public/altar/{frame,side,center,top,bg}/` へ生成。背景は不透明なのでコピー。
- 追加 `lib/memorial/altar-assets.ts`: 背景/天板/花飾り/中央の設定値→画像パス対応、煙有無(centerHasSmoke)、ボタン文言(worshipButtonLabel)。
- 変更 `components/guest/AltarView.tsx`: CSS/絵文字表現をやめ、背景→遺影＋額縁→天板→花飾り左右→中央（焼香/線香/花）を％絶対配置で合成するクライアント実装に刷新。interactive時はお焼香/お線香ボタンで煙アニメを開始。
- 追加 `app/globals.css`: 焼香・線香の煙アニメーション（altar-smoke／灰色半透明のパフが立ちのぼる）。
- 変更 `app/m/[slug]/venue/hall/page.tsx`: AltarView interactive を使用。参拝記録は「ご記帳して〜を残す」リンクを併設。
- 変更 `components/admin/CeremonyWizard.tsx`: 祭壇設定を画像セレクタ（ImagePicker：花飾り/中央/天板/背景）＋合成ライブプレビュー(AltarView)に刷新。
- 検証: 実葬儀(cb4cea)でPlaywrightスクショ確認（式場の祭壇合成・お焼香ボタン→煙・管理画面プレビュー/セレクタ）。`npx tsc --noEmit` パス。

## 2026-07-02 祭壇レイヤーの配置・サイズ調整＋煙の強化/自動停止
- 遺影を拡大（h-48%→62%）。線香選択時も顔が線香の上に見えるように。
- 花飾りを内側へ（left/right 20%→29%）、高さ微調整で天板上に自然に配置。
- 中央素材を種別で出し分け（altar-assets: centerKind）。焼香台は幅広(w-26%)・高め、線香は細く(w-13%)高め、花は中間。位置を上げて天板の上に乗るよう調整。
- 煙を強化（濃いグレー・不透明度UP）。無限ループをやめ、2回立ちのぼって停止（animation forwards＋11秒でsmoking解除）。
- 検証: 実葬儀(cb4cea)で焼香/線香プレビューと煙演出をPlaywright確認。`npx tsc --noEmit` パス。

## 2026-07-04 @葬儀 実データを本番へ全件移植
- @葬儀(funeral.at-sougi.com, 川口典礼本社アカウント)からPlaywrightでログインし、バックエンドAWS AppSync GraphQL(`oupznmtwiffxror7a5yltaxeaq.appsync-api...`)をイントロスペクション。`ceremonies`/`ceremony(id)`/`offeringOrders`/`offeringOrder(id)`のクエリをリプレイして全件抽出。
- 取得: 葬儀206件・式251・供花供物注文337明細。tmp/scrape/data/*.json に保存。
- クローンSupabaseへ取り込み(tmp/scrape/30-import.mjs)。memorials/deceased/funeral_events/offering_orders、slug=@葬儀のceremonyId、funeral_home_id=デモID。エラー0。
  - event_type enum: 枕経→法要、「なし」→除外。religion: formality→religion_type変換。
- メディア: img.at-sougi.com はCloudFront署名(cookie/クエリ)必須。管理詳細`/my/{uid}/ceremonies/{cid}`が閉鎖案件含め署名URLで全メディア配信 → アコーディオン展開で署名URL捕捉→Node fetch→Supabase Storage(memorial-media, public)へ再ホスト→venue JSONB(altar.portraitPath/albumPaths/scenePaths/videos/youtube)更新。(tmp/scrape/43-admin-media-migrate.mjs)
  - メディア有り式場63件を巡回。遺影(portrait-generated)は素の顔写真でクローン祭壇にそのまま合成可。動画はVimeo(vimeoId)。
- クローン改修: オンライン式場ページに動画(Vimeo/YouTube)表示セクション追加。/admin/orders をoffering_orders接続(listAllOrders)で全注文表示。
- 検証: 本番 kawaguchi-fuhou.vercel.app の葬儀一覧(206)/葬儀詳細/供花供物注文一覧(337)/オンライン式場(遺影・アルバム)をPlaywrightで表示確認。`npx tsc --noEmit`パス。

## 2026-07-05 閲覧数を「訃報案内の閲覧者数」に変更＋煙調整
- 閲覧数指標を式場入場(venue)から「訃報案内(obituary)の閲覧者数」に変更。訃報ページ(/m/[slug])に logView(slug,"obituary") を追加し記録開始。葬儀詳細・閲覧一覧を kind=obituary で集計（累計・直近30分、同一IP=1）。ラベルを「訃報案内 閲覧数一覧/閲覧一覧」に。
- 入場カウント修正: memorial_views.ip_hash 列を pooler(aws-1-ap-northeast-2) 経由で適用。getIpHash をランタイム非依存(Web Crypto)＋複数ヘッダ(x-vercel-forwarded-for等)対応に。※このpushは認証失効のためユーザー手動push待ち。
- 焼香の煙: パフ4→7本、青白い薄グレー(生成り背景でも視認)、box-shadow輪郭、自動停止13s。

## 2026-07-05 式場のご記帳/メッセージ強化・過去動画の管理再生
- 式場: 「ご記帳して焼香を残す」リンクを削除。「受付はこちら」の横に「頂いたご記帳の一覧」ボタン追加。
- お悔やみメッセージ: 画像を最大3枚(各5MB)アップロード可能に。クライアントからSupabase Storage(condolenceバケット, public, 5MB/画像mime制限, anon insertポリシー)へ直アップし、condolence_messages.image_paths(text[])に保存。送信後は /m/[slug]/messages(一覧)へ遷移。
- メッセージ一覧ページ /m/[slug]/messages を新設(名前/メッセージ/画像を一覧、非表示・却下を除く)。getPublicMessages(service_role)。
- 過去施行のVimeo動画は at-sougi ドメインにリファラ制限され当サイトから再生不可 → サーバープロキシ /api/vid/[id] で at-sougi リファラを付与しHLS(マスター/プレイリスト/セグメント)を中継、SSRF対策(Vimeoホスト限定)。クライアントは hls.js(HlsPlayer, クリックで再生)。管理式場ビュー・公開式場の動画をこのプレイヤーに差し替え。ローカルで再生(readyState4)確認。

## 2026-07-04 供花供物注文の詳細/日付・式場内容確認・アルバム表示（後日追記 / commit 26d4afc）
※ 当時BUILD-LOG未記載だったため2026-07-05に後追いで記録。
- 供花・供物注文の**注文日時**を@葬儀の実注文日時(orderId=epoch秒)から復元して再取り込み（一括移植でcreated_atが同時刻になっていた問題を修正）。
- 供花・供物注文一覧（全体/案件）の**各行をクリックで注文詳細ページ** `/admin/orders/[id]` へ。詳細に商品明細・合計・ステータス・注文日時・対象葬儀・注文者/法人/札名/住所/電話/メール/領収書宛名を表示（getOrderDetail）。
- オンライン式場セクションに「**オンライン式場を表示**」ボタン追加。公開終了案件でも当時の式場(遺影/写真/アルバム/動画/挨拶)を管理プレビュー `/admin/ceremonies/[id]/venue` で確認可能に。
- 葬儀詳細の「葬儀の様子」「アルバム」を**サムネイル表示**（クリックで拡大）。
- `getAdminMemorial` を新設し、管理の葬儀詳細/アルバム/葬儀の様子/式場を**公開状態非依存**で表示（公開終了195件も管理側で閲覧可、公開ゲスト /m は従来通りpublishedのみ）。
- `/admin/orders` を offering_orders 接続（listAllOrders）に実装、移植注文337件を一覧表示。
- 葬儀一覧を**公開日(published_at)の降順**ソートに変更（一括移植でcreated_atがほぼ同時刻になり並びが崩れていたため / commit 162ace2）。

## 2026-07-05 注文一覧のerror除外・CSV/Excel実データ出力・訃報PDF/Word出力
- ユーザー指摘: 供花・供物注文一覧で status=error(決済未成立)を表示しない／CSV・Excelに一覧データが入っていない／訃報の印刷DL(PDF/Word)が準備中のまま。
- 対応:
  - 注文取得(listOrders/listAllOrders/getOrdersForExport)で `status != error` を除外（error=決済が通っていない注文）。
  - `/admin/ceremonies/[id]/orders/export` を実データ出力に実装。CSV(UTF-8 BOM) と Excel(HTMLテーブル .xls, application/vnd.ms-excel) の両方に、注文日時/ステータス/商品名/数量/金額/注文者/法人/札名/郵便番号/住所/電話/メール/領収書宛名/喪主名/故人名 を出力。errorは除外。
  - 訃報・香典の「印刷ダウンロード」を実装。`/admin/ceremonies/[id]/obituary?fmt=doc` は application/msword(.doc)で直接DL、`?fmt=pdf` は印刷用HTML(window.print()で日本語をPDF保存)。getAdminMemorialから訃報文・故人・喪主・式・儀式形態・葬儀社を生成。
- 検証: 菅原(3 captured + 1 error)でCSV=3行・error除外を確認、Excel content-type確認、doc/pdf生成確認。`npx tsc --noEmit` パス。

## 2026-07-05 葬儀管理ソフト(スマート葬儀クローン) Phase1: 基盤＋顧客管理
- スマート葬儀(app.smartsougi.jp)を解析（全画面routemap・顧客/見積フォーム項目・ヘルプ39ページ）。解析物: tmp/smart/。設計: docs/kanri/00-analysis-and-plan.md。
- 訃報案内とは別に `/kanri`(川口典礼 葬儀管理ソフト)を新設。名称はスマート葬儀を一切表示しない。
- Phase1実装:
  - DB: fk_customers（顧客テーブル, 0010_kanri_customers.sql, pooler経由で適用）。
  - レイアウト/サイドバー(顧客管理/請求管理/発注管理/スケジュール管理/AI遺影写真/分析/SMS/設定)。
  - ダッシュボード(クイックアクション/月別顧客登録数/新規登録顧客)。
  - 顧客管理: 一覧(検索/ステータス絞込)・新規登録フォーム(スマート葬儀の顧客項目を踏襲)・詳細。
  - AI遺影写真: 仮ページへのボタンのみ(/kanri/ai-portrait → /create 仮)。
  - 他モジュール(請求/発注/スケジュール/分析/SMS/設定)はシェル(準備中)。
- 検証: ローカルで顧客登録→詳細遷移、ダッシュボード表示を確認。tsc パス。
- 次: Phase2 マスタ、Phase3 見積(故人/喪主入力)→訃報案内連携。

## 2026-07-05 葬儀管理ソフト Phase2: マスタ＋商品
- DB: fk_master_items(汎用マスタ), fk_products, fk_estimates, fk_estimate_items, fk_invoices を追加(0011_kanri_core.sql, pooler適用)。
- 設定(マスタ): /kanri/settings に会場/斎場火葬場/発行会社/顧客種別/流入経路/商品種別/発注先/宗教者/売上区分/仕入区分/送料/備考定型文 の汎用マスタCRUD(追加/削除)。
- 商品: /kanri/products 一覧・登録・編集(種別/単価税抜/税率/単位/原価/発注先)。
- サイドバーに 見積管理・商品 を追加。
- 検証: tsc パス。

## 2026-07-05 葬儀管理ソフト Phase3+7: 見積＋訃報案内連携
- 見積: /kanri/estimates 一覧・作成・詳細・編集。故人情報/喪主情報/日程(通夜・葬儀)/会場/火葬場/宗教＋動的明細(商品選択で単価自動/値引行)＋税込自動計算(小計/値引/消費税/合計)＋前受金。データ: fk_estimates + fk_estimate_items。
- 見積書PDF: /kanri/estimates/[id]/print (印刷用HTML→PDF保存)。
- **訃報案内連携(Phase7先行)**: 見積詳細の「訃報案内を作成」で、見積の故人・喪主・日程から memorials/deceased/funeral_events を自動生成し、fk_estimates.memorial_id にリンク。作成後は訃報案内(/admin/ceremonies/[slug])へ遷移。以後は「訃報案内を開く」表示。
- 顧客詳細・ダッシュボードの見積作成導線を /kanri/estimates/new に接続。
- 検証: ローカルE2Eで 見積作成(税込440,000)→訃報案内作成→故人反映 を確認。tsc パス。

## 2026-07-05 葬儀管理ソフト Phase4: 請求・入金
- 請求: 見積詳細の「請求書を作成」で fk_invoices を生成(税込合計を引継)。/kanri/billing 一覧、/kanri/billing/[id] 詳細。
- 入金: 請求詳細で入金額を記録→ paid_total 更新・ステータス自動判定(未入金/一部入金/入金済)。残額表示。請求明細は見積から表示。
- 検証: tsc パス。

## 2026-07-05 葬儀管理ソフト Phase6一部: スケジュール・分析
- スケジュール管理 /kanri/schedule: 見積の通夜・葬儀日時から今後の予定を一覧(日時/種別/故人/喪主/式場)。
- 分析 /kanri/analytics: KPI(顧客総数/見積件数・合計/請求件数・総額/入金総額/未入金額)＋月別顧客登録数。
- 未実装(シェルのまま): 発注管理(発注/納品/買掛), SMS。外部連携(仕入先/SMS配信)が必要なため別途。
- 検証: tsc パス。

## 2026-07-05 葬儀管理ソフト Phase5+6: 発注・納品・買掛・SMS・領収書
- DB: fk_purchase_orders/fk_purchase_order_items/fk_sms_logs 追加(0012)。
- 発注管理 /kanri/orders: 見積詳細の「発注書を作成」で商品を発注先ごとにまとめ発注(原価優先)。一覧(発注日/発注先/故人/金額/納品/買掛)・詳細。納品済/支払済トグル。買掛(未払)合計表示。
- SMS /kanri/sms: 送信フォーム＋送信ログ(fk_sms_logs)。実送信は配信事業者連携時に有効化(現状はログ記録)。
- 領収書PDF: /kanri/billing/[id]/receipt。
- 検証: ローカルE2Eで 見積→発注書作成(発注先グループ化)→発注一覧, 見積→請求書, SMS送信→ログ を確認。tsc パス。
- これで顧客→見積→(訃報連携)→請求/入金/領収→発注/納品/買掛→スケジュール/分析/SMS の主要業務が一通り稼働。

## 2026-07-05 葬儀管理ソフト 精度向上: マスタ細分化・会社情報・PDF反映
- スマート葬儀の manages/* 38種を全解析(tmp/smart/out/pages + tmp/スマート葬儀 スクショ)。
- マスタ定義を lib/kanri/master-defs.ts に分離(client/server共用)し、全マスタを4カテゴリ(基本/顧客/商品/葬儀)に細分化。各マスタに正しい項目を付与(会場=住所/電話, 発行会社=会社名/住所/インボイス, 宗教者=宗旨/宗派/電話, 商品セット=コード/価格, 送料/値引=金額, 売上区分=カラー, 備考定型文/トークマニュアル/通知設定=本文等)。extra jsonbで任意項目保持。
- 設定トップをカテゴリ別グリッド表示に刷新。設定[type]ページを項目定義駆動の動的フォーム/表に。
- 会社情報(会社名/インボイス番号/URL/電話/FAX/住所/口座)を単一設定として追加。見積書・領収書PDFに会社情報(会社名/住所/TEL/登録番号)を反映。
- server-only混入バグ(client→masters import)を master-defs 分離で解消。
- 検証: 全設定サブページ200、宗教者(宗旨/宗派)追加・会社情報保存 をローカルE2E確認。tsc パス。

## 2026-07-05 葬儀管理ソフト UIをスマート葬儀の実画面に寄せて刷新
- ユーザー指摘: /kanri の見た目がスマート葬儀と全然違う。保存スクショ(tmp/スマート葬儀/CRM画面/トップ.png)を基に実UIへ寄せた。
- トップバー: 白背景＋顧客キーワード検索＋検索ボタン＋起動(青)/ベル/リスト/?/ユーザー名。
- サイドバー: 白背景＋lucideアイコン(顧客/見積/商品/請求/発注/スケジュール/AI遺影/分析/SMS/設定)＋ヘルプ/訃報案内へ。アクティブはティール(#1aa39a)。
- ダッシュボード: 緑のお知らせ帯(全幅)＋白カード。左=アクションカード群(顧客登録/事前相談/葬儀発生/葬儀後アフター/その他, ティールアイコン)、右=カレンダー(月ナビ/今日/曜日色/本日ハイライト/見積の通夜葬儀を表示)。月別顧客登録数(オレンジ棒)＋新規登録顧客。
- 名称はスマート葬儀を出さず川口典礼のまま。Calendarクライアントコンポーネント新設。
- 検証: tsc パス、ローカルで実画面に近い表示を確認。

## 2026-07-05 葬儀管理 IA修正: リボン(多階層アコーディオン)ナビ＋請求/発注/スケジュール/分析の内部構成を実画面準拠に
- ユーザー指摘: スマート葬儀はリボンで折りたたみ、請求管理を押すと見積もり等が展開する。フラット表示になっていた。CRM画面とユーザー管理画面は別仕様。
- 実画面(トップ リボン展開状態)を解析し、サイドバーを多階層アコーディオン化(lib/kanri/nav.ts + Sidebar)。構成:
  - 顧客管理>顧客 / 請求管理>見積もり・請求書・入金管理・領収書・売掛残高 / 発注管理>発注・納品管理・買掛残高 / スケジュール管理>直近予定・カレンダー・イベント・当番表 / AI遺影写真 / 分析>売上実績・売上分析・EC売上・発注分析 / SMS>送信 / 設定>基本・顧客・商品・請求・スケジュール・アフターセールス(入れ子で各マスタ)。
- 各リンク先ページを新設: 入金管理(deposits)/領収書(receipts)/売掛残高(receivables)=請求データ由来、納品管理(deliveries)/買掛残高(payables)=発注データ由来、スケジュール(カレンダー/イベント/当番表)、分析(売上分析/EC売上/発注分析)、ユーザー管理。
- アクティブ経路は自動展開、既定は折りたたみ(実画面のトップと一致)。
- 検証: 全ルート200、リボン展開でサブ項目表示をローカル確認。tsc パス。
- ※未達(継続): 設定(ユーザー管理画面)を緑トップの別UIとして分離、顧客詳細のタブ(基本情報/関連顧客/契約情報/対応履歴)、見積もり画面の細部。完成宣言はしない。

## 2026-07-05 葬儀管理 精度: 顧客詳細タブ化＋設定を別UI(横タブ)化
- 顧客詳細を実画面準拠のタブUIに: 基本情報/関連顧客/契約情報(顧客の見積・葬儀一覧)/対応履歴/葬家。契約情報は fk_estimates を顧客IDで表示。
- 設定(ユーザー管理画面)を CRM とは別UIとして、緑基調の横タブナビ(会社情報/ユーザー管理/会場/商品種別/商品/値引商品/まとめ商品/発注先/送料/備考定型文/マスタ一覧)を持つ settings/layout を追加。
- 検証: 顧客詳細タブ・設定横タブをローカル確認。tsc パス。
- 継続: 見積もり/請求/入金の各画面細部、関連顧客・対応履歴のデータ化。完成宣言はしない。

## 2026-07-05 葬儀管理 顧客の対応履歴を実データ化
- fk_customer_notes 追加(0013)。顧客詳細の対応履歴タブで、種別(電話/来店/メール/訪問/その他)＋内容の履歴を追加/一覧/削除。CRMの顧客対応記録を再現。
- 検証: tsc パス。

## 2026-07-05 葬儀管理 画面精度: 緑ヘッダー＋見積もり一覧拡充＋施行番号採番
- CRM一覧(顧客/見積もり/請求書/発注)に緑のタイトルバー(PageHeader)を適用しスマート葬儀の一覧ヘッダーに合わせた。
- 見積もり一覧: 検索(件名/故人/喪主)＋種別絞込＋列(施行番号/件名/故人/喪主/種別/合計/見積日/訃報)＋行アクション(詳細/見積書/請求書/発注書 の色分けボタン)。
- 見積保存時に施行番号(見積番号)を自動採番(E{YYYYMMDD}-{4桁})。
- 検証: tsc パス。

## 2026-07-05 葬儀管理 見積作成画面を実フォームへ寄せる
- 見積もり追加(実画面)を解析: 施行番号/顧客/対象者/宛名情報/件名/摘要/見積日/火葬場/セット商品/オプション/その他オプション(お供え)/値引商品/前受金/発行会社/計上組織/計上担当者/右下オレンジ固定合計バー。
- EstimateForm に「右下 固定オレンジ合計バー(税込リアルタイム)」と「発行会社/計上組織/計上担当者」項目を追加。
- 見積作成/顧客新規に緑ヘッダー(PageHeader)適用。
- 検証: tsc パス。

## 2026-07-05 葬儀管理 全画面緑ヘッダー統一＋顧客CSVダウンロード
- 全kanri画面(スケジュール/分析/SMS/設定/Stub/詳細)に緑ヘッダー(PageHeader)を適用し統一。全29ルート200確認。
- 顧客CSVダウンロード(/kanri/customers/export)を実装(スマート葬儀の顧客CSV機能に準拠)。

## 2026-07-05 葬儀管理 顧客CSVインポート
- /kanri/customers/import: CSVアップロード→クライアントで解析→プレビュー→一括登録(importCustomers)。ヘッダー(氏/名/セイ/メイ/ステータス/流入経路/性別/携帯番号/メールアドレス等)をマッピング。スマート葬儀の顧客CSVインポートに準拠。
- 顧客一覧に CSVダウンロード/CSVインポート ボタン追加。
- 検証: ローカルE2Eで2件CSV→2件登録を確認。tsc パス。

## 2026-07-05 葬儀管理 商品CSVダウンロード/一括登録
- /kanri/products/export(CSV), /kanri/products/import(商品一括登録)。ProductImportクライアントで解析→プレビュー→importProductsで一括登録。商品一覧にCSVボタン。スマート葬儀の商品一括登録に準拠。

## 2026-07-05 葬儀管理 有限リストで主要CRM画面を実スクショと一致(収束)
- スクショと自画面を毎回見比べて差分を潰し、以下を「一致=完了」確定:
  - 顧客一覧: 緑ヘッダー右上ボタン(CSVダウンロード/CSVインポート/追加)＋ステータスCB検索＋ヒット件数＋行アクション(詳細確認/編集/削除)。
  - 顧客詳細: タブ(顧客/対応履歴/契約情報/関連顧客/顧客別ファイル/イベント)＋基本情報カード横並び＋編集/削除＋SMS/DMバッジ＋マイページ＋会員管理/葬家＋一覧に戻る。顧客編集機能も追加。
  - 顧客追加: 全項目一致＋顧客番号自動採番。
  - 請求書一覧: 緑ヘッダー右上(CSV/見積から作成)＋ヒット件数＋行アクション(詳細確認/領収書/入金)。請求書CSV出力。
  - 入金管理: 緑ヘッダー＋条件指定(未入金のみ/検索)＋一覧(請求書ID/確認・入金管理/顧客/請求先名/請求日/請求額/入金額/残高/支払方法)＋CSV。
- サンプル顧客3件(岩崎/小宮/近藤)をデモ表示用に投入。

## 2026-07-05 葬儀管理 請求書PDF(印刷)を実スクショと一致
- 追加: app/kanri/billing/[id]/print/route.ts — 請求書印刷ビュー。実画面「請求書ボタンを押して開く画面.png」と構造一致:
  宛名住所＋喪主名 様／請求書番号・請求日／中央「請求書」／件名・お支払い期限・合計金額(枠付き大)／会社ブロック(社名/〒/住所/TEL)／
  「請求書到着後1週間以内にお振り込み下さい」＋適格事業者番号／【振込先】枠(銀行/支店/普通 口座番号/口座名義)／
  明細表(取引日/項目名/数量/単価/税抜/税込)＋その他オプション区切り＋小計／内訳(10%対象計)／割引・返品(▲表記)＋内訳。会社マスタ(company_info)の銀行/インボイス番号を参照。
- 変更: 請求書一覧の行アクションに「請求書」ボタン、請求書詳細ヘッダーに「請求書PDF」ボタンを追加(既存の領収書PDFと併設)。
- 検証: 会社情報(company_info)＋テスト見積/請求を投入しPlaywrightでprintビューを撮影、実スクショと突き合わせて一致確認後にテストデータ削除。tsc(該当ファイル)エラー無し。

## 2026-07-05 葬儀管理 入金管理(伝票発行/伝票入金管理)を実スクショと一致
- 追加DB: supabase/migrations/0014_kanri_payment_slips.sql — fk_payment_slips(入金伝票)＋fk_payments(入金明細)。pooler経由で適用済み。
- 追加: lib/kanri/payments.ts(listPaymentSlips), actions.ts に createPaymentSlip/deletePaymentSlip/recalcInvoice(入金合計から請求書paid_total/status再計算)。
- 変更: app/kanri/billing/[id]/page.tsx を「請求書:○○様ご葬儀:伝票(入金)管理」ページに刷新。実画面「入金管理ボタンででる画面.png」準拠: 緑ヘッダー＋伝票発行ボタン、履歴テーブル(入金先/伝票区分/施行番号/喪主/葬儀日/売上区分/伝票番号/発行日/入金日/入金額/入金方法/入金種別/操作/領収書)、入金合計フッター、入金管理一覧に戻る。
- 追加: app/kanri/billing/[id]/slip/new/page.tsx ＋ components/kanri/PaymentSlipForm.tsx(client)。実画面「伝票発行ボタンででる画面.png/2.png」準拠: 入金先/伝票区分/施行番号/伝票番号(空なら自動採番)/発行日(既定=当日)/宛名/敬称(既定=様)/但し書き[請求書の件名を反映]/発行会社/振込依頼名/摘要/備考、入金額追加(残高表示・[現金をセット]・入金額必須/入金日必須/入金方法/入金種別/削除・[入金を追加]の動的行)、登録する/キャンセル。
- 検証: テスト請求書を投入→伝票発行フォームから入金1件登録→履歴に反映・伝票番号自動採番・入金合計更新をPlaywrightで確認、実スクショと一致確認後にテストデータ削除。tsc(該当ファイル)エラー無し。

## 2026-07-05 葬儀管理 顧客詳細サブタブ(対応履歴/契約情報/関連顧客)を実スクショと一致
- 対応履歴: 種別selectを廃し実画面準拠に刷新 — 引継ぎ(◉不要 ○必要 ラジオ)＋メッセージtextarea＋登録する、一覧テーブル(登録日時＋担当/引継ぎバッジ(必要=赤・不要=グレー)/メッセージ/削除)。kind列に引継ぎ値(不要/必要)を格納。
- 契約情報: 単一テーブルを実画面準拠の3カードに刷新 — 見積もり(最新10件)[一覧](件名/見積日/合計金額＋見積書/編集)、請求書(最新10件)[一覧](請求先名(氏)/件名/請求日/請求金額/入金/残高＋請求書/編集)、関連請求書。lib/kanri/invoices.ts に listInvoicesByCustomer(見積のcustomer_id経由・最新10件)追加。
- 関連顧客: Empty表示を実画面準拠のカード群に刷新 — 関連顧客[+関連追加]/電話番号が一致する顧客/携帯番号が一致する顧客/住所が一致する顧客/会員番号が一致する顧客。lib/kanri/data.ts に findRelatedCustomers(電話/携帯/住所一致の他顧客検索)追加。
- 葬家パネルの「＋新規作成」を見積・施行作成フロー(/kanri/estimates/new?customer_id=)へリンク。
  ※葬家新規作成の実画面は約7500pxの全施行登録フォームで、故人/喪主/式場等は既存の見積・施行フローと重複するため、専用巨大フォームの新規実装は行わず既存フローに委譲(重複実装と無限調整の回避)。
- 検証: サンプル顧客でhistory/contract/relatedの3タブをPlaywright撮影、実スクショと突き合わせて一致確認。tsc(該当ファイル)エラー無し。

## 2026-07-05 葬儀管理 顧客ダブりチェック＋顧客一覧CSVボタン群を実スクショと一致
- 追加DB: migration 0015 — fk_customers.dedup_excluded(除外フラグ)。pooler経由で適用済み。
- 追加: app/kanri/customers/duplicates/page.tsx — 実画面「顧客ダブりチェック」準拠。氏名で重複グループ化し「名前がかぶっているお客様一覧」＋赤注意文、各メンバー行(統合先ラジオ/ID/生年月日/自宅/携帯/作成日時/×このデータを削除)、グループ操作(データを統合する/選択して統合/ダブり対象から除外)、一覧に戻る。
- 追加: lib/kanri/data.ts findDuplicateCustomerGroups、actions.ts mergeCustomers(FK付け替え＋他ソフト削除)/excludeFromDedup(除外フラグ)/deleteCustomerFromDedup。
- 変更: 顧客一覧ヘッダーのボタン群を実画面順に刷新 — 顧客CSVダウンロード/葬家CSVダウンロード/会員CSVダウンロード/顧客 追加/顧客 CSVインポート/顧客 ダブリチェック。export routeに?type=(customer/souke/member)対応(ファイル名分岐)。
- 検証: 重複顧客2件を投入しPlaywrightで撮影、実スクショと一致確認後にテストデータ削除。tsc(該当ファイル)エラー無し。devのhydration警告はNext内部(RedirectErrorBoundary)由来のノイズで当ページ描画は正常(サーバーコンポーネント)。

## 2026-07-05 葬儀管理 CRMトップ カレンダーに担当者/表示対象/月週トグル追加
- components/kanri/Calendar.tsx: 実画面のカレンダーヘッダーに合わせ、担当者(既定=松澤 覚)/表示対象(すべて/通夜/葬儀)セレクトと月・週トグルを追加。週表示は今日(当月内)を含む1週間を表示。既存のお知らせ帯/ショートカットタイル群/月別顧客登録数/新規登録顧客テーブルは既に実装済みで一致を確認。
- 検証: /kanri をPlaywright撮影し実スクショと突き合わせ一致確認。tsc(該当ファイル)エラー無し。

## 2026-07-05 葬儀管理 関連顧客 関連追加(2段モーダル)を実スクショと一致
- 追加DB: migration 0016 — fk_related_customers(顧客同士の紐付け)。pooler経由で適用済み。
- 追加: lib/kanri/related.ts listRelatedCustomers、app/kanri/customers/search/route.ts(関連追加用の顧客検索JSON API)、actions.ts addRelatedCustomer/deleteRelatedCustomer。
- 追加: components/kanri/RelatedCustomers.tsx(client) — 関連顧客カード[+関連追加]→「関連顧客」モーダル(関連顧客[選択]＋関連ラベル必須＋登録する)→[選択]で「顧客を選択してください。」ピッカーモーダル(キーワード検索＋選択リスト:氏名/電話番号・住所/生年月日)。登録で紐付け、一覧に氏名/関連/削除表示。顧客詳細の関連顧客タブに組み込み(電話/携帯/住所一致カードは従来通り併存)。
- 検証: 関連追加→ピッカー検索→選択→関連入力→登録→一覧反映(小宮 清/長男)をPlaywrightで確認、実スクショと一致確認後にテストリンク削除。tsc(該当ファイル)エラー無し。

## 2026-07-05 葬儀管理 請求書追加/一括登録/CSVインポートを実スクショと一致
- 請求書追加(app/kanri/billing/new): 見積もり追加相当。EstimateFormにasInvoiceモードを追加(件名/種別/請求日/お支払い期限＋故人/喪主/日程・会場/明細/その他＋右下固定合計バー、ボタン=登録する)。saveEstimateにcreate_invoice分岐を追加し、見積＋請求書を同時作成→請求書へ遷移。
  ※実画面の請求書追加は見積もり追加と同一構造の巨大フォーム。専用重複実装は避け、既存EstimateFormの収束版を流用(顧客[選択]/新規や全オプションマスタUIまでは踏み込まず、故人/喪主/明細/日程で構造再現)。
- 請求書一括登録(app/kanri/billing/bulk ＋ components/kanri/BulkInvoiceForm.tsx): 顧客[選択](顧客ピッカー流用)＋請求日、説明文、一括適用する商品select、宛先/金額/数量グリッド(30行)、一括登録。actions.ts createBulkInvoices(宛先・金額が揃った行ごとに見積＋請求書を作成)。
- 請求書CSVインポート(app/kanri/billing/import ＋ components/kanri/InvoiceImport.tsx): CSVファイル選択→登録する/キャンセル、CSVインポート用フォーマットダウンロード。actions.ts importInvoices(顧客名,件名,請求日,金額を解析し見積＋請求書作成)、/kanri/billing/import/format でフォーマットCSV配布。
- 変更: 請求書一覧ヘッダーに 請求書追加/請求書一括登録/請求書CSVインポート/見積から作成 ボタンを追加。
- 検証: 3ページをPlaywright撮影し実スクショと一致確認。一括登録は顧客選択→宛先/金額入力→一括登録で請求書1件作成(?bulk=1)を確認後にテストデータ削除。tsc(該当ファイル)エラー無し。

## 2026-07-05 葬儀管理 CSV出力/データ構造を実スマート葬儀と完全一致(全9本ヘッダーdiff検証済)
- 完了条件を「出力・データ構造の完全クローン」に引き上げ、実CSVファイル(tmp/スマート葬儀配下)をヘッダーの一次情報として全出力を書き換え:
  1. 入金一覧CSV(/kanri/billing/export): 実25列(請求書ID〜備考)。請求書＋見積＋入金明細をjoinし最終入金日/支払方法/未入金残を出力。
  2. 伝票明細CSV(/kanri/deposits/slips): 実22列(施行番号〜備考)。入金伝票×入金明細の行展開。入金管理一覧に「伝票明細CSV」ボタン追加。
  3. 請求書一括CSVフォーマット(/kanri/billing/import/format): 実50列ヘッダーをそのまま配布。importInvoicesを実列名マッピング(件名有=新規請求書/無=明細行のグループ化、値引商品列、税率8%/非課税判定、喪主住所)に全面刷新。RFC4180クォート対応パーサ追加。
  4. 顧客情報CSVインポートフォーマット(/kanri/customers/import/format 新設): 実158列ヘッダーをそのまま配布。importCustomersを実列名(氏（カナ）/状態/建物など/その他備考/SMS自動送信対象にする等)対応に拡張。CustomerImportのフォーマットDLリンク差し替え。
  5. 商品一括登録フォーマット(/kanri/products/export): 実26列。importProductsも実列名(価格(税抜)/下代(税抜)/商品種別:大/商品説明、税率=課税/非課税表記)対応。
  6. 発注先一括登録フォーマット(/kanri/settings/supplier/export 新設): 実14列。
  7. 割引商品一覧(/kanri/settings/discounted_product/export 新設): 実14列。
  8. 売上集計CSV(/kanri/analytics/sales/export 新設): 実62列。10%/8%税抜・消費税・税込・非課税の区分集計、入金済合計額/最終入金日/未収金額。from/to期間指定対応。
  9. 売上分析明細CSV(/kanri/analytics/sales-detail/export 新設): 実50列。請求書×明細行の展開。分析ページに両CSVボタン追加。
- 不具合修正: Content-Dispositionに日本語ファイル名を直接指定するとByteStringエラーで500。全9ルートをRFC5987(filename*=UTF-8''%エンコード)に統一。
- 検証: devサーバーで全9URLをcurl取得し、実CSVの1行目とdiffで1バイト単位一致(OK×9)を確認。tscエラー無し。

## 2026-07-05 葬儀管理 ユーザー管理画面(設定)を実スクショと一致
- settings/layout.tsx刷新: 実「ユーザー管理画面」準拠 — 白ヘッダー＋上部緑ライン、左ロゴ(川口典礼)、タブを実物と同一順序(故人/参列者/参列者からのメッセージ/会場/商品種別/商品/値引商品/まとめ商品/発注先/送料/売上/口座/備考定型文/会社情報)、右上にユーザー管理/マスタ一覧/【株式会社川口典礼】/松澤覚。
- /kanri/settings を「葬儀会社」ダッシュボードに刷新(実トップ.jpg準拠): 詳細情報カード(葬儀会社名/ロゴ/電話番号/FAX番号/住所)＋KPI4カード(総故人数/総葬儀ページ閲覧数/総参列者数/総売上、[月別]バッジ＋時点表記)。KPIは実データ(memorials/memorial_views/condolence_messages/請求入金)に接続。旧マスタ一覧は /kanri/settings/masters へ移設。
- 新ページ: 故人(/settings/deceased=deceasedテーブル一覧)、参列者(/settings/attendees=記帳一覧)、参列者からのメッセージ(/settings/messages=メッセージ+公開状態)、売上(/settings/sales=請求ベースの売上一覧+CSVリンク)、口座(/settings/bank=口座一覧: 銀行名/銀行支店名/口座名義人＋口座追加/編集/削除、実「口座.png」準拠)。
- 検証: 葬儀会社ダッシュボード/口座/故人をPlaywright撮影し実スクショと一致確認(KPIに実データ206件/8回/2人)。ロゴ画像404をプレースホルダに修正。tscエラー無し。

## 2026-07-05 葬儀管理 残設定4画面(サービス利用料/項目表示/必須項目/購入通知)を追加
- 汎用アプリ設定基盤: actions.ts saveAppSetting(master_type=app_setting name=キー extra=JSON)、masters.ts getAppSetting。
- サービス利用料(/kanri/settings/service-fee): 実「サービス利用料.png」準拠 — 種別(商品:○○)×サービス利用料率(%)一覧＋編集＋戻る。率は商品種別マスタごとに保存。
- 項目の表示、非表示設定(/kanri/settings/field-visibility): 実画面のセクション構造(顧客/葬家[基本/対象者/喪主/葬儀・告別式]/請求書)を当システムの実装フィールドで再現。チェック状態を保存・復元、更新する/キャンセル。
  ※実画面は数百項目の全フィールド網羅だが、当クローンに存在しないフィールドのトグルは機能し得ないため、実装済みフィールドに対応する項目のみ掲載(構造・操作性は準拠)。CRM入力必須項目設定(/kanri/settings/required-fields)も同方針。
- 購入に関する通知設定(/kanri/settings/purchase-notice): 通知タイミング(注文/決済完了/キャンセル)＋通知先メール(カンマ区切り)。
- マスタ一覧に4画面への導線カードを追加。
- 検証: 3画面をPlaywright撮影し構造一致を確認。tscエラー無し。

## 2026-07-05 スマート葬儀へ実ログインし徹底クロール→リボン/商品/セット商品を実物どおり再構築＋実データ移植
- Playwrightで app.smartsougi.jp に実ログインし、customer_managements(リボン全リンク構造)/manages/product_sets(+new)/users/products(+new) のスクショ・フォーム項目・ナビHTMLを取得(tmp/smartsougi-crawl/)。
- リボン刷新(lib/kanri/nav.ts): 設定メニューを実リボンの項目・順序どおり9グループ(基本13/顧客11/葬儀15/商品11/請求10/スケジュール4/SMS2/アフターセールス3/その他2)に全面再構築。master-defs.tsに実メニュー対応の新マスタ23種(件名マスター/摘要設定/見積書・請求書テンプレート/伝票入金先・入金区分/入金方法/入金種別/但し書/組織管理/共有ファイル/緊急連絡先/SMSテンプレート/アフターセールス3種/提携先/ブランド等)とカテゴリ5種を追加(汎用[type]ページで一覧/追加/削除が機能)。
- DB拡張(migration 0017): fk_products に実フォーム準拠の17列(商品コード/型番/下代用税率/非適格事業者用控除/立替金/商品説明/補足説明/EC系5フラグ/グループ/発注しない/発注のみ/ピッキング非表示/非表示/source_id)追加。fk_product_sets(セット商品)＋fk_product_set_items(内訳)新設。pooler適用済み。
- 商品登録フォーム刷新(ProductForm): 実 /users/products/new と同一項目・必須表示・税込価格自動計算。発注先はマスタからselect。
- セット商品(/kanri/product-sets): 一覧(コード/セット名/税抜/税込/税率/非表示/編集/削除＋CSVエクスポート実17列ヘッダー)＋追加(/new: セット商品コード/セット名必須/詳細説明/イメージ/セット価格税抜・税込連動/消費税率必須/内訳(商品+数量の動的行)/非表示)＋編集。saveProductSet/deleteProductSet。
- 実データ移植: 商品156件(発注先/種別/下代/控除80等の実値)、セット商品43種(内訳行付き: メモリアル直想/華想/川口市市民葬セット等)、値引商品2件、会場3件、発注先13件をDBへ投入(source_idで重複防止)。
- 検証: セット商品一覧に実データ43件表示・リボン展開構造・商品登録フォームをPlaywrightで実画面と突き合わせ確認。tscエラー無し。

## 2026-07-05 スマート葬儀 顧客/葬家/会員の実データ移植
- 実画面のCSVダウンロード(顧客/葬家/会員 各csv_downloads)をPlaywrightのdownloadイベントで取得(tmp/smartsougi-crawl/data/)。
- 顧客: 1,060行→氏名分割・住所・会員番号つきで1,026件を fk_customers へ移植(氏名重複34件はスキップ)。
- 葬家一覧: 2,119行(142列: 対象者/喪主/施主/通夜・葬儀日程/会場/宗旨宗派/火葬場/搬送・安置ほか)→施行番号・氏名+葬儀日でユニーク化し410件を fk_estimates へ移植(故人/喪主/カナ/続柄/電話/住所/宗旨宗派/通夜・葬儀日時/会場/火葬場/顧客番号はmemoに保持)。
- 会員一覧: 0件(実データ無し)。
- listCustomers limit 500→3000 / listEstimates limit 500→2000 に拡大(実データ1,000件超の表示対応)。
- 検証: 顧客一覧・見積(施行)一覧に実データ表示をPlaywrightで確認。tscエラー無し。

## 2026-07-05 スマート葬儀 請求実績271件を移植
- 売上集計CSV(2026/01/01〜07/05・271請求)から fk_invoices へ移植: 請求書番号/請求日/請求合計額/入金済合計額/最終入金日。入金済はstatus=paid/partialを算出し fk_payments にも入金明細を記録。
- 対象者名で既存の葬家(見積)と自動リンク24件。未一致247件は請求先名・喪主住所つきのスタブ見積を作成して紐付け(memo=売上集計より移植)。
- 検証: 請求書一覧に271件表示・金額が実CSVと一致(近藤文鶯401,300円/菅原匡美2,079,989円/返品-17,496円等)をPlaywrightで確認。

## 2026-07-05 実クロール続き: 領収書/売掛残高を実画面と一致
- 実ログイン状態で estimates/order_to_suppliers/deliveries/latest_schedules/sales/receipts/receivable_accounts をクロール取得(tmp/smartsougi-crawl/)。
- 領収書(/kanri/receipts): 実画面準拠に刷新 — 検索(施行番号/発行日範囲/宛名)＋一覧(伝票番号/発行日/施行番号/喪主/葬儀日/入金先/伝票区分/関連請求書:売上区分(請求書リンク)/入金額/領収書)＋[+伝票作成]。データ源を入金伝票(fk_payment_slips)に変更。
- 売掛残高(/kanri/receivables): 実画面準拠に刷新 — 条件指定(対象日範囲(既定=当月1日〜今日)/発行会社/計上組織)＋CSVダウンロード(青)のみのシンプル画面。/kanri/receivables/export で残高CSV出力(未回収のみ、期間指定対応)。
- 検証: 両画面をPlaywrightで実スクショと突き合わせ一致確認。tscエラー無し。

## 2026-07-06 顧客⇔見積⇔請求のリレーション再構築(実データ正規化)
- 指摘対応: 請求から見積スタブを作る方式は誤り(請求のみの顧客が存在)。請求書は顧客直結の独立エンティティに再設計。
- migration 0018: fk_invoices に customer_id/source_id(請求書番号)/title/売上区分/施行番号/対象者/喪主/請求先9列を追加、fk_invoice_details(明細)新設、fk_customers.source_id/fk_estimates.source_id 追加。
- 実ログインで請求一覧19ページ・見積一覧19ページを全ページクロールし、請求1,203件・見積929件の「スマート葬儀ID⇔顧客ID⇔請求先名」対応表を取得(tmp/smartsougi-crawl/*-relations.json)。請求編集フォームの全49項目(請求先kind/氏名カナ/住所、明細の区切りタイトル/札名/下代/割引/預り金/立替金/非表示/取引日/返品数等)も取得。
- データ再構築: 旧移植の請求271件＋スタブ見積247件を削除→ 顧客953名をsource_id照合(926名前一致/27新規)→ 請求1,203件を2023-2026売上集計CSVから請求書番号そのままで再投入(顧客リンク・請求先名つき)→ 明細15,624行をfk_invoice_detailsへ→ 見積929件を顧客リンクつきで投入→ 葬家移植分はkind=funeral_targetに分離。
- lib/kanri/invoices.ts全面改修: customer_id直結リレーション(customerName join)、invoiceTargetName/title/saleCategory/constructionNo、getInvoiceがInvoiceDetail[]を返却。listInvoicesByCustomerはcustomer_id直接参照に変更。
- 請求書一覧刷新: 実列(ID/顧客/対象者/件名/請求日/合計金額/売上区分/施行番号/請求先/操作)＋検索カード(請求日範囲/請求書ID/施行番号/喪主/対象者/請求先名/件名)。顧客名は顧客詳細へリンク。
- 見積一覧刷新: 実列(ID/顧客/対象者/件名/合計金額/見積日/施行番号/操作)＋検索カード。葬家(施行)データを一覧から分離。
- 請求書印刷: 明細を fk_invoice_details 優先に変更、宛名は請求先名を優先。
- 検証: 顧客契約情報タブで見積(小宮さだ子様 葬儀代1,629,110円)と請求(小宮家 献上供花23,100円)が顧客に紐づいて表示されることをPlaywrightで確認 — 実「顧客契約情報」スクショと同じ状態を達成。tscエラー無し。

## 2026-07-06 見積作成/請求書追加フォームを実UIに全面刷新
- migration 0019: fk_estimates に宛名情報11列＋product_set_id/セット価格/ブランド/発行会社/計上組織/計上担当者、fk_invoices に発行情報/前受金/product_set_id を追加。
- components/kanri/EstimateCreateForm.tsx 新設(見積/請求共用・実「見積もり作成.png」「請求書追加.png」準拠):
  施行番号(＋対象者情報読込ボタン)/顧客必須[選択]ピッカー＋「顧客を同時に新規登録」/対象者/宛名情報(請求時は請求先情報: kind・氏名・敬称・カナ・郵便・都道府県・市区町村・番地・建物)/件名必須/摘要/見積日・有効期限(請求: 請求日必須・お支払い期限)/火葬場/ブランド/在庫管理会場/セット商品(「設定されていません」＋[セット商品選択]モーダル=実データ43セットから選択)/オプション([オプション追加]行＋[商品を連続して追加]チェック式モーダル)/その他オプション・お供えにかかる費用(マスタ一覧×数量)/値引商品[+追加]/前受金/発行会社/計上組織/計上担当者/右下固定合計バー。
- actions.ts: saveEstimateFull/saveInvoiceFull 新設 — 顧客直結保存(選択 or 同時新規作成)。請求は見積に依存せず fk_invoices＋fk_invoice_details に直接保存し、請求先(invoice_target_*)を保持(顧客と請求先が異なるケース対応)。
- その他オプションマスタに実画面の5項目(追加安置日数/追加ドライアイス/収骨容器一式/市民葬寝台車20km/本尊セット一式)を実単価で投入。
- 検証: 見積作成フォーム全体とセット商品選択モーダル(実データ表示)をPlaywrightで実スクショと突き合わせ一致確認。tscエラー無し。

## 2026-07-06 顧客の登録日をスマート葬儀の実登録日に修正＋一覧を登録日降順に
- 指摘対応: 顧客一覧の登録日が移植実行日になっていた。実ログインで顧客詳細934ページをクロールし「お問い合わせ（登録）日時」を全件抽出(失敗0)→ registered_at/created_at をスマート葬儀上の実登録日時(JST)に一括更新。
- 一覧ソートを登録日(registered_at)降順=最新が先頭に変更。一覧「登録日」列・顧客詳細「お問い合わせ（登録）日時」も実登録日を表示。
- PostgRESTの1リクエスト1000行上限でヒット件数が1000に切れていたためrange分割の全件取得に修正(1,056件表示)。
- 検証: 一覧先頭が実最新登録(2026/07/05群)で降順表示・全1,056件をPlaywrightで確認。tscエラー無し。

## 2026-07-06 見積作成「顧客を同時に新規登録」の入力項目を拡張(郵便番号→住所自動入力)
- チェック時の入力欄を拡張: 顧客氏/名に加え 顧客郵便番号/都道府県/市区町村/番地・建物名/自宅番号/携帯番号/メールアドレス。
- 郵便番号→住所自動入力: zipcloud API(https://zipcloud.ibsnet.co.jp)で郵便番号(7桁)から都道府県・市区町村を自動セット([住所検索]ボタン＋blur)。
- 保存(resolveCustomerId): 新規顧客に住所・電話・メールを保存し、顧客番号(C+日付+乱数)も自動採番。
- 検証: 3330833→埼玉県/川口市西新井宿の自動入力をPlaywrightで確認。tscエラー無し。

## 2026-07-06 見積/請求に削除ボタンを追加
- actions.ts に deleteInvoice(ソフト削除)を新設。deleteEstimate はrevalidatePath追加。いずれもdeleted_atを立てる論理削除で一覧から即除外。
- 見積一覧・見積詳細ヘッダー・請求一覧・請求詳細ヘッダーの操作部に「削除」ボタンを追加。
- 検証: 見積一覧の操作列に削除ボタン表示をPlaywrightで確認。tscエラー無し。

## 2026-07-06 領収書PDFを実業務Excel様式に刷新(A4縦・領収書+入金伝票控え・角印)
- app/kanri/billing/[id]/receipt/route.ts を全面刷新。実物「領収書印刷.jpg」準拠のA4縦1枚:
  - 上半分=領収書(薄緑#eaf1e2): 領収書見出し／宛名(白ボックス)／No.(請求書番号)／¥金額(税込・白ボックス)／但し(件名)＋事業者番号／発行日＋上記正に領収いたしました／内訳(税抜金額・消費税額の二重線表)／収入印紙欄(印収紙入)／会社情報(葬祭業務全般…／川口メモリアルホール／株式会社川口典礼／〒住所／TEL・FAX)／担当欄。
  - 下半分=入金伝票控え(オレンジ#c8641f文字): 同構成を控え色で。
  - 角印: 赤の二重枠＋「株式会社川口典礼」を右→左3列に配置したSVGで再現。領収書側は会社名(川口典礼)に重ね、控え側は右下に単独表示(実物の版下で用紙外に出していた角印を、印刷では会社名に重ねる要件を反映)。
  - 内訳: 明細の税率別集計から税抜/消費税を算出(入金額≠請求総額なら比率按分)。金額は入金額優先、なければ請求総額。
  - @page A4 portrait/margin 0、window.print自動。
- 検証: 実請求(山岡珠子/献上供花23,100円)でPDFレンダリングし、A4縦2分割・角印重ね・税抜21,000/消費税1,260の表示を実物と突き合わせ一致確認。tscエラー無し。
  ※会社住所が「川口市新井宿」表示(実物は西新井宿)は会社情報マスタのデータ由来。設定＞会社情報で修正すれば反映。

## 2026-07-06 請求書番号を連番採番(スマート葬儀と同方式)
- migration 0024: 移植済み数値請求書番号の最大値(2090663)の次から採番するシーケンス fk_invoice_no_seq＋採番関数 next_invoice_no() を作成(並行安全)。
- 新規請求書の全作成経路に連番採番を組み込み: saveInvoiceFull(請求書追加)、createInvoiceFromEstimate(見積詳細→請求書)、saveEstimateFull(見積＋請求同時作成)、createBulkInvoices(一括登録)、importInvoices(CSVインポート)。invoice_no と source_id に採番値をセット。
- 内部ID(全テーブルのuuid主キー)は従来どおりgen_random_uuid()で自動採番(移植分と衝突なし)。
- 検証: E2Eで新規請求書を連続作成→請求書番号 2090664→2090665 と連番付与を一覧ID列で確認後、テストデータ削除＋シーケンスを2090663に戻す(次採番=2090664)。tscエラー無し。
  ※見積の施行番号・顧客番号は現状の日付+乱数方式のまま(ユーザー指示は請求書番号の連番化)。

## 2026-07-06 見積追加に「事前相談」チェックを追加(DB列つき)
- migration 0023: fk_estimates.is_pre_consultation(boolean)追加。
- 見積追加/編集フォームの最上部に「事前相談」チェック(案内文: 事前相談の場合、喪主情報・故人情報が未確定のままでも登録できます)。チェック時はkind=preとして保存し、一覧の種別絞込(事前見積)にも連動。
- 依頼(本番)時の必須項目チェックは is_pre_consultation=false を条件に後日実装できる構造(要件どおり、実装は保留)。
- 検証: フォーム最上部の表示をPlaywrightで確認。tscエラー無し。

## 2026-07-06 見積作成のデフォルト値を「その他オプション」側へ変更
- 指摘対応: オプションカードのデフォルト行(収骨容器一式/本尊セット)を廃止し、「その他オプション、お供えにかかる費用」の 追加安置日数/追加ドライアイス/収骨容器一式/本尊セット一式 をデフォルト数量1に変更(見積の新規作成時のみ)。
- 検証: 見積作成初期表示で4項目=1・市民葬寝台車=0・合計70,180円(税込)の自動計算をPlaywrightで確認。tscエラー無し。

## 2026-07-06 見積/請求作成のオプションを実カードUIに全面刷新
- 指摘対応: プルダウン式だったオプション行を、実「見積もり作成（実際にオプションを追加していくとこうなる）」画面準拠のカード形式に刷新。
- カード構成: [商品選択](単品ピッカーモーダル)＋「選択した商品：○○」＋右上[複製][削除]／項目名(必須)・札名／単価(税抜)⇄税込単価(入力時優先)・下代(必須)・消費税率(必須)・割引(税抜)・数量(必須)／税込金額の自動計算表示／預り金＋計上日・立替金・請求書に非表示・取引日(空は請求日)・返品数・補足説明／カード下に区切りタイトル(請求書に区切りを差し込む)。
- migration 0022: fk_estimate_itemsに札名/下代/割引/預り金/立替金/取引日/返品数/補足/区切りタイトル/税込単価列を追加。fk_invoice_detailsにも保存。
- 計算: 行金額=単価×数量−割引(税抜)、税込金額=税込単価入力時はそれ×数量。合計バーも税込ベースに刷新。
- 印刷反映: 「請求書に非表示」はオプション行も見積書/請求書から除外。区切りタイトルは請求書に区切り行として差し込み。割引後金額が税抜金額/税込金額列に反映。
- 検証: E2Eで収骨容器一式 単価75,000×数量2→カード上の税込金額165,000円自動表示→登録→見積書印刷に数量2/税抜150,000円/税込165,000円・合計192,500円が反映されることを確認後テストデータ削除。tscエラー無し。

## 2026-07-06 顧客の登録日時を実値で全件再取得＋担当者(最終更新者)を見積/請求に追加
- 登録日時バグ修正: 前回クロールがセッション切れで全件同一値(07/05 09:47)を書いていた。再クロールはURL検証＋ユニーク性チェック(10種未満なら更新中止)の安全弁つきで934件再取得(fail 0・ユニーク930種)→registered_at/created_atへ反映。詳細ページの顧客番号も同時取得しcustomer_noへ反映。
- source_id未付与の122件は顧客一覧23ページを全クロールして名前照合→60件を新規マッチし実登録日を反映。スマート葬儀側に存在しない62件はregistered_at=nullにして末尾へ(偽の日付を出さない)。
- 検証: 顧客一覧が実データどおり 岩﨑利仁(07/05)→小宮清(07/03)→近藤文鶯(07/01)→横田博明(06/30)…の降順・顧客番号表示をPlaywrightで確認。
- 担当者(最終更新者): migration 0021でfk_estimates/fk_invoicesにstaff_name追加。見積928件は取得済み一覧データから、請求1,196件は請求一覧19ページ再クロールで最終更新者を全件反映。見積/請求一覧に「最終更新者」列、作成/編集フォームに「担当者（葬儀担当）」欄(候補datalist)を追加し保存対応。

## 2026-07-06 指摘5点対応(請求編集復元/見積日/200件ページング/セット内訳書式/デフォルト商品)
- 請求書編集の実値復元を完全化: Invoice mapに請求先kind/カナ/郵便/住所/発行会社/計上組織/計上担当者/前受金/セットIDを追加し、編集フォームへ全復元。
- 見積日: 実見積一覧19ページを再クロールし、見積日(実データにある分)＋未設定分は最終更新日時の日付で929件全件を estimate_on に反映。見積一覧を見積日降順に変更。
- 見積/請求一覧を200件ページネーション化(前へ/ページ番号/次へ、ヒット件数に表示範囲を併記)。
- セット内訳(migration 0020: is_set_item/hidden_paper): 見積/請求追加でセット選択時に内訳を全展開表示し、行ごとに「表示しない」チェック(チェック時は取り消し線＋印刷から除外)。印刷(見積書/請求書とも)はセット行→【セットに含まれるもの】→内訳(数値・数量なしで名前のみ)→【ここまでセットに含まれる】→以降オプションの書式。セット内訳API(/kanri/product-sets/[id]/items)新設。
- 見積追加の初期状態で骨壺(収骨容器一式)と本尊セット一式をデフォルト入力済みに。
- 検証: E2Eで見積作成(顧客選択→メモリアル直想セット選択→内訳展開→非表示チェック→登録)→見積書印刷で【セットに含まれるもの】書式・除外・オプション分離・合計216,501円を確認後テストデータ削除。tscエラー無し。

## 2026-07-06 見積/請求フォームの残機能を全実装(編集統一・参照ボタン・施行番号読込)
- 見積編集(/kanri/estimates/[id]/edit)・請求書編集(/kanri/billing/[id]/edit 新設)を EstimateCreateForm に統一。既存データ(顧客/請求先/件名/日付/明細/値引/セット)を初期値復元。saveEstimateFull/saveInvoiceFull にid更新分岐(明細delete→再insert)。
- 「施行番号から対象者情報を読込む」機能化: /kanri/estimates/lookup APIで葬家データを施行番号検索→対象者名・顧客を自動セット。
- 「摘要[参照]」: 摘要設定マスタ(purpose)から選択して反映するモーダル。
- 「テンプレート参照」: 見積書/請求書テンプレートマスタから件名・摘要へ反映するモーダル。
- 「葬儀・法要等 追加」: 法要マスタ(memorial_service)からワンクリックで明細行へ追加。
- Estimate型に宛名/セット/発行情報のマッピング追加。請求書一覧・詳細に編集リンク追加。
- 検証: 実データ請求(小宮清/請求先=山岡珠子/献上供花23,100円)の編集画面で顧客・請求先・明細・合計の復元をPlaywrightで確認。tscエラー無し。

## 2026-07-06 実クロール続き: 納品管理/直近予定を実画面と一致
- 納品管理(/kanri/deliveries): 実画面準拠に刷新 — 緑ヘッダー＋[直接発注]、検索14項目(発注日範囲/納品希望日時範囲/発注先/納品先名/商品/発注書ID/見積書ID/施行番号/計上組織/在庫管理会場/発注・メール・支払・ロックステータス)、一覧13列(ID/発注日/見積もり/発注先/商品名/下代/下代(税込)/発注数/発注額/消費税額/発注額(税込)/納品日時/詳細)の明細行展開。
- 直近予定(/kanri/schedule): 実画面準拠に刷新 — 一覧の条件(基準日/期間1日〜30日/担当＋絞り込み)、一覧10列(日時/会場/対象者、内容/住所/施行担当者/供花受入/供物受入/香典受入/問い合わせ対応/葬儀種別)＋CSVダウンロード。通夜/葬儀イベントを期間で絞込表示。
- 検証: 両画面をPlaywrightで実スクショと突き合わせ一致確認。tscエラー無し。

## 2026-07-05 実クロール続き: 分析ヘッダーを実画面と一致
- 分析(/kanri/analytics)のヘッダーを実「分析 - 売上実績」準拠に刷新 — 緑ヘッダー右側に年月レンジ(開始年月〜終了年月)＋月間/週間/日間セレクト＋[表示]。CSVボタンは本体側に維持。

## 2026-07-05 実クロール続き: 発注書を実画面と一致
- 発注(/kanri/orders)を実「発注書」画面準拠に刷新 — 緑ヘッダー＋[+新規作成][一括登録]、検索15項目(発注日範囲/発注先/見積書ID/発注書ID/施行番号/商品/計上組織/在庫管理会場/メール・支払・ロック・発注ステータス/発行会社/ブランド/納品先名)、一覧12列(発注書ID/見積書ID/発注日/発注先/施行番号/計上組織/在庫管理会場/発注額税抜/税込/支払予定日/ステータス/操作)。日付・発注先・ステータスの絞込みは機能。
- 検証: Playwrightで実スクショと突き合わせ一致確認。tscエラー無し。

## 2026-07-08 見積作成の対象者項目に 性別/生年月日/没年月日/年齢(自動計算) を追加
- EstimateCreateForm の対象者カードを拡張: 従来の「対象者名」に加え、性別(男性/女性/その他のセレクト)・生年月日・没年月日(date)・年齢(享年)の4項目を追加。
- 年齢は生年月日と没年月日の両方が入ればフロントで自動計算(誕生日到来判定つき)し読み取り専用表示(「生年月日・没年月日から自動計算」注記)。片方でも未入力なら手入力可。
- 保存(saveEstimateFull)に deceased_gender/deceased_birth_date/deceased_death_date/deceased_age を追加(fk_estimatesの既存列に反映)。空dateはs()でnull化。
- 見積編集(/estimates/[id]/edit)は e.deceased の gender/birthDate/deathDate/age を初期値復元。
- 検証: 年齢計算ロジックをnodeで確認(1950-03-15→2026-07-08=76、1950-08-15→=75)。tscエラー無し。

## 2026-07-08 見積作成の必須項目バリデーション＋計上担当者を選択式に＋対象者「関係」欄追加
- 登録前バリデーション(EstimateCreateForm・見積のみ): 登録ボタン押下時に未入力項目をリスト表示し、入力するまで登録不可(onSubmitでpreventDefault)。
  - 事前相談チェックON: 顧客(選択or新規登録)/件名/計上担当者/担当者(葬儀担当) が必須。
  - 事前相談OFF(本見積もり): 上記に加え、対象者名/性別/生年月日/没年月日 が必須。顧客を同時に新規登録時は 顧客氏/名/郵便番号/都道府県/市区町村/番地/自宅or携帯電話 も必須。
  - 案内文「次の項目が未入力のため登録できません。入力してから登録してください。」＋箇条書き。フォーム先頭へスクロール。
  - サーバ側(saveEstimateFull)にも同条件の防御チェックを追加(計上担当者/担当者/対象者系)。
- 計上担当者(charged_user)をデフォルト松澤覚の入力欄→空欄の選択式(select)に変更。担当者(葬儀担当)も選択式に統一。候補は共通のSTAFF_OPTIONS(松澤覚/石川健太/松浦颯大/吉田寿子/川口典礼)。
- 対象者名の下に「関係（続柄）」欄を追加(顧客(喪主)から見た対象者との続柄・datalist候補つき)。既存のmourner_relation列に保存(DDL不要)。編集時はe.mourner.relationから復元。
- 検証: Playwrightで①計上担当者デフォルト空欄②関係欄存在③本見積もりで未入力7項目リスト表示④事前相談ONで必須3項目に減少 を確認。正常系(事前相談ON・顧客選択・件名・担当者)で詳細へ遷移し、mourner_relation=父/charged_user/staff_nameの保存をREST確認後テストデータ削除。tscエラー無し。

## 2026-07-08 Supabaseマイグレーション適用経路を確立(Session pooler)
- Direct接続(db.<ref>.supabase.co:5432)はIPv6専用で当PCから不達だったため、Session pooler(aws-1-ap-northeast-2.pooler.supabase.com:5432, IPv4/DDL可)を採用。
- .env.local に SUPABASE_POOLER_URL を追記(gitignore済み・非コミット)。
- scripts/apply-migrations.mjs を新設: SUPABASE_POOLER_URL優先でsupabase/migrations/*.sqlを番号順適用(番号プレフィックス指定で個別適用も可)。SQLは冪等前提。
- 疎通確認: select 1 成功、0023を冪等再適用して動作確認。以降のDDLはこのスクリプトで自動適用可能。

## 2026-07-08 入金管理一覧: 「確認」→「伝票発行」ボタンに変更＋伝票を請求書情報で自動プリフィル
- 入金管理一覧(/kanri/deposits)の操作列の「確認」(領収書PDF)を廃止し、「伝票発行」ボタン(/kanri/billing/[id]/slip/new へ遷移)に変更。「入金管理」ボタンは維持。
- 伝票発行フォーム(PaymentSlipForm)を請求書情報で自動プリフィル(入れられる内容は入れておく):
  - 但し書き=請求件名、施行番号=請求書の施行番号(無ければ見積番号)、宛名=請求先名→喪主→顧客の順、発行会社=請求書の発行会社(無ければ株式会社 川口典礼)、摘要=件名、伝票区分=葬儀代、発行日=当日。
  - 入金額(1行目)=残高、入金日(1行目)=当日 を初期セット。
  - propsを invoiceTitle/remaining/today の個別引数から prefill オブジェクトに整理(SlipPrefill型)。Selectに defaultValue を追加。
- 検証: Playwrightで一覧の確認ボタン0件・伝票発行ボタン表示を確認。実請求(小宮家/献上供花23,100円)で伝票発行画面を開き、宛名=山岡 珠子/但し書き=小宮家 献上供花/発行会社/発行日/入金額23,100/入金日/伝票区分=葬儀代 の自動入力を確認。tscエラー無し。

## 2026-07-08 入金管理一覧の請求先名を実データ表示に修正
- 「請求先名(喪主)」列が喪主名固定表示で、実際に入力された請求先名(invoice_target_name)が出ていなかった問題を修正。
- 表示ロジック: invoice_target_name(実入力値)を優先 → 区分が「顧客」なら顧客名・「喪主」なら喪主名 → 喪主名 → 顧客名 の順でフォールバック。ヘッダーも「請求先名」に変更。
- 検索(請求先名)も deceasedName/mournerName に加え invoiceTargetName/customerName を対象に拡張。
- 検証: Playwrightで一覧先頭10行の請求先名が実名(山岡 珠子/近藤 文鶯/大熊 秀明…)で表示されることを確認。tscエラー無し。

## 2026-07-08 領収書PDFの消費税額を実額計算に修正(不正なtax_amount列を不使用)
- 不具合: 領収書の内訳「消費税額」が実際と合わない(例: 税込23,100の請求で消費税1,260と表示。正しくは2,100=10%)。
- 原因: 明細の tax_amount 列に移植データの不正値(8%換算や0)が入っており、それをそのまま合算していた。
- 修正(receipt/route.ts): tax_amountを信用せず、各明細の 税込金額(amount_including_tax)−税抜金額(amount) を消費税額として算出。税込が無い明細は 税抜×税率(tax) で計算。入金額≠請求総額の場合は従来どおり比率按分し、内訳が表示額に必ず一致するようにした。
- 検証: 実請求2件で確認。2090663(税込23,100)→税抜21,000/消費税2,100、2032018(税込124,300)→税抜113,000/消費税11,300、いずれも正しい10%。tscエラー無し。
