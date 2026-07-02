"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveProduct,
  deleteProduct,
  uploadProductImage,
  type Product,
} from "@/lib/admin/product-actions";

// 設定 供花・供物（実画面準拠）。商品グリッド＋画像アップロード＋支払い方法設定。
export function ProductSettings({ flowers, offerings }: { flowers: Product[]; offerings: Product[] }) {
  const [orderMode, setOrderMode] = useState("form"); // form | external
  const [editing, setEditing] = useState<{ type: "供花" | "供物"; product?: Product } | null>(null);

  return (
    <div className="space-y-6">
      {/* 注文方法 */}
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm text-gray-600">供花・供物の注文に何を使いますか？</p>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="om" checked={orderMode === "form"} onChange={() => setOrderMode("form")} /> 注文フォームを利用</label>
          <label className="flex items-center gap-2"><input type="radio" name="om" checked={orderMode === "external"} onChange={() => setOrderMode("external")} /> 外部注文システムを利用（指定のURLに飛ばす）</label>
        </div>
        {orderMode === "external" && (
          <input placeholder="https://..." className="mt-3 w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" />
        )}
      </div>

      {/* 供花 */}
      <ProductGroup title="供花" type="供花" items={flowers} onAdd={() => setEditing({ type: "供花" })} onEdit={(p) => setEditing({ type: "供花", product: p })} />
      {/* 供物 */}
      <ProductGroup title="供物" type="供物" items={offerings} onAdd={() => setEditing({ type: "供物" })} onEdit={(p) => setEditing({ type: "供物", product: p })} />

      {/* 支払い方法／注文設定 */}
      <PaymentSettings />

      {editing && (
        <ProductModal type={editing.type} product={editing.product} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function ProductGroup({
  title, type, items, onAdd, onEdit,
}: {
  title: string; type: "供花" | "供物"; items: Product[];
  onAdd: () => void; onEdit: (p: Product) => void;
}) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-bold">{title}</h2>
        <button onClick={onAdd} className="rounded bg-[#9b2fae] px-4 py-1.5 text-sm text-white">{title}を追加</button>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">商品が登録されていません。「{title}を追加」から登録してください。</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <button key={p.id} onClick={() => onEdit(p)} className="overflow-hidden rounded border text-left hover:border-[#9b2fae]">
              <div className="relative aspect-square bg-gray-100">
                {p.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagePath} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">画像なし</div>
                )}
                <span className="absolute left-0 top-0 bg-[#9b2fae]/80 px-2 py-0.5 text-xs text-white">{p.name.includes("洋花") ? "洋花" : type}</span>
                {p.size && <span className="absolute bottom-0 right-0 bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{p.size}</span>}
              </div>
              <div className="p-2">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-sm">{p.priceJpy.toLocaleString()}円<span className="text-xs">（税込）</span></p>
                {p.description && <p className="truncate text-xs text-gray-500">{p.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductModal({ type, product, onClose }: { type: "供花" | "供物"; product?: Product; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.priceJpy ?? ""));
  const [desc, setDesc] = useState(product?.description ?? "");
  const [size, setSize] = useState(product?.size ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imagePath ?? "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr(null);
    const fd = new FormData(); fd.append("file", file);
    const res = await uploadProductImage(fd);
    setUploading(false);
    if (res.ok && res.url) setImageUrl(res.url);
    else setErr(res.error ?? "アップロード失敗");
  }

  function save() {
    setErr(null);
    startSave(async () => {
      const res = await saveProduct({ id: product?.id, type, name, priceJpy: Number(price) || 0, description: desc, size, imagePath: imageUrl });
      if (res.ok) { onClose(); router.refresh(); }
      else setErr(res.error ?? "保存失敗");
    });
  }
  function remove() {
    if (!product?.id) return;
    startSave(async () => {
      await deleteProduct(product.id);
      onClose(); router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-bold">{product ? `${type}を編集` : `${type}を追加`}</h3>

        {/* 画像アップロード */}
        <div className="mb-4">
          <p className="mb-1 text-sm text-gray-600">商品画像</p>
          <div className="flex items-center gap-4">
            <div className="h-28 w-28 overflow-hidden rounded border bg-gray-100">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-400">画像なし</div>
              )}
            </div>
            <label className="cursor-pointer rounded border border-[#9b2fae] px-4 py-2 text-sm text-[#9b2fae]">
              {uploading ? "アップロード中…" : "画像をアップロード"}
              <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={uploading} />
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-400">JPG/PNG・5MBまで。※写真はイメージになります。</p>
        </div>

        <Field label="商品名" value={name} onChange={setName} />
        <Field label="金額（税込・円）" value={price} onChange={setPrice} type="number" />
        <Field label="サイズ（例：H75 W70）" value={size} onChange={setSize} />
        <label className="mb-4 block">
          <span className="text-sm text-gray-600">商品説明</span>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="mt-1 w-full rounded border p-2 focus:border-[#9b2fae] focus:outline-none" />
        </label>

        {err && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        <div className="flex items-center justify-between">
          <div>
            {product && <button onClick={remove} disabled={saving} className="rounded border border-red-300 px-4 py-2 text-sm text-red-600">削除</button>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded border px-4 py-2 text-sm">キャンセル</button>
            <button onClick={save} disabled={saving || uploading} className="rounded bg-[#9b2fae] px-5 py-2 text-sm text-white disabled:opacity-60">{saving ? "保存中…" : "保存"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="mb-4 block">
      <span className="text-sm text-gray-600">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" />
    </label>
  );
}

// 支払い方法／注文設定（実画面準拠の静的UI・保存は今後）
function PaymentSettings() {
  const methods = ["オンラインカード決済", "銀行振込", "請求書払い", "現地払い", "その他支払い方法"];
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-bold">支払い方法／注文設定</h2>
      <p className="mb-4 text-xs text-gray-500">
        各支払い方法で、注文詳細から請求書/領収書のダウンロードや控えの確認・再発行が行えます。
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-[560px] text-center text-xs">
          <thead>
            <tr className="text-gray-600">
              <th className="px-2 py-2"></th>
              <th className="bg-pink-50 px-2 py-2" colSpan={2}>請求書</th>
              <th className="bg-green-50 px-2 py-2" colSpan={2}>領収書</th>
            </tr>
            <tr className="text-[10px] text-gray-500">
              <th></th><th className="px-2 py-1">注文詳細から出力</th><th className="px-2 py-1">メールで自動送付</th>
              <th className="px-2 py-1">注文詳細から出力</th><th className="px-2 py-1">メールで自動送付</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((mth) => (
              <tr key={mth} className="border-t">
                <td className="px-2 py-2 text-left text-gray-700">{mth}</td>
                {[0, 1, 2, 3].map((c) => <td key={c} className="px-2 py-2"><input type="radio" name={`${mth}-${c}`} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 各支払い方法の受付設定（代表例） */}
      <div className="mt-5 space-y-4">
        <MethodCard title="オンラインカード決済" note="利用可能ブランド：VISA / MASTER / American Express / Diners / Discover" />
        <MethodCard title="銀行振り込み" />
        <MethodCard title="請求書払い" />
        <MethodCard title="現地払い" simple />
      </div>

      <label className="mt-5 flex items-center gap-2 text-sm">
        <input type="checkbox" defaultChecked /> 札名の旧字体使用有無チェックボックスを表示する
      </label>

      <div className="mt-5">
        <button className="rounded bg-[#9b2fae] px-8 py-2.5 text-sm text-white">保存（準備中）</button>
      </div>
    </div>
  );
}

function MethodCard({ title, note, simple }: { title: string; note?: string; simple?: boolean }) {
  return (
    <fieldset className="rounded border p-4">
      <legend className="px-1 text-sm text-gray-600">{title}</legend>
      {note && <p className="mb-2 text-xs text-gray-500">{note}</p>}
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="radio" name={`accept-${title}`} defaultChecked /> 受け付けない</label>
        <label className="flex items-center gap-1"><input type="radio" name={`accept-${title}`} /> 受け付ける</label>
      </div>
      {!simple && (
        <div className="mt-2 space-y-1 text-sm text-gray-600">
          <label className="flex items-center gap-2"><input type="checkbox" /> 注文受付メールからお客様自身で請求書をダウンロードできるようにする</label>
          <label className="flex items-center gap-2"><input type="checkbox" /> 売上計上メールからお客様自身で領収書をダウンロードできるようにする</label>
        </div>
      )}
    </fieldset>
  );
}
