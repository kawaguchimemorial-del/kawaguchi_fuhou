// 供花・供物の商品マスタ（暫定）。
// TODO(supabase): offering_products テーブル（葬儀社ごとに登録）へ移行。画像は最後に差し込み。

export interface OfferingProduct {
  id: string;
  name: string;
  description: string;
  priceJpy: number; // 税込・整数円
  type: "供花" | "供物";
  imagePath?: string; // 後で差し込み
}

export const OFFERING_PRODUCTS: OfferingProduct[] = [
  {
    id: "kanchu-bana",
    name: "棺中花",
    description: "棺の中に入れるお花になります",
    priceJpy: 22000,
    type: "供花",
  },
  {
    id: "kumibana-1",
    name: "供花 一基",
    description: "式場にお飾りするスタンド花（一基）",
    priceJpy: 16500,
    type: "供花",
  },
  {
    id: "kumibana-pair",
    name: "供花 一対",
    description: "式場にお飾りするスタンド花（一対）",
    priceJpy: 33000,
    type: "供花",
  },
];
