<!-- 自動生成: 25人専門家Workflow (2026-06-28) の統合成果物。原典: docs/00-target-spec.md -->

# 自社アット葬儀 統合仕様 & 改善設計書

> 対象スタック: Next.js 16 (App Router) + React 19 + Supabase (Postgres/Auth/Storage/RLS/Realtime/Edge Functions) + Tailwind 4 / 決済: Stripe Connect
> 想定利用者: 日本の葬儀社（マルチテナント）・喪主/遺族・会葬者/弔問者（多くが50〜80代・ログイン不要前提）

---

## 1. エグゼクティブサマリー

本システムは at-sougi.com（funeral.at-sougi.com）の「オンライン訃報案内＋オンライン祭壇＋香典/供花決済」をクローンしつつ、**現場の超短納期運用・金銭の法務設計・遺族のプライバシーと感情安全**の3点で原典を明確に上回ることを狙う。

25名の専門家見解を統合した結果、本プロジェクトの成否を決める「外してはいけない核」は次の7つに集約される。

1. **超最短公開フロー（5分・必須4項目）と後追い更新**: 逝去→通夜が1〜3日という現実に対応し、日程・斎場・宗派が未確定でも下書き→即時公開でき、後から訂正が既共有URLへ自動反映される。長大フォームは離脱と事故の元。
2. **金銭フローの法務設計を初期から（最重要法的リスク）**: 香典は「会葬者→喪主」への資金移転。自社が預かって送金すると**資金決済法上の為替取引/資金移動業**に抵触しうる。**Stripe Connect（Express）でマーケットプレイス型にし、資金を喪主アカウントへ直接帰属**させ、自社は決済代行に徹する。法務・税務レビューと特商法表記・KYCを初期から。
3. **アクセス制御の多層化とプライバシー・バイ・デフォルト**: 家族葬・密葬が主流化。デフォルト限定公開・推測不能トークン・noindex既定・香典/供花/参列「辞退」フラグを一級市民として扱う。
4. **宗派の出し分け**: 仏式（焼香）／神式（玉串奉奠）／キリスト教式（献花）／無宗教の語彙・所作・表書きを動的に切替。未設定時は中立表現にフェイルセーフ。
5. **高齢者・モバイルファースト**: ログイン不要閲覧、18px以上・行間広め・タップ44px以上、LINE共有を第一級チャネル、ゲスト決済（Apple/Google Pay）。
6. **マルチテナント分離とRLS厳格化**: funeral_homes をルートテナントに、全業務テーブルへ funeral_home_id。JWTカスタムクレーム駆動RLS（profiles再帰参照を避ける）、deny-by-default。
7. **グリーフ配慮のトーン＆ライティング**: EC語（購入・カート・決済完了・祝祭演出）を排し、儀礼語（香典をお供えする・お気持ちを贈る）へ。忌み言葉は「提案型」注意（強制ブロックしない）。

**差別化の柱（LTV源泉）**: WEB出欠（RSVP）×受付QR×香典帳統合、喪主向け自動精算ダッシュボード、香典返し（半返し）連動、四十九日・一周忌の継続供養（メモリアル化＋法要送客）。

---

## 2. ユーザーロールと権限

ロールはDB enumで定義し、家族は多対多（memorial_members）で複数編集者を許容する。

| ロール | 識別 | 主な権限 | 制限 |
|---|---|---|---|
| 葬儀社管理者 (funeral_home_admin) | staff_users / profiles | 自社（funeral_home_id）配下の全案件の代理作成・編集・公開承認・テンプレ・スタッフ割当・KPI/請求閲覧 | 他社テナントのデータ不可。香典「個人別金額・氏名」は集計値のみ |
| 葬儀社オペレーター | staff role | 担当案件の作成・編集・モデレーション | 請求・全社KPIは不可 |
| 喪主/施主 (chief_mourner) | memorial_members(role=chief_mourner, is_primary) | 自案件の編集・公開設定・メッセージ承認・香典/精算確認・送金先口座(KYC)・香典帳エクスポート | 他案件不可。送金先変更は監査＋通知 |
| 家族 (family) | memorial_members(role=family) | 自案件の編集・閲覧（権限は喪主が委譲） | 送金先・出金は不可（喪主のみ） |
| 会葬者/弔問者 (attendee/visitor) | 匿名 or 簡易招待 | 公開済み案件の限定カラム閲覧、焼香/献花、お悔やみ投稿、香典/供花決済 | ログイン不要。INSERTはアクセストークン＋WITH CHECKで対象案件に限定 |

**権限設計の原則**
- 画面導線は3系統（admin / dashboard(喪主・家族) / 公開閲覧）を**混在させない**。
- **代理作成→引継ぎ**: 葬儀社が打合せ時に下書き→QR/招待リンクで喪主へ編集権移譲。
- 強い操作（公開範囲変更・香典額/送金先変更・削除）は監査ログ＋家族通知。
- 葬儀社admin は**MFA強制**。service_role keyは絶対クライアントに出さない。

---

## 3. 機能要件（クローン必須）— 機能ごとの詳細・受入基準

### 3.1 オンライン訃報案内（訃報ページ）

