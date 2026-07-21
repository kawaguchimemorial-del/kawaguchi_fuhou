// マスタ定義（クライアント/サーバー共用。DB非依存・server-onlyにしない）
export interface FieldDef { key: string; label: string; kind?: "text" | "number"; col?: "name" | "kana" | "price"; selectFrom?: "product_kind" }
export interface MasterDef { type: string; label: string; category: string; fields?: FieldDef[]; hint?: string }
export interface MasterItem { id: string; name: string; kana?: string; price?: number; extra: Record<string, string>; sortOrder: number; isActive: boolean }

const NAME_ONLY: FieldDef[] = [{ key: "name", label: "名称", col: "name" }];

// ※ hint は各マスタの「用途」と「現在アプリのどこで消費されているか」を表す説明文。
// 実際に作成/業務画面で参照しているのは product_kind / product_sub_kind / supplier /
// discounted_product / purpose / estimate_template / invoice_template / rough_product_osonae と
// 別テーブルの商品セットのみ。それ以外は現状『設定登録のみ・作成/業務画面からは未参照』。
export const MASTER_TYPES: MasterDef[] = [
  { type: "venue", label: "会場", category: "基本設定", fields: [{ key: "name", label: "会場名", col: "name" }, { key: "address", label: "住所" }, { key: "tel", label: "電話" }], hint: "葬儀・通夜を行う式場や会館の登録。※現在は設定登録のみで、葬儀作成・見積もり等の画面からは未参照です。" },
  { type: "crematorium", label: "斎場・火葬場", category: "基本設定", hint: "火葬場・斎場の登録。※現在は設定登録のみ・作成/業務画面からは未参照です。" },
  { type: "org_company", label: "発行会社", category: "基本設定", fields: [{ key: "name", label: "タイトル", col: "name" }, { key: "company_name", label: "会社名" }, { key: "address", label: "住所" }, { key: "tel", label: "電話" }, { key: "invoice_no", label: "インボイス登録番号" }], hint: "見積書・請求書の発行元候補。※現在の帳票は『会社情報』(設定トップ)の値を使用しており、このマスタは未参照です。" },
  { type: "area", label: "エリア", category: "基本設定", hint: "地域エリア区分の登録。※現在は設定登録のみ・未参照です。" },
  { type: "chartered_organization", label: "計上組織", category: "基本設定", hint: "売上を計上する組織区分。請求CSV等に『計上組織』欄はありますが、この選択肢マスタ自体は現在未参照です。" },
  { type: "transport_destination", label: "搬送先", category: "基本設定", hint: "ご遺体の搬送先の候補。※現在は設定登録のみ・未参照です。" },
  { type: "pick_up_location", label: "お迎え場所", category: "基本設定", hint: "お迎え(搬送元)場所の候補。※現在は設定登録のみ・未参照です。" },
  { type: "target_desired_place", label: "安置希望場所", category: "基本設定", hint: "ご安置の希望場所の候補。※現在は設定登録のみ・未参照です。" },
  { type: "lounge", label: "安置室・ラウンジ", category: "基本設定", hint: "安置室・ラウンジの登録。※現在は設定登録のみ・未参照です。" },
  { type: "car_model", label: "車両", category: "基本設定", hint: "寝台車・霊柩車などの車両登録。※現在は設定登録のみ・未参照です。" },
  { type: "boarding_place", label: "搭乗場所", category: "基本設定", hint: "車両の搭乗(乗車)場所の候補。※現在は設定登録のみ・未参照です。" },
  { type: "purify_manner", label: "清め方法", category: "基本設定", hint: "お清めの方法区分。※現在は設定登録のみ・未参照です。" },
  { type: "purify_place", label: "清め場所", category: "基本設定", hint: "お清めを行う場所の候補。※現在は設定登録のみ・未参照です。" },
  { type: "customer_kind", label: "顧客種別", category: "顧客設定", hint: "顧客の種別区分。※現在は設定登録のみ・顧客フォームからは未参照です。" },
  { type: "inflow", label: "流入経路", category: "顧客設定", hint: "顧客の流入経路。※顧客フォームの『流入経路』は固定リスト(コード内 INFLOWS)を使用しており、このマスタは現在未参照です。" },
  { type: "state", label: "ステータス", category: "顧客設定", hint: "顧客ステータス。※顧客フォームのステータスは固定リスト(CUSTOMER_STATUSES)を使用しており、このマスタは現在未参照です。" },
  { type: "membership", label: "会員種別", category: "顧客設定", hint: "会員制度の種別。※現在は設定登録のみ・未参照です。" },
  { type: "member_benefit", label: "会員特典", category: "顧客設定", hint: "会員特典の登録。※現在は設定登録のみ・未参照です。" },
  { type: "member_status", label: "会員ステータス", category: "顧客設定", hint: "会員のステータス区分。※現在は設定登録のみ・未参照です。" },
  { type: "member_plan", label: "会員プラン", category: "顧客設定", hint: "会員プランの登録。※現在は設定登録のみ・未参照です。" },
  { type: "customer_comment_template", label: "コメントテンプレート", category: "顧客設定", fields: [{ key: "name", label: "タイトル", col: "name" }, { key: "body", label: "本文" }], hint: "顧客コメントの定型文。※現在は設定登録のみ・未参照です。" },
  { type: "customer_comment_tag", label: "コメントタグ", category: "顧客設定", hint: "顧客コメントに付けるタグ。※現在は設定登録のみ・未参照です。" },
  { type: "customer_funeral_target_tag", label: "対象者タグ", category: "顧客設定", hint: "対象者(故人)に付けるタグ。※現在は設定登録のみ・未参照です。" },
  { type: "funeral_target_manager", label: "対象者担当", category: "顧客設定", hint: "対象者の担当者候補。※現在は設定登録のみ・未参照です。" },
  { type: "talk_manual", label: "トークマニュアル", category: "顧客設定", fields: [{ key: "name", label: "表示箇所", col: "name" }, { key: "body", label: "内容" }], hint: "応対トークの台本。※現在は設定登録のみ・未参照です。" },
  { type: "product_kind", label: "商品種別", category: "商品設定", hint: "商品の大分類。商品登録の種別候補・見積もり作成の『種別』絞り込みと並び順・サービス利用料設定で使用します。設定>商品種別のカードをドラッグで並べ替え、非表示設定も可能です。" },
  { type: "product_sub_kind", label: "商品子カテゴリ", category: "商品設定", fields: [{ key: "name", label: "子カテゴリ名", col: "name" }, { key: "parent", label: "親の商品種別", selectFrom: "product_kind" }], hint: "商品の小分類(子カテゴリ)。商品登録の子カテゴリ候補、見積もり作成の商品絞り込みで使用します。親の商品種別に紐づきます。" },
  { type: "discounted_product", label: "値引商品", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "price", label: "値引額", col: "price", kind: "number" }], hint: "見積書・請求書の作成画面『値引商品』欄の選択肢になります。値引額とセットで登録します。" },
  { type: "product_set", label: "商品セット", category: "商品設定", fields: [{ key: "code", label: "セット商品コード" }, { key: "name", label: "セット名", col: "name" }, { key: "price", label: "セット価格(税抜)", col: "price", kind: "number" }], hint: "見積もりで一括投入するセット商品。※実際の登録・並べ替えは『セット商品』画面(/kanri/product-sets)で行い、見積もり作成のセット選択に出ます。この定義自体は設定メニュー用です。" },
  { type: "rough_product", label: "まとめ商品(ざっくり商品)", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "unit", label: "単位" }], hint: "複数の明細を1行にまとめて概算表記するための商品名です。※現在どの見積書・請求書の作成画面からも参照していません（登録しても作成画面には出ません）。" },
  { type: "rough_product_osonae", label: "まとめ商品(お供え)", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "unit", label: "単位" }], hint: "見積もり・請求の作成画面『その他オプション、お供えにかかる費用』欄にここの項目が並びます。数量を入れるとその分が明細に加算されます（追加安置日数・追加ドライアイス・収骨容器・本尊セットは既定で数量1）。" },
  { type: "sale_category", label: "売上区分", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "color", label: "書類カラー" }], hint: "請求書を売上の種類で分類するための区分です。※現在この設定の選択肢・色分けは作成画面では未使用です。請求一覧やCSVに出る『売上区分』は、供花請求などで自動設定される請求書側の値です。" },
  { type: "purchase_category", label: "仕入区分", category: "商品設定", hint: "仕入れの区分。※現在は設定登録のみ・未参照です。" },
  { type: "supplier", label: "発注先", category: "商品設定", fields: [{ key: "name", label: "発注先名", col: "name" }, { key: "tel", label: "電話" }, { key: "email", label: "メール" }], hint: "商品の発注先(仕入先)。商品登録の『発注先』ドロップダウンで使用します(CSV出力あり)。※発注/配送画面の発注先入力は自由入力で、このマスタとは連動しません。" },
  { type: "shipping", label: "送料", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "price", label: "金額", col: "price", kind: "number" }], hint: "送料の登録。※現在は設定登録のみ・未参照です。" },
  { type: "funeral_kind", label: "葬儀種別", category: "葬儀設定", hint: "葬儀の種別(家族葬・一般葬など)。※現在は設定登録のみ・未参照です。" },
  { type: "phase", label: "フェーズ", category: "葬儀設定", hint: "施行の進行フェーズ区分。※現在は設定登録のみ・未参照です。" },
  { type: "my_temple", label: "宗教者", category: "葬儀設定", fields: [{ key: "name", label: "宗教者名", col: "name" }, { key: "religion", label: "宗旨" }, { key: "sect", label: "宗派" }, { key: "tel", label: "電話" }], hint: "寺院・宗教者の登録。※現在は設定登録のみ・未参照です。" },
  { type: "area_for_my_temple", label: "宗教者エリア", category: "葬儀設定", hint: "宗教者の対応エリア。※現在は設定登録のみ・未参照です。" },
  { type: "note_master", label: "備考欄テンプレート", category: "葬儀設定", fields: [{ key: "name", label: "備考欄種別", col: "name" }, { key: "body", label: "備考欄" }], hint: "備考欄の定型文。※現在は設定登録のみ・未参照です。" },
  { type: "order_instruction_template", label: "発注指示テンプレート", category: "葬儀設定", fields: [{ key: "name", label: "タイトル", col: "name" }, { key: "body", label: "内容" }], hint: "発注指示の定型文。※現在は設定登録のみ・未参照です。" },
  { type: "notice_setting_funeral", label: "葬儀の通知設定", category: "葬儀設定", fields: [{ key: "name", label: "通知メッセージ", col: "name" }, { key: "criteria", label: "通知する基準" }], hint: "葬儀に関する通知の条件設定。※現在は設定登録のみ・未参照です。" },
  // ===== 実リボン準拠の追加マスタ =====
  { type: "organization", label: "組織管理", category: "基本設定", hint: "社内の組織・部門の登録。※現在は設定登録のみ・未参照です。" },
  { type: "shared_file", label: "共有ファイル", category: "基本設定", fields: [{ key: "name", label: "ファイル名", col: "name" }, { key: "url", label: "URL" }], hint: "社内共有するファイルのURL登録。※現在は設定登録のみ・未参照です。" },
  { type: "customer_funeral_target_csv_condition", label: "葬家CSVダウンロード条件マスター", category: "顧客設定", hint: "葬家CSVダウンロードの条件保存用。※現在は設定登録のみ・未参照です。" },
  { type: "remark", label: "備考定型文", category: "葬儀設定", fields: [{ key: "name", label: "タイトル", col: "name" }, { key: "body", label: "本文" }], hint: "備考の定型文。※各画面の備考欄は自由入力で、この定型文マスタは現在未参照です。" },
  { type: "estimate_title", label: "件名マスター", category: "請求設定", hint: "見積書・請求書の件名の定型。※作成画面の件名は『対象者名 御葬儀』の自動生成/自由入力で、この定型マスタは現在未参照です。" },
  { type: "purpose", label: "摘要設定", category: "請求設定", fields: [{ key: "name", label: "摘要", col: "name" }], hint: "見積書・請求書の作成画面『摘要 参照』ピッカーの選択肢になります。" },
  { type: "estimate_template", label: "見積書テンプレート", category: "請求設定", fields: [{ key: "name", label: "テンプレート名", col: "name" }, { key: "body", label: "内容" }], hint: "見積書作成画面の『テンプレート参照』の選択肢。件名・本文をまとめて呼び出せます。" },
  { type: "invoice_template", label: "請求書テンプレート", category: "請求設定", fields: [{ key: "name", label: "テンプレート名", col: "name" }, { key: "body", label: "内容" }], hint: "請求書作成画面の『テンプレート参照』の選択肢。件名・本文をまとめて呼び出せます。" },
  { type: "deposit_place", label: "伝票（入金先）", category: "請求設定", hint: "入金伝票の入金先候補。※現在は設定登録のみ・未参照です。" },
  { type: "deposit_category", label: "伝票（入金区分）", category: "請求設定", hint: "入金伝票の区分。※現在は設定登録のみ・未参照です。" },
  { type: "payment_method", label: "入金方法", category: "請求設定", hint: "入金方法の区分。※現在は設定登録のみ・入金登録は自由入力のため未参照です。" },
  { type: "payment_category", label: "入金種別", category: "請求設定", hint: "入金種別の区分。※現在は設定登録のみ・未参照です。" },
  { type: "invoice_additional_content", label: "請求書の補足情報", category: "請求設定", fields: [{ key: "name", label: "タイトル", col: "name" }, { key: "body", label: "内容" }], hint: "請求書に載せる補足文。※現在は設定登録のみ・未参照です。" },
  { type: "proviso", label: "但し書マスター", category: "請求設定", hint: "領収書などの但し書き定型。※現在は設定登録のみ・未参照です。" },
  { type: "time_schedule_master", label: "タイムスケジュール設定", category: "スケジュール設定", hint: "施行当日のタイムスケジュール雛形。※現在は設定登録のみ・未参照です。" },
  { type: "meeting_behavior", label: "イベント行動", category: "スケジュール設定", hint: "打合せ等のイベント行動区分。※現在は設定登録のみ・未参照です。" },
  { type: "meeting_kind", label: "イベント分類", category: "スケジュール設定", hint: "打合せ等のイベント分類。※現在は設定登録のみ・未参照です。" },
  { type: "emergency_contact", label: "緊急連絡先", category: "スケジュール設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "tel", label: "電話番号" }], hint: "緊急連絡先の登録。※現在は設定登録のみ・未参照です。" },
  { type: "sms_template", label: "SMS配信テンプレート", category: "SMS設定", fields: [{ key: "name", label: "タイトル", col: "name" }, { key: "body", label: "本文" }], hint: "SMSの定型文。※SMS配信機能は未実装のため現在未参照です。" },
  { type: "sms_auto_sent", label: "SMS自動配信設定", category: "SMS設定", fields: [{ key: "name", label: "設定名", col: "name" }, { key: "criteria", label: "配信条件" }], hint: "SMS自動配信の条件。※SMS配信機能は未実装のため現在未参照です。" },
  { type: "after_sale_item", label: "ｱﾌﾀｰｾｰﾙｽ項目", category: "アフターセールス設定", hint: "アフターフォローの項目。※現在は設定登録のみ・未参照です。" },
  { type: "after_sale_action", label: "ｱﾌﾀｰｾｰﾙｽ用ステータス", category: "アフターセールス設定", hint: "アフターフォローのステータス。※現在は設定登録のみ・未参照です。" },
  { type: "after_sale_item_action", label: "ｱﾌﾀｰｾｰﾙｽ用ステータス設定", category: "アフターセールス設定", hint: "アフター項目×ステータスの組合せ設定。※現在は設定登録のみ・未参照です。" },
  { type: "partner", label: "提携先", category: "その他設定", fields: [{ key: "name", label: "提携先名", col: "name" }, { key: "tel", label: "電話" }, { key: "email", label: "メール" }], hint: "提携先の登録。※現在は設定登録のみ・未参照です。" },
  { type: "bland", label: "ブランド", category: "その他設定", hint: "自社ブランドの登録。※現在は設定登録のみ・未参照です。" },
];

