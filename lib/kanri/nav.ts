// CRM サイドバー(リボン)の構成。スマート葬儀の実画面(トップ リボン展開状態)に準拠。
export interface NavNode { label: string; href?: string; children?: NavNode[]; icon?: string }

export const CRM_NAV: NavNode[] = [
  { label: "顧客管理", icon: "Users", children: [{ label: "顧客", href: "/kanri/customers" }] },
  { label: "請求管理", icon: "Receipt", children: [
    { label: "見積もり", href: "/kanri/estimates" },
    { label: "請求書", href: "/kanri/billing" },
    { label: "入金管理", href: "/kanri/deposits" },
    { label: "領収書", href: "/kanri/receipts" },
    { label: "売掛残高", href: "/kanri/receivables" },
  ] },
  { label: "発注管理", icon: "ShoppingCart", children: [
    { label: "発注", href: "/kanri/orders" },
    { label: "納品管理", href: "/kanri/deliveries" },
    { label: "買掛残高", href: "/kanri/payables" },
  ] },
  { label: "スケジュール管理", icon: "CalendarDays", children: [
    { label: "直近予定", href: "/kanri/schedule" },
    { label: "カレンダー", href: "/kanri/schedule/calendar" },
    { label: "イベント", href: "/kanri/schedule/events" },
    { label: "当番表", href: "/kanri/schedule/rota" },
  ] },
  { label: "AI遺影写真", icon: "ImageIcon", href: "/kanri/ai-portrait" },
  { label: "分析", icon: "LineChart", children: [
    { label: "売上実績", href: "/kanri/analytics" },
    { label: "売上分析", href: "/kanri/analytics/sales" },
    { label: "EC売上", href: "/kanri/analytics/ec" },
    { label: "発注分析", href: "/kanri/analytics/orders" },
  ] },
  { label: "SMS", icon: "Send", children: [{ label: "送信", href: "/kanri/sms" }] },
  { label: "設定", icon: "Settings", children: [
    { label: "基本", children: [
      { label: "ユーザー管理", href: "/kanri/settings/users" },
      { label: "会社情報", href: "/kanri/settings/company" },
      { label: "会場", href: "/kanri/settings/venue" },
      { label: "斎場・火葬場", href: "/kanri/settings/crematorium" },
      { label: "発行会社", href: "/kanri/settings/org_company" },
      { label: "エリア", href: "/kanri/settings/area" },
      { label: "計上組織", href: "/kanri/settings/chartered_organization" },
    ] },
    { label: "顧客", children: [
      { label: "顧客種別", href: "/kanri/settings/customer_kind" },
      { label: "流入経路", href: "/kanri/settings/inflow" },
      { label: "ステータス", href: "/kanri/settings/state" },
      { label: "会員種別", href: "/kanri/settings/membership" },
      { label: "宗教者", href: "/kanri/settings/my_temple" },
    ] },
    { label: "商品", children: [
      { label: "商品", href: "/kanri/products" },
      { label: "商品種別", href: "/kanri/settings/product_kind" },
      { label: "値引商品", href: "/kanri/settings/discounted_product" },
      { label: "商品セット", href: "/kanri/settings/product_set" },
      { label: "まとめ商品", href: "/kanri/settings/rough_product" },
      { label: "売上区分", href: "/kanri/settings/sale_category" },
      { label: "仕入区分", href: "/kanri/settings/purchase_category" },
      { label: "発注先", href: "/kanri/settings/supplier" },
      { label: "送料", href: "/kanri/settings/shipping" },
    ] },
    { label: "請求", children: [
      { label: "備考定型文", href: "/kanri/settings/note_master" },
    ] },
    { label: "スケジュール", children: [
      { label: "葬儀種別", href: "/kanri/settings/funeral_kind" },
      { label: "フェーズ", href: "/kanri/settings/phase" },
      { label: "法要", href: "/kanri/settings/memorial_service" },
    ] },
    { label: "アフターセールス", children: [
      { label: "通知設定", href: "/kanri/settings/notice_setting_funeral" },
    ] },
  ] },
];