**詳細**
- 必須4項目（故人名・日程・会場・喪主名）で公開可能。写真・追加情報はプログレッシブ入力。
- ファーストビューに「通夜/葬儀・告別式の日時・会場・地図・アクセス・駐車場・受付時間・香典/供花の可否・服装」を1スクリーン集約。問い合わせ最多の「日時と場所」を最優先。
- 式次第（通夜/葬儀・告別式/出棺/火葬/初七日/精進落とし）を時系列表示。喪主・施主・続柄・世話役/連絡先を構造化。
- 状態機械: `draft → published → closed → archived`。公開前プレビュー・二重確認・変更履歴（誰がいつ訂正したか）。
- 日付は和暦/西暦併記オプション、曜日・午前午後をaria-labelで明示、固有名詞にふりがな（ruby）。
- 既共有URLは不変トークン。訂正は同URLへ自動反映。

**受入基準**
- [ ] 必須4項目のみで公開でき、未確定の日程/斎場/宗派を後追い更新すると共有URLへ即反映される。
- [ ] 公開前にプレビューで匿名閲覧者の見え方を確認できる。
- [ ] 公開→非公開→再公開の状態遷移が履歴に残る。
- [ ] 訃報URLは推測不能トークン（128bit以上 / ULID/nanoid）で連番不可。
- [ ] noindex がデフォルト、公開許可時のみ index（喪主同意フロー必須）。

### 3.2 アクセス制御（公開範囲）

**詳細**: `public（完全公開）/ unlisted（URLを知る人のみ）/ passcode（合言葉）/ invite_only（招待制）` の4段階を案件単位で切替。デフォルトは最も狭い設定。passcodeはハッシュ保存、検証はEdge Function/RPC(security definer)経由でトークン発行（生passcodeをanonに露出しない）。住所・喪主電話・出棺時刻など機微情報は「認証後/家族のみ」段階開示。

**受入基準**
- [ ] 二層（推測不能URL＋RLS）を必ず併用。slug漏洩だけで全データに到達できない。
- [ ] passcode総当りにレート制限＋アクセスログ。
- [ ] 限定公開時、非ログイン/検索botがアクセス不可（noindex＋X-Robots-Tag両方）。
- [ ] 家族葬・辞退案件では香典/供花/参列ボタンがUIから完全に消える（設定と矛盾しない）。

### 3.3 オンライン祭壇（写真/動画・思い出）

**詳細**: 祭壇・式場・遺影の写真/動画、故人プロフィール、思い出エピソード。縦型(9:16)最適化、遅延読込・LQIP/blurhashプレースホルダ、動画は自動再生せずミュート＋大きな再生ボタン。private バケット＋短期署名URL配信。喪主が即時に非公開化できる操作を常設。

**受入基準**
- [ ] HEIC/HEVC をサーバ側でJPEG/WebP/AVIF・H.264 MP4(faststart)へ変換してから公開。
- [ ] EXIF GPS等メタ除去・Orientation焼き込み済み。
- [ ] サムネ/中/拡大/原寸の多段サイズで初期転送1MB以下。
- [ ] DBレコード削除でStorage実体も連動削除（孤児ファイルゼロ）。
- [ ] アップロードは公開前モデレーション（喪主/葬儀社承認）を通す。

### 3.4 バーチャル参拝（焼香/献花/玉串奉奠）

**詳細**: 宗派により `焼香（仏式）/玉串奉奠（神式）/献花（キリスト教・無宗教）` をラベル・所作ガイドごと出し分け。ワンタップ完了、名前（任意・匿名可）を芳名録として記録。控えめなマイクロインタラクション（線香の煙・献花が積まれる）＋累計数で「一人ではない」感覚。**過度な演出・ゲーム感・回数競争表示は禁止**。

**受入基準**
- [ ] 同一参列者の連打抑止（token/IPでレート制御、(memorial_id, user_id)部分unique）。
- [ ] キーボードのみで完結（Enter/Space）、完了を aria-live で読み上げ。
- [ ] prefers-reduced-motion でアニメ抑制。
- [ ] 喪主が芳名録をCSV出力でき会葬御礼に使える。

### 3.5 香典決済（オンライン香典）

**詳細**
- 金額は4・9を避けたプリセット（3,000/5,000/10,000/30,000円）＋任意入力。関係性別の相場ガイドを提示（同調圧力コピー・高額デフォルトは禁止）。
- 決済前に**手数料負担者・喪主受取額・着金予定日・香典返しの扱い**を明示。表書き（御霊前/御仏前/御花料/御榊料）を宗派で出し分け。
- 喪主の口座未登録でも会葬者は先に決済可能（**プール→後日精算**）。
- 領収/受付完了メール、喪主向け受領者一覧（誰からいくら）。

**受入基準**
- [ ] **金額はサーバ側で再計算**。クライアント送信額を信用しない。
- [ ] JPYは整数円（zero-decimal currency）。×100バグを作らない。
- [ ] 全PaymentIntent/refund/transferに冪等キー（注文IDベース、DB永続化＋unique）。
- [ ] 決済確定は**Webhookを唯一の真実源**（署名検証＋event.id dedup）。フロントのリダイレクト成功で確定しない。
- [ ] 3Dセキュア（EMV 3DS）必須。カード情報は自社DB非保持（SAQ-A）。
- [ ] 香典辞退フラグONで決済導線が無効化され、供花/メッセージのみへ自動切替。

### 3.6 喪主への送金（ペイアウト/精算）

