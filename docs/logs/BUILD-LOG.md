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
