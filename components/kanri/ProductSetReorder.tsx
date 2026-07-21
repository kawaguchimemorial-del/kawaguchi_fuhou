"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deleteProductSet, reorderProductSets } from "@/lib/kanri/actions";
import { SetHiddenToggle } from "./SetHiddenToggle";

type SetRow = { id: string; code?: string; name: string; price: number; taxIncludedPrice: number; tax: number; hidden: boolean };

// セット商品をドラッグ&ドロップで並べ替える。ドロップ位置の順番が自動保存され、見積もりのセット選択にもこの順で出る。
export function ProductSetReorder({ sets }: { sets: SetRow[] }) {
  const [list, setList] = useState<SetRow[]>(sets);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dragId = useRef<string | null>(null);

  const sig = sets.map((s) => s.id + ":" + s.name + ":" + (s.hidden ? 1 : 0)).join("|");
  useEffect(() => { setList(sets); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sig]);

  function handleDrop(targetId: string) {
    const from = dragId.current;
    dragId.current = null;
    setOverId(null);
    if (!from || from === targetId) return;
    const arr = [...list];
    const fi = arr.findIndex((x) => x.id === from);
    const ti = arr.findIndex((x) => x.id === targetId);
    if (fi < 0 || ti < 0) return;
    const [moved] = arr.splice(fi, 1);
    arr.splice(ti, 0, moved);
    setList(arr);
    setSaving(true);
    reorderProductSets(arr.map((x) => x.id)).finally(() => setSaving(false));
  }

  return (
    <div className="rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-bold">一覧　<span className="font-normal text-gray-500">{list.length} 件</span></p>
        <p className="text-xs text-gray-400">カードをドラッグして並べ替え{saving && <span className="ml-2 text-[#1aa39a]">保存中…</span>}</p>
      </div>
      <ul className="divide-y">
        {list.map((st, i) => (
          <li
            key={st.id}
            draggable
            onDragStart={() => { dragId.current = st.id; }}
            onDragEnd={() => { dragId.current = null; setOverId(null); }}
            onDragOver={(e) => { e.preventDefault(); if (overId !== st.id) setOverId(st.id); }}
            onDrop={() => handleDrop(st.id)}
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 ${overId === st.id ? "bg-teal-50" : st.hidden ? "bg-gray-50" : "bg-white"}`}
          >
            <span className="w-6 shrink-0 cursor-grab select-none text-center text-gray-400" title="ドラッグして並べ替え">⠿</span>
            <span className="w-7 shrink-0 text-right text-xs tabular-nums text-gray-400">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`truncate font-medium ${st.hidden ? "text-gray-400" : ""}`}>{st.name}</span>
                {st.hidden && <span className="shrink-0 text-[11px] text-red-500">非表示</span>}
              </div>
              <div className="text-xs text-gray-400">{st.code ?? "—"}</div>
            </div>
            <div className="shrink-0 whitespace-nowrap text-right text-sm">
              <span className="tabular-nums">{st.price.toLocaleString()}円</span>
              <span className="ml-1 text-xs text-gray-400">/ 税込 {st.taxIncludedPrice.toLocaleString()}円・{Math.round(st.tax * 100)}%</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link href={`/kanri/product-sets/${st.id}/edit`} className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">編集</Link>
              <form action={deleteProductSet}><input type="hidden" name="id" value={st.id} /><button className="rounded border border-red-400 px-2 py-1 text-[11px] text-red-500">削除</button></form>
              <SetHiddenToggle id={st.id} hidden={st.hidden} />
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="px-4 py-10 text-center text-gray-400">セット商品がありません。</p>}
    </div>
  );
}