**詳細**: Stripe Connect（Express）で喪主をConnected Accountに。`destination charges` または `separate charges & transfers`。**送金は葬儀後N日（クーリング期間）まで platform 残高で保留→確定後一括payout**（transfer_reversal地獄回避）。KYC未完なら集金は可・送金は保留。`payout_status: holding / pending_kyc / scheduled / paid / failed` を喪主ダッシュボードで完全可視化。

**受入基準**
- [ ] KYC（口座・本人確認）完了まで payout 不可。account.requirements を監視。
- [ ] 集計額＝個別決済合計（手数料・返金・チャージバック控除後）が一致。
- [ ] 返金は部分返金・二重返金防止に対応。送金前は通常返金、送金後は reversal を要管理。
- [ ] 送金先口座は暗号化保存（Supabase Vault / pgcrypto）。

### 3.7 お悔やみメッセージ

**詳細**: 本文＋画像、ログイン不要投稿。**デフォルトで喪主/葬儀社承認後に公開**（pending/approved/rejected/hidden）。宗派別文例テンプレート、忌み言葉の提案型注意（重ね言葉/直接表現/不吉語）。喪主は非表示・通報対応可。負担軽減コピー（「お気持ちだけでも十分です」）。

**受入基準**
- [ ] 公開前モデレーション必須（初期 pending）。
- [ ] レート制限＋bot対策（Turnstile/reCAPTCHA）＋NGワード/URLフィルタ。
- [ ] XSS対策（HTMLエスケープ、dangerouslySetInnerHTML禁止、許可時DOMPurify）。
- [ ] 画像はMIME検証・EXIF除去・自動モデレーション通過まで非公開。

### 3.8 供花・供物のオンライン注文

**詳細**: 商品マスタ（一基/一対単位）、芳名/会社名+役職/連名、立札文言（札名）プレビュー、配列順。**斎場ごとの設営締切時刻を過ぎた注文は自動でクローズ**。締切・配列・立札表記の取り違え防止。注文時価格をスナップショット保持。

**受入基準**
- [ ] 締切超過注文を自動受付不可にし、決済を防ぐ。
- [ ] 札名・差出人表記・配列順が花屋/斎場へ正しく連携。
- [ ] 価格改定後も過去注文・領収の金額が不変（unit_price_at_order）。
- [ ] 供花辞退フラグで導線非表示。

### 3.9 通知・共有

**詳細**: LINEを第一級（URLスキーム共有＋OGP最適化を一次手段、Messaging APIは補助）、続いてメール・SMS・QR・URLコピー。OGPは限定公開時に故人実名/顔写真を出さない選択肢。リマインド（通夜前日・当日朝）、決済完了御礼、四十九日/一周忌案内。配信ステータス可観測化（送信/到達/開封/バウンス/オプトアウト）。

**受入基準**
- [ ] デフォルトは「限定公開・SNSシェア不可」。公開拡散はオプトイン。
- [ ] 全メールに事業者表記＋配信停止リンク（特定電子メール法）。
- [ ] SPF/DKIM/DMARC設定。送信前テスト送信・二段階確認（誤送信防止）。
- [ ] なりすまし防止: 外部一斉配信は葬儀社承認 or 喪主OTP通過後のみ有効化。

---

## 4. 改善・差別化機能（オリジナル超え）— 優先度付き

### P0（初期リリースで差別化の核）
| 機能 | 内容 | 価値 |
|---|---|---|
| 代理作成→QR引継ぎ | 葬儀社が下書き→QRで喪主へ編集権移譲 | 現場運用密着・即時性 |
| 香典自動精算ダッシュボード | 総額/件数/差引手数料/着金予定日/送金状態を1画面 | 遺族事務負担を激減 |
| 香典帳（芳名録）統合エクスポート | 香典・供花・参列・住所をCSV/PDF出力、半返し額自動計算 | 葬儀社最大の実務価値・返礼送客 |
| WEB出欠（RSVP）＋受付QRチェックイン | 参列可否回答を香典帳と統合、当日QR受付 | 返礼品・料理の発注精度（原典になし） |
| 宗派プリセット | 宗派選択で焼香回数・作法・表書き・文言を自動出し分け | 若年層の不安解消・誤用防止 |
| 弔問者上乗せ式手数料 | 「手数料を負担して全額をご遺族へ」チェック | 喪主満足とCVRの両立・実質収益確保 |

### P1（早期追加で優位確立）
| 機能 | 内容 | 優先理由 |
|---|---|---|
| 継続供養/メモリアル化 | 葬儀後も残し、命日/お盆/一周忌に通知、再献花・法要送客 | LTV・リピート収益の柱 |
| 香典返し連携 | 決済額に応じた返礼品提案・発送代行・宛名住所収集 | アフター送客の最大LTV |
| ライブ配信＋VODアーカイブ | 限定URL＋パスコードで通夜/告別式配信、視聴中に焼香/献花導線 | 遠方・高齢・海外親族 |
| AI下書き生成 | 故人名/宗派/続柄から忌み言葉回避の定型文（人手確認） | オペレーター作成時間を分単位に |
| 葬儀社KPI/月次請求 | 案件数・GMV・供花売上・手数料を集計し請求連動 | 葬儀社の導入動機（追加収益） |
| 文字拡大/ふりがな/読み上げトグル | 常設・localStorage保持・ログイン不要 | 高齢者ユーザビリティ |

