# 川口典礼 葬儀管理ソフト — 解析と実装計画

> スマート葬儀(app.smartsougi.jp)の実画面・フォーム・ヘルプを解析し、訃報案内とは別ページの「葬儀管理」として自社クローンを構築する。
> **クローンでは「スマート葬儀」名称は一切表示せず「川口典礼 葬儀管理ソフト」とする。**
> 解析アーティファクト: `tmp/smart/out/`（画面/フォーム/routemap）、`tmp/smart/help/`（マニュアル39ページ）。

## システム全体像（Rails製CRM/ERP）
サイドバー: 顧客管理 / 請求管理 / 発注管理 / スケジュール管理 / AI遺影写真 / 分析 / SMS / 設定 / ヘルプ

### 業務フロー
初期マスタ登録 → 顧客登録 → (事前相談/葬儀発生) → 見積作成 → 請求書 → 入金/領収書/売掛 → 発注/納品/買掛 → スケジュール/打合せ → アフター。

### 主要エンティティ（/users/customer_managements/*）
- customers（顧客）, estimates（見積）, invoices（請求書）, deposits（入金）, receipts（領収書）,
  receivable_accounts（売掛）, order_to_suppliers（発注）, deliveries（納品）, payable_accounts（買掛）,
  schedules/latest_schedules/meetings/rota（予定/打合せ/シフト）, memorial_portrait_requests（AI遺影）,
  sales/sale_downloads/order_downloads, sms_logs。

### マスタ群（manages/* と /users/*）
会社情報(organizations/organization_companies), エリア(areas), 会場(venues), 斎場火葬場(organization_crematoria),
顧客種別(customer_kinds), 流入経路(inflows), ステータス(states), 会員(memberships/member_*), 宗教者(my_temples),
商品種別(product_kinds), 商品(products), 値引商品(discounted_products), 商品セット(product_sets),
まとめ商品(product_bundles), ざっくり商品(rough_products), 発注先(suppliers), 送料, 売上区分(sale_categories),
仕入区分(purchase_categories), 備考定型文(note_masters/remarks), トークマニュアル(talk_manuals), 車両(car_models),
安置(lounges), 清め(purify_*), 搭乗(boarding_places), 送迎(pick_up_locations/transport_destinations) 他多数。

## 中核データモデル（実フォームから抽出）
### 顧客 customer（新規フォーム36項目）
last_name/first_name/last_name_kana/first_name_kana, state(ステータス), inflow(流入経路), user(担当),
registered_at, gender, birth_date, telephone_number, mobile_number, fax_number, email,
available_sms_auto_sent, available_dm_send, available_mail_magazine,
postcode, prefecture_code, address_city, address_street, address_building, note, rank, relation_id(顧客番号), reason(問い合わせ理由)。
- ステータス: 問い合わせ/資料請求/事前相談・見積もり/イベント参加/会員登録/葬儀施主情報登録/セルフプランニング/受注/施行済み/他決
- 流入経路: 自社/いい葬儀/よりそう/安心葬儀/葬儀の口コミ/紹介/リピーター/その他/チラシ/ネット

### 見積 estimate（新規フォーム47項目・複合）
construction_no(施行番号), customer, customer_funeral_target(対象者=故人),
estimate_target_kind(宛名種別: 喪主/施主/親族/一般/得意先/顧客/登録済み顧客), 宛名住所, title_of_honor(敬称),
title(件名), memo(摘要), estimate_on(見積日), estimate_limit_on(有効期限),
crematorium(火葬場), bland(ブランド), venue(会場), product_set(商品セット), membership,
明細: estimate_rough_product_quantities[](ざっくり商品×数量), advance_payment(前受金),
organization_company(発行会社), chartered_organization(計上組織), user(計上担当)。
→ **見積の「対象者(故人)」「宛名(喪主)」情報を、後段で訃報案内(memorials/deceased)へ連携する設計にする。**

## 実装計画（フェーズ）
完全クローンは大規模のため段階構築。名称・配色は川口典礼(紫#9b2fae系管理UI)に合わせる。

- **Phase 1（基盤＋顧客管理）**: `/kanri` セクション。共通レイアウト(サイドバー=川口典礼葬儀管理ソフト)、ダッシュボード(クイックアクション/カレンダー/最近の顧客/月別登録数)、顧客管理(一覧/新規/詳細)。AI遺影写真は仮ページへのボタンのみ。他モジュールはシェル(準備中)。
- **Phase 2（マスタ）**: 会社情報/会場/斎場火葬場/発行会社/顧客種別/流入経路/商品種別/商品/値引/セット等のマスタCRUD。
- **Phase 3（見積）**: 見積作成(商品明細/セット/値引/合計計算)・見積書PDF。故人/喪主情報の入力。
- **Phase 4（請求・入金・領収・売掛）**。
- **Phase 5（発注・納品・買掛）**。
- **Phase 6（スケジュール・打合せ・SMS・分析）**。
- **Phase 7（訃報案内連携）**: 見積の故人/喪主→訃報案内(memorials)自動作成。

DB: Supabase。テーブルは `fk_` プレフィックス(funeral kanri)で葬儀管理用に分離、既存の訃報案内(memorials等)と共存。funeral_home_id でテナント分離(現状デモID)。
