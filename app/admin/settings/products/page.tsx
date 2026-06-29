import Link from "next/link";
import { listProducts } from "@/lib/admin/product-actions";
import { ProductSettings } from "@/components/admin/ProductSettings";

export const dynamic = "force-dynamic";

export default async function ProductsSettings() {
  const [flowers, offerings] = await Promise.all([listProducts("供花"), listProducts("供物")]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/settings" className="mb-4 inline-block text-sm text-[#9b2fae] underline">← 設定へ戻る</Link>
      <h1 className="mb-6 text-xl font-bold">設定 供花・供物</h1>
      <ProductSettings flowers={flowers} offerings={offerings} />
      <div className="mt-6">
        <Link href="/admin/settings" className="inline-block rounded border px-6 py-2.5 text-sm">戻る</Link>
      </div>
    </div>
  );
}