### P2（拡張・将来）
| 機能 | 内容 |
|---|---|
| 多言語（やさしい日本語/英語、将来zh/ko）＋海外カード決済 | 海外在住親族。氏名はromaji手入力を正とし翻訳エンジンに固有名詞を流さない |
| 経路アトリビューション | UTM短縮URLでチャネル別CVR（LINE/メール/SMS/QR）|
| 弔意エンゲージメントレポート | 弔問録のデジタル版PDF/画像を遺族へ |
| 動的ウォーターマーク | 祭壇メディアに閲覧者ハッシュで転載追跡 |
| 地域別香典相場レポート | 匿名集計のデータ収益化（上位プラン特典） |

---

## 5. 非機能要件（セキュリティ/パフォーマンス/アクセシビリティ/法令）

### 5.1 セキュリティ
- **RLS deny-by-default＋FORCE ROW LEVEL SECURITY** を全テーブルに。JWTカスタムクレーム（app_metadata の funeral_home_id / role）駆動でサブクエリレス・**profiles再帰参照禁止**（無限再帰事故回避）。
- **多層認可**: RLSだけに依存せず、Next.js の Server Component/Server Action/Route Handler でリクエスト毎に所有者チェック（IDOR防止、連番ID禁止）。
- **service_role keyはサーバ専用**。NEXT_PUBLIC_混入を最大リスクとして扱う。公開経路は anon+RLS、service_role はWebhook/管理バッチのみ。
- CSP（script-src 'self' nonce、object-src none）・Permissions-Policy・SRIをmiddlewareで一括付与。Vercel WAF＋レート制限で訃報URL列挙を遮断。
- 招待リンクは有効期限付き・単回使用・hash保存。
- 監査ログは append-only（prev_hashで改ざん検知）。香典額・送金先・公開範囲変更は特に記録＋家族通知。

### 5.2 パフォーマンス（Core Web Vitals / モバイル回線）
- 訃報ページは **PPR（Partial Prerendering）**: 静的シェル（故人名・日程・地図）を即時配信、焼香カウント・最新メッセージ等の動的部分のみSuspenseストリーミング。
- バジェット: **First Load JS ≤150KB gzip / LCP<2.5s / INP<200ms / CLS<0.1**。
- 遺影は `next/image` priority＋fetchpriority=high、width/height固定でCLS=0。Supabase Image Transformation経由（原寸直貼り禁止）。
- ギャラリーは仮想スクロール/ページネーション＋遅延読込。動画はposter＋クリック読込・preload=none、HLS ABR（240/480/720p）。
- Stripe.js は決済ステップまでロードしない。日本語フォントはサブセット/ローカル優先（Noto Sans JP全文字同期ロード禁止）。
- SNS拡散スパイク対策: 静的配信＋CDNキャッシュでオリジン（Supabase）保護、Supavisor接続プーラ設定。
- web-vitals フィールド計測をSupabaseへ送信、Lighthouse CIをパイプラインに。

### 5.3 アクセシビリティ（WCAG 2.2 AA / 高齢者）
- 本文18px以上（rem指定・固定px禁止）・行間1.8前後・200%拡大でレイアウト非破壊・タップ48×48px・コントラスト4.5:1以上。
- 固有名詞にruby/rt、日付は「2026年6月28日（日）」形式＋aria-label。
- バーチャル参拝はキーボード完結＋aria-live完了通知。色のみで情報を伝えない（受付中/締切はテキストでも）。
- フォーカスリングを消さない（:focus-visible）、モーダルはフォーカストラップ＋Esc。
- 決済フォームは label/for/id 紐付け、aria-required、エラーは role='alert'＋aria-describedby、失敗時フォーカスをエラー先頭へ。
- prefers-reduced-motion対応、点滅/自動再生排除。axe-core + Playwright/jest-axe をCIに。実機（NVDA/VoiceOver/TalkBack）でruby二重読みを検証。

### 5.4 法令・コンプライアンス
- **資金決済法/為替取引**: Stripe Connect で資金を喪主アカウントへ直接帰属させ自社に滞留させない（収納代行＋即時パススルー、エスクローしない）。法的整理を弁護士意見書として保管しPSP審査/監査時に提示。
- **前払式支払手段の回避**: チャージ/ポイント/プリペイドを持たず都度決済のみ。
- **特商法表記**: 事業者名/住所/電話/代表者・販売価格・送料・支払時期方法・引渡時期・返品特約（クーリングオフ非適用）を全画面からアクセス可能に常設。法務マスタでDB一元管理＋変更履歴。自動更新（SaaS課金）は最終確認画面表示義務に対応。
- **割賦販売法**: クレカ非保持化（トークン方式）＋EMV 3DS。
- **個人情報保護法**: 故人本人は対象外だが遺族は保護対象。利用目的特定・第三者提供（葬儀社⇔自社⇔花屋⇔PSP）整理・委託先監督・データフロー図添付。保有期間ポリシー（葬儀後N日/四十九日/一周忌後）で自動非公開・削除/匿名化。削除権・データエクスポート対応。
- **犯収法/反社**: 喪主口座登録時にeKYC＋反社チェック（偽訃報による香典詐取防止）。
- **データ所在**: Supabase/Vercel を東京（ap-northeast）に寄せ、DBラウンドトリップ削減。
- **コンテンツ**: プロバイダ責任制限法に基づく発信者情報開示対応、通報・削除フロー。

