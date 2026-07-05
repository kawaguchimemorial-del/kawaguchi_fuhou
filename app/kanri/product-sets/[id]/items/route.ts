import { getProductSet } from "@/lib/kanri/products";

export const dynamic = "force-dynamic";

// セット商品の内訳（見積/請求追加のセット選択時に展開表示する）
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const set = await getProductSet(id);
  if (!set) return Response.json({ items: [] });
  return Response.json({
    items: (set.items ?? []).map((it) => ({
      productId: it.productId ?? null,
      name: it.productName ?? `商品ID:${it.productSourceId ?? "?"}`,
      quantity: it.quantity,
      hideOnInvoice: it.hideOnInvoice,
    })),
  });
}
