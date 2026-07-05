// マスタ定義（クライアント/サーバー共用。DB非依存・server-onlyにしない）
export interface FieldDef { key: string; label: string; kind?: "text" | "number"; col?: "name" | "kana" | "price" }
export interface MasterDef { type: string; label: string; category: string; fields?: FieldDef[] }
export interface MasterItem { id: string; name: string; kana?: string; price?: number; extra: Record<string, string>; sortOrder: number; isActive: boolean }

const NAME_ONLY: FieldDef[] = [{ key: "name", label: "名称", col: "name" }];

export const MASTER_TYPES: MasterDef[] = [
  { type: "venue", label: "会場", category: "基本設定", fields: [{ key: "name", label: "会場名", col: "name" }, { key: "address", label: "住所" }, { key: "tel", label: "電話" }] },
  { type: "crematorium", label: "斎場・火葬場", category: "基本設定" },
  { type: "org_company", label: "発行会社", category: "基本設定", fields: [{ key: "name", label: "タイトル", col: "name" }, { key: "company_name", label: "会社名" }, { key: "address", label: "住所" }, { key: "tel", label: "電話" }, { key: "invoice_no", label: "インボイス登録番号" }] },
  { type: "area", label: "エリア", category: "基本設定" },
  { type: "chartered_organization", label: "計上組織", category: "基本設定" },
  { type: "transport_destination", label: "搬送先", category: "基本設定" },
  { type: "pick_up_location", label: "お迎え場所", category: "基本設定" },
  { type: "target_desired_place", label: "安置希望場所", category: "基本設定" },
  { type: "lounge", label: "安置室・ラウンジ", category: "基本設定" },
  { type: "car_model", label: "車両", category: "基本設定" },
  { type: "boarding_place", label: "搭乗場所", category: "基本設定" },
  { type: "purify_manner", label: "清め方法", category: "基本設定" },
  { type: "purify_place", label: "清め場所", category: "基本設定" },
  { type: "customer_kind", label: "顧客種別", category: "顧客設定" },
  { type: "inflow", label: "流入経路", category: "顧客設定" },
  { type: "state", label: "ステータス", category: "顧客設定" },
  { type: "membership", label: "会員種別", category: "顧客設定" },
  { type: "member_benefit", label: "会員特典", category: "顧客設定" },
  { type: "member_status", label: "会員ステータス", category: "顧客設定" },
  { type: "member_plan", label: "会員プラン", category: "顧客設定" },
  { type: "customer_comment_template", label: "コメントテンプレート", category: "顧客設定", fields: [{ key: "name", label: "タイトル", col: "name" }, { key: "body", label: "本文" }] },
  { type: "customer_comment_tag", label: "コメントタグ", category: "顧客設定" },
  { type: "customer_funeral_target_tag", label: "対象者タグ", category: "顧客設定" },
  { type: "funeral_target_manager", label: "対象者担当", category: "顧客設定" },
  { type: "talk_manual", label: "トークマニュアル", category: "顧客設定", fields: [{ key: "name", label: "表示箇所", col: "name" }, { key: "body", label: "内容" }] },
  { type: "product_kind", label: "商品種別", category: "商品設定" },
  { type: "discounted_product", label: "値引商品", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "price", label: "値引額", col: "price", kind: "number" }] },
  { type: "product_set", label: "商品セット", category: "商品設定", fields: [{ key: "code", label: "セット商品コード" }, { key: "name", label: "セット名", col: "name" }, { key: "price", label: "セット価格(税抜)", col: "price", kind: "number" }] },
  { type: "rough_product", label: "まとめ商品(ざっくり商品)", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "unit", label: "単位" }] },
  { type: "rough_product_osonae", label: "まとめ商品(お供え)", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "unit", label: "単位" }] },
  { type: "sale_category", label: "売上区分", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "color", label: "書類カラー" }] },
  { type: "purchase_category", label: "仕入区分", category: "商品設定" },
  { type: "supplier", label: "発注先", category: "商品設定", fields: [{ key: "name", label: "発注先名", col: "name" }, { key: "tel", label: "電話" }, { key: "email", label: "メール" }] },
  { type: "shipping", label: "送料", category: "商品設定", fields: [{ key: "name", label: "名称", col: "name" }, { key: "price", label: "金額", col: "price", kind: "number" }] },
  { type: "funeral_kind", label: "葬儀種別", category: "葬儀設定" },
  { type: "phase", label: "フェーズ", category: "葬儀設定" },
  { type: "my_temple", label: "宗教者", category: "葬儀設定", fields: [{ key: "name", label: "宗教者名", col: "name" }, { key: "religion", label: "宗旨" }, { key: "sect", label: "宗派" }, { key: "tel", label: "電話" }] },
  { type: "area_for_my_temple", label: "宗教者エリア", category: "葬儀設定" },
  { type: "memorial_service", label: "法要", category: "葬儀設定" },
  { type: "note_master", label: "備考定型文", category: "葬儀設定", fields: [{ key: "name", label: "備考欄種別", col: "name" }, { key: "body", label: "備考欄" }] },
  { type: "order_instruction_template", label: "発注指示テンプレート", category: "葬儀設定", fields: [{ key: "name", label: "タイトル", col: "name" }, { key: "body", label: "内容" }] },
  { type: "notice_setting_funeral", label: "通知設定", category: "葬儀設定", fields: [{ key: "name", label: "通知メッセージ", col: "name" }, { key: "criteria", label: "通知する基準" }] },
];

export const MASTER_CATEGORIES = ["基本設定", "顧客設定", "商品設定", "葬儀設定"];

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