---

## 6. データモデル（Supabase/Postgres 素案・主要カラム・RLS方針）

**設計原則**: 主キーは `uuid (gen_random_uuid)`／公開URLは別途 `slug`（ULID/nanoid）／金額は**integer 円**（float/numeric禁止）／全業務テーブルに `funeral_home_id`・`created_at/updated_at`・`deleted_at`（論理削除）／enumはtext+CHECK or lookupテーブルで拡張容易に。

### テナント・ユーザー
```
funeral_homes(id, name, logo, contact, address, phone, plan, billing_type[fixed/revshare],
  stripe_account_id, fee_rate, branding_jsonb, kyc_status, created_at)
profiles(id=auth.users.id, funeral_home_id, role[home_admin/operator/mourner/family],
  display_name, phone, created_at)   -- RLSはJWTクレーム駆動（本テーブル再帰参照しない）
```

### 訃報・故人・日程
```
memorials(id, funeral_home_id, slug[random128bit], status[draft/published/closed/archived],
  access_level[public/unlisted/passcode/invite_only], passcode_hash, noindex_flag,
  funeral_style[family/general/direct], religion_type[仏式/浄土真宗/神式/キリスト教式/無宗教/中立],
  koden_decline, flower_decline, attend_decline,
  koden_accept_until, offering_accept_until, published_at, archive_at, deleted_at)
memorial_members(memorial_id, user_id, relation, role[chief_mourner/family], is_primary, invited_by)
deceased(id, memorial_id, name_kanji, name_kana, name_romaji, name_ruby_html, posthumous_name,
  birth_date, death_date, age_kazoe[享年], age_full[行年], portrait_path, portrait_alt,
  religion, relation_to_mourner, bio_text)
chief_mourners(id, memorial_id, name_kanji, name_kana, relation, contact_phone_enc,
  payout_stripe_account_id, kyc_status, payout_status)
funeral_events(id, memorial_id, event_type[通夜/葬儀/告別式/出棺/火葬/法要], funeral_style,
  start_at, end_at, datetime_label, venue_name, venue_address, venue_kana, lat, lng, map_url,
  parking_note, access_text, reception_time, live_stream_url)
memorial_revisions(id, memorial_id, snapshot_jsonb, edited_by, created_at)  -- 訂正履歴
```

### メディア・参拝・メッセージ
```
media_assets(id, memorial_id, owner_id, kind[image/video], status[uploading/processing/
  pending_review/published/failed], storage_path_original, mime, bytes, width, height,
  duration_ms, checksum, phash, exif_stripped, csam_hash_match, created_at)
media_renditions(id, asset_id, variant[thumb/md/lg/orig/avif/webp/hls_240/480/720],
  storage_path, format, bytes, width, height)
media_metadata(asset_id, blurhash, lqip_base64, alt_text, caption, has_captions, captions_vtt_url)
altar_galleries(id, memorial_id, title, sort_order, visibility)
virtual_worships(id, memorial_id, access_token_id, worship_type[焼香/玉串/献花], display_name,
  is_anonymous, message, ip_hash, created_at)
condolence_messages(id, memorial_id, author_id_or_anon, sender_name, body_sanitized, image_path,
  image_alt, moderation_status[pending/approved/rejected/hidden], spam_score, ngword_hits,
  approved_by, ip_hash, device_fp, published_at, deleted_at)
```

### 金銭（payment/payout を厳格分離 ＋ 複式台帳）
```
payments(id, funeral_home_id, memorial_id, type[koden/flower/offering], payer_user_id_or_anon,
  amount_jpy, application_fee_jpy, processing_fee_jpy, currency='jpy',
  provider, provider_payment_intent_id UNIQUE, idempotency_key UNIQUE,
  threeds_status, status[requires_payment/processing/succeeded/refunded/failed/chargeback],
  risk_score, payer_ip, card_bin_hash, captured_at, created_at)
koden_payments(id, payment_id, memorial_id, donor_name, donor_company, hyogaki[御霊前/御仏前/御花料],
  message, fee_payer[sender/recipient], is_amount_public, return_gift_address_enc, return_target)
offering_products(id, funeral_home_id, name, name_kana, type[供花/供物], unit, unit_price_jpy,
  cost_price, image_path, image_alt, supplier_id, is_active)
offering_orders(id, payment_id, memorial_id, product_id, quantity, unit_price_at_order,
  name_plate_text, donor_name, sort_order, delivery_to, deadline_at, status)
payouts(id, memorial_id, recipient_account_id, gross_jpy, fee_jpy, net_jpy,
  provider_transfer_id UNIQUE, provider_payout_id, status[holding/pending_kyc/scheduled/paid/failed],
  cooling_until, hold_reason, paid_at)
connected_accounts(id, mourner_user_id, stripe_account_id, account_type='express', kyc_status,
  requirements_due[], payouts_enabled, charges_enabled)
refunds(id, payment_id, provider_refund_id, reason[funeral_canceled/duplicate/declined],
  amount_jpy, transfer_reversal_id, status, created_at)
ledger_entries(id, payment_id, payout_id, account, debit, credit, occurred_at)  -- 複式・突合用
processed_webhook_events(event_id PK, type, payload_jsonb, processed_at, status)  -- 冪等dedup
koden_register(memorial_id, ...)  -- 香典/供花/参列統合の遺族向けエクスポートビュー
```

