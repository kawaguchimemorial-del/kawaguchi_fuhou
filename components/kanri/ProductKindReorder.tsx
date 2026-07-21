"use client";
import { useEffect, useRef, useState } from "react";
import { updateMasterItem, deleteMasterItem, reorderMasterItems } from "@/lib/kanri/actions";

type Item = { id: string; name: string };

// 商品種別をドラッグ&ドロップで並べ替える。ドロップした位置の順番が自動で保存される（番号入力は不要）。
export function ProductKindReorder({ type, items }: { type: string; items: Item[] }) {
  const [list, setList] = useState<Item[]>(items);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dragId = useRef<string | null>(null);

  // 名称変更・削除・並び替え後、サーバーから来た最新の内容に同期する。
  const sig = items.map((i) => i.id + ":" + i.name).join("|");
  useEffect(() => { setList(items); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sig]);

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
    setList(arr);                 // 楽観的に並べ替え
    setSaving(true);
    reorderMasterItems(type, arr.map((x) => x.id)).finally(() => setSaving(false));
  }

  return (
    <div className="rounded-lg bg-white p-2 shadow-sm">
      <p className="px-2 py-1 text-xs text-gray-400">カードをドラッグして並べ替えると、その順番が自動で保存されます。{saving && <span className="ml-2 text-[#1aa39a]">保存中…</span>}</p>
      <ul className="divide-y">
        {list.map((it, i) => (
          <li
            key={it.id}
            draggable
            onDragStart={() => { dragId.current = it.id; }}
            onDragEnd={() => { dragId.current = null; setOverId(null); }}
            onDragOver={(e) => { e.preventDefault(); if (overId !== it.id) setOverId(it.id); }}
            onDrop={() => handleDrop(it.id)}
            className={`flex items-center gap-2 px-2 py-2 ${overId === it.id ? "bg-teal-50" : "bg-white"}`}
          >
            <span className="w-6 shrink-0 cursor-grab select-none text-center text-gray-400" title="ドラッグして並べ替え">⠿</span>
            <span className="w-6 shrink-0 text-right text-xs tabular-nums text-gray-400">{i + 1}</span>
            <form action={updateMasterItem} className="flex flex-1 items-center gap-2">
              <input type="hidden" name="id" value={it.id} />
              <input type="hidden" name="master_type" value={type} />
              <input name="f_name" defaultValue={it.name} required className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-[#1aa39a] focus:outline-none" />
              <button className="rounded bg-[#1aa39a] px-3 py-1 text-xs text-white hover:opacity-90">更新</button>
            </form>
            <form action={deleteMasterItem} className="shrink-0">
              <input type="hidden" name="id" value={it.id} />
              <input type="hidden" name="master_type" value={type} />
              <button className="px-2 text-xs text-red-500 hover:underline">削除</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