export const MASTER_CATEGORIES = ["基本設定", "顧客設定", "商品設定", "葬儀設定", "請求設定", "スケジュール設定", "SMS設定", "アフターセールス設定", "その他設定"];

export function masterDef(type: string): MasterDef | undefined { return MASTER_TYPES.find((m) => m.type === type); }
export function masterLabel(type: string): string { return masterDef(type)?.label ?? type; }
export function masterFields(type: string): FieldDef[] { return masterDef(type)?.fields ?? NAME_ONLY; }
export function fieldValue(item: MasterItem, f: FieldDef): string {
  if (f.col === "name") return item.name ?? "";
  if (f.col === "kana") return item.kana ?? "";
  if (f.col === "price") return item.price != null ? String(item.price) : "";
  return item.extra?.[f.key] ?? "";
}

export const COMPANY_FIELDS: FieldDef[] = [
  { key: "company_name", label: "葬儀会社名" },
  { key: "invoice_no", label: "インボイス登録番号" },
  { key: "url", label: "会社URL" },
  { key: "tel", label: "電話番号" },
  { key: "fax", label: "FAX番号" },
  { key: "postcode", label: "郵便番号" },
  { key: "prefecture", label: "都道府県" },
  { key: "address_city", label: "市区町村" },
  { key: "address_street", label: "番地" },
  { key: "address_building", label: "建物名など" },
  { key: "bank_name", label: "銀行名" },
  { key: "bank_branch", label: "支店名" },
  { key: "bank_account_name", label: "口座名義" },
  { key: "bank_account_no", label: "口座番号" },
  { key: "bank_account_type", label: "口座種別" },
];