### RSVP・招待・通知・分析・監査
```
rsvp(id, memorial_id, attendee_name, kana, mode[real/online], event_type, headcount, checked_in_at)
memorial_access_tokens(id, memorial_id, token_hash, scope, expires_at, created_by)
memorial_invitations(id, memorial_id, email_or_phone_hash, token_hash, channel[email/line/sms],
  single_use, expires_at, accepted_at)
share_links(id, memorial_id, channel, locale, short_code, utm, passphrase_hash, expires_at, revoked_at)
access_logs(id, memorial_id, share_link_id, action[view/incense/koden/flower], channel,
  visitor_hash, ip_hash, ua, is_bot, occurred_at)
notifications(id, memorial_id, recipient, channel[email/sms/line], template, locale,
  scheduled_at, status[queued/sent/delivered/opened/bounced/failed], provider_message_id)
live_streams(id, memorial_id, status[scheduled/live/ended], scheduled_start_at, ingest_url,
  stream_key, playback_id, provider)
stream_recordings(id, live_stream_id, hls_url, mp4_url, duration_sec, expires_at, downloadable)
stream_consents(id, memorial_id, temple_sect, broadcast_allowed, ng_segments, signed_by, signed_at)
accessibility_pref(session/user_id, font_scale, high_contrast, reduced_motion, ruby_on)
moderation_queue(id, target_type, target_id, reason, source[auto/report], assignee, decision, sla_due_at)
abuse_reports(id, target_type, target_id, reporter_hash, reason_code, status)
rate_limit_events(key, action, window, count)
copy_messages(key, locale, religion_type, context, text, reviewed_by)  -- UI文言マスタ辞書
forbidden_words(word, category[重ね言葉/直接表現/不吉語], suggestion, religion_scope)
legal_disclosures(事業者名/住所/電話/代表者/返品特約/自動更新条件/改定履歴)
consent_records(actor, 同意種別, 同意version, 取得日時)
translations(id, entity_type, entity_id, field, locale, text, source_locale, status)
metrics_daily(memorial_id, date, view_uu, incense, kenka, koden_count, koden_amount, msg, flower)
home_kpi_rollup(funeral_home_id, period, case_count, avg_attendees, avg_koden, online_pay_rate)
invoices(id, funeral_home_id, period, case_count, gmv, fee_total, total_amount)
audit_logs(id, funeral_home_id, actor_id, actor_ip_hash, action, target_type, target_id,
  before_jsonb, after_jsonb, prev_hash, created_at)  -- append-only
data_retention_jobs(target, schedule, action[delete/anonymize])
```

**RLS方針（要点）**
- 葬儀社admin: `funeral_home_id = jwt.funeral_home_id` の行のみ。香典は集計ビュー（PII除外、k-匿名でn<3非表示）のみ。
- 喪主/家族: `EXISTS(memorial_members where user_id = auth.uid())` で自案件のみ。
- attendee（anon）: SELECTは公開済み案件の限定カラム（`obituary_public_view`）。INSERT（焼香/メッセージ/決済）は memorial_access_tokens 検証＋WITH CHECKで対象memorial限定。
- payments/payouts の status更新は **service_role（Webhook/Edge Function）のみ**。クライアントUPDATE/INSERT全面禁止。
- Storage: バケットを用途別分離（memorial-photos/altar-media/condolence-images）、パス `{funeral_home_id}/{memorial_id}/...`、第1階層テナント照合必須、private＋短期署名URL。
- Realtime: 集計値・匿名イベントのみpublication対象。個票（誰がいくら）は購読不可。

---

## 7. 技術アーキテクチャ

### 7.1 ルーティング（Next.js 16 App Router）
- Route Group で `(public) / (auth/dashboard) / (admin)` を分離、layout単位で認証境界。
- 公開訃報: `/[locale]/m/[slug]`（推測困難slug）、ネストで `/m/[slug]/koden`・`/kenka`・`/message`・`/flower`・`/live`。
- 管理: `/admin`、喪主/家族: `/dashboard`。
- 葬儀社集客（会社/式場/お役立ち記事）は `/company`・`/guide` で**訃報とURL構造を分離**しSEO対象を明確化。

### 7.2 レンダリング/データ
- 公開訃報の固定情報はServer Component＋PPR。動的値（焼香カウント・香典締切・最新メッセージ）はSuspenseストリーミング・no-store。
- 書き込みはServer Actions/Route Handler集約（zodバリデーション＋認可ラッパー＋冪等トークンで二重送信防御）。
- @supabase/ssr で **4種クライアント分離**（Server Component読取 / Server Action書込 / middlewareセッション更新 / Client）。リクエスト毎生成、グローバル共有しない。
- middlewareは軽量（セッションリフレッシュ＋ラフなルート保護）、認可はデータ層で毎回。
- キャッシュ: 個人情報を含むためcacheTag付与＋編集時 revalidateTag/updateTag で確実に無効化。別故人情報の誤キャッシュを防ぐ境界明示。

