import { PageHeader } from "@/components/kanri/PageHeader";
import { ProductImport } from "@/components/kanri/ProductImport";
export const metadata = { title: "商品一括登録" };
export default function Page(){
  return (<div className="mx-auto max-w-4xl space-y-4"><PageHeader title="商品一括登録（CSV）" action={{ label: "一覧へ", href: "/kanri/products" }} /><ProductImport /></div>);
}
