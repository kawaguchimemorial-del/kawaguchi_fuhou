import { KanriStub } from "@/components/kanri/Stub";
export const metadata = { title: "設定" };
export default function Page() {
  return <KanriStub title="設定（マスタ）" items={["会社情報","会場","斎場・火葬場","発行会社","顧客種別","流入経路","会員種別","宗教者","商品種別","商品","値引商品","商品セット","まとめ商品","発注先","送料","備考定型文","ユーザー管理"]} note="各種マスタ設定（Phase2で実装）。" />;
}