### 7.3 決済（Stripe Connect）
- PaymentIntentはサーバ側で金額確定（注文内容から再計算）。Payment Element＋wallets（Apple/Google Pay）。
- Webhook（`/api/webhooks/stripe`, Node runtime）で署名検証＋event.id dedup。`payment_intent.succeeded / charge.refunded / transfer.created / account.updated / payout.paid` を受信し payments/payouts を更新。
- destination charge＋application_fee で手数料分離。クーリング期間中は platform 残高保持→確定後一括 transfer/payout。
- Stripe Radar で不正検知（少額多重/BIN総当り）。アカウント審査時に事業区分を申告し凍結リスクを事前低減。国内PSP（GMO/SBPS）フォールバックを検討。

### 7.4 メディア処理
- クライアント事前リサイズ→Supabase Storage 署名付き直アップロード（Server Action中継しない、bodyサイズ上限回避）。
- 非同期ジョブ（Edge Function/Queue or 外部ワーカー）でHEIC/HEVC変換・多段リサイズ（AVIF/WebP）・H.264 MP4(faststart)/HLSトランスコード・EXIF除去・自動モデレーション。完了をRealtime通知。
- 大量同時視聴の動画は外部（Mux/Cloudflare Stream）署名URL配信、SupabaseはメタデータとアクセスIDに限定。

### 7.5 通知
- メール/SMSは専用ESP（Resend/SendGrid + Twilio）。SPF/DKIM/DMARC、バウンス/到達監視。
- LINEはURLスキーム共有＋OGP最適化を一次、Messaging APIは補助。
- スケジュール送信はpg_cron＋通知テーブル＋Edge Function。ライブ配信前/開始/VOD公開通知。

### 7.6 DevOps/インフラ
- 環境分離: Supabaseを本番/ステージング/開発で別プロジェクト、Vercel production/preview/developmentにマッピング。previewは専用Supabase＋Stripeテストキー固定。
- シークレット: service_role/Stripe secretはVercel Sensitive環境変数。命名規約でanon混同防止。
- バックアップ: PITR有効化（最低7日、可能なら28日）＋日次pg_dump別リージョン退避＋四半期リストア訓練。Storageは rclone で外部S3/R2へ定期同期（自動バックアップ対象外の見落とし防止）。
- マイグレーション: Git管理＋CI（GitHub Actions）で `supabase db push`、手動本番直叩き禁止。RLS変更は必ずレビュー＋pgTAP回帰テスト。
- 可観測性: Sentry（フロント＋サーバ）、Vercel Analytics/Speed Insights、構造化ログ（リクエストID）、合成監視（訃報表示→テスト決済→完了）。重大アラート（決済失敗率/到達率）はPagerDuty/Slack＋オンコール（葬儀は土日夜間集中）。

---

## 8. リスクと対策

| # | リスク | 深刻度 | 対策 |
|---|---|---|---|
| 1 | 香典送金が資金移動業/為替取引に抵触（無登録営業） | 致命 | Stripe Connectで資金を喪主へ直接帰属・滞留させない。弁護士意見書を初期取得・保管 |
| 2 | 訃報の遅延・誤掲載（日時/式場誤り） | 致命 | 公開前プレビュー・二重確認・変更履歴・公開後訂正導線。必須4項目＋後追い更新 |
| 3 | RLS設定ミス/service_role露出で他案件・他社データ・香典額流出 | 致命 | deny-by-default＋FORCE RLS、JWTクレーム駆動、service_roleサーバ専用、pgTAP回帰テストをマージブロック |
| 4 | 決済をクライアントリダイレクトで確定（未入金計上/二重課金/金額改ざん） | 致命 | Webhook唯一の真実源＋署名検証＋冪等キー、サーバ側金額再計算、JPY整数 |
| 5 | 家族葬/辞退案件で決済導線露出・URL拡散 | 高 | 辞退フラグでUI完全非表示、デフォルト限定公開＋SNSシェア不可、noindex既定 |
| 6 | 訃報URL推測/列挙・検索インデックスでプライバシー侵害 | 高 | 128bit以上トークン・連番禁止・noindex＋X-Robots-Tag、終了後410/自動非公開 |
| 7 | なりすまし訃報・香典詐欺 | 高 | 葬儀社発行/承認 or 喪主OTP・eKYC・反社チェック、送金クーリング、葬儀社確認済バッジ |
| 8 | 演出過剰/EC的UI/祝祭アニメで不謹慎・炎上 | 高 | 静謐トーン、儀礼語、コンポーネント既定演出を必ず差し替え、回数競争表示禁止 |
| 9 | 送金後返金不能・KYC未完で資金滞留 | 高 | クーリング期間中はplatform保留、KYC後のみpayout、集金可・送金保留の状態管理 |
| 10 | UGC経由XSS/不適切画像/EXIF位置情報漏洩 | 高 | サニタイズ・DOMPurify・公開前モデレーション・MIME検証・EXIF除去・pHash照合 |
| 11 | 高解像度写真大量アップロードで祭壇ページ崩壊・コスト暴走 | 中 | サーバ側変換必須・容量上限・使用量メーター・CDN最適化 |
| 12 | SNS拡散スパイクでDB/コネクション枯渇 | 中 | 静的配信＋CDN、PPR、Supavisor、イベント駆動増分集計 |
| 13 | 高齢者の決済離脱・誤決済/二重決済 | 中 | Apple/Google Pay・大文字UI・確認/完了画面・取消猶予・代替（コンビニ/振込/電話）・サポート常設 |
| 14 | 宗派取り違え（浄土真宗に「ご冥福」等） | 中 | 宗派フラグで出し分け、未設定は中立表現フェイルセーフ、人手監修文言辞書 |
| 15 | メール不達/迷惑メール判定で訃報が届かない | 中 | DMARC設定・到達監視・多チャネル/紙併用・電話導線 |
| 16 | バックアップ未検証・Storage消失（遺影=代替不可） | 中 | リストア訓練・Storage外部同期 |
| 17 | 機械翻訳直訳で弔事表現が失礼 | 低中 | glossary＋人手監修、固有名詞はromaji手入力を正 |

---

## 9. 実装ロードマップ（フェーズ分割・loopで進める順序）

各フェーズは「スキーマ→RLS→API/Server Action→UI→テスト」の順で1ループとして回す。RLS回帰テスト（pgTAP）とWebhook冪等E2EはCIのリリースゲート。

### フェーズ0: 基盤（土台を最初に固める）
1. Supabaseプロジェクト3環境分離・Vercel環境変数マッピング・シークレット管理。
2. テナント/ユーザースキーマ（funeral_homes/profiles/memorial_members）、**JWTカスタムクレームHook**、deny-by-default RLSの雛形、audit_logs（append-only）。
3. 法務3点セット（利用規約/プライバシー/特商法表記）と legal_disclosures マスタ、consent_records。
4. デザインシステム（Tailwind 4 @theme でAA合格色トークン・18px基準・ruby・reduced-motion）、UI文言マスタ（copy_messages）、グリーフ配慮トーンガイド。

### フェーズ1: 訃報案内コア（MVPの心臓）
5. memorials/deceased/funeral_events/memorial_revisions、状態機械（draft→published→closed）。
6. **超最短作成フロー（必須4項目）＋プレビュー＋後追い更新**、代理作成→QR引継ぎ。
7. アクセス制御4段階（public/unlisted/passcode/invite）＋noindex既定＋公開ビュー（PII除外）。
8. 公開訃報ページ（PPR・モバイルファースト・1スクリーン集約・地図/電話/.ics・宗派出し分け）。
9. LINE/メール/SMS/QR共有＋OGP（限定公開時は実名/顔写真非出力）。

### フェーズ2: 弔意・祭壇・メッセージ
10. メディアパイプライン（署名直アップロード・HEIC/HEVC変換・EXIF除去・多段サイズ・モデレーション）。
11. オンライン祭壇ギャラリー（遅延読込・blurhash・private署名URL）。
12. バーチャル参拝（宗派別・連打抑止・aria-live・控えめ演出）。
13. お悔やみメッセージ（公開前承認・忌み言葉提案・bot/レート制限・XSS対策）。

### フェーズ3: 決済・送金（法務確定後に着手）
14. 法務レビュー確定（資金フロー・特商法・KYC）→ Stripe Connect（Express）オンボーディング。
15. 香典決済（サーバ金額確定・3DS・冪等キー・辞退フラグ連動・弔問者上乗せ手数料）。
16. **Webhook基盤**（署名検証・event dedup・payments状態機械）。
17. ペイアウト（クーリング保留・KYCゲート・ledger_entries突合・喪主精算ダッシュボード）。
18. 供花・供物（商品マスタ・締切自動クローズ・札名プレビュー・価格スナップショット）。
19. 返金/チャージバック処理。決済E2E（二重課金ゼロ・3DS・返金）をリリースゲート化。

### フェーズ4: 実務価値・差別化（葬儀社の導入動機）
20. WEB出欠（RSVP）＋受付QRチェックイン。
21. 香典帳統合エクスポート（CSV/PDF・半返し額自動計算・住所収集）＋香典返し送客。
22. 通知自動化（リマインド・御礼・配信ステータス可観測化）。
23. 葬儀社KPIダッシュボード＋月次請求（invoices/home_kpi_rollup）、サーバサイド分析（確定ベース/保留ベース分離、k-匿名）。

### フェーズ5: 継続・拡張
24. 継続供養/メモリアル化（命日・お盆・一周忌通知＋再献花＋法要送客）。
25. ライブ配信＋VODアーカイブ（限定URL＋宗教同意フロー＋視聴中弔意導線）。
26. AI下書き生成（人手確認）、ふりがな自動生成＋ルビ編集UI、読み上げボタン。
27. 多言語（やさしい日本語/英語）＋hreflang＋海外カード決済（JPY請求明示）。
28. データ保持自動化（data_retention_jobs）・削除権セルフサービス・プライバシーダッシュボード。

### 横断的に全フェーズ並走
- セキュリティ（CSP/WAF/レート制限/IDOR検証/監査）、アクセシビリティ（axe-core CI・実機SR検証）、パフォーマンス（CWVバジェット・Lighthouse CI）、可観測性（Sentry/合成監視/オンコール）、テスト（RLS権限マトリクス・決済冪等・合成データ徹底）。

> **進行ルール**: 各機能は「金銭・PII・公開範囲」に触れる箇所を必ずRLSテスト＋監査ログ付きで実装。法務未確定の決済（フェーズ3）は他フェーズの完成を待たず**法務レビューを最優先で並行着手**し、ブロッカー化を防ぐ。