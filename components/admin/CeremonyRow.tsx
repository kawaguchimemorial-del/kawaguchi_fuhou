"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { CeremonyListItem } from "@/lib/admin/data";
import { deleteCeremony } from "@/lib/admin/actions";

// 葬儀一覧の行。行全体をクリックすると葬儀詳細（編集）へ遷移する（アット葬儀の実仕様に準拠）。
export function CeremonyRow({ r }: { r: CeremonyListItem }) {
  const router = useRouter();
  const href = `/fuhou/ceremonies/${r.id}`;
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // 行クリック遷移を止めた上で確認 → soft-delete。
  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const who = [r.deceasedName, r.mournerName].filter(Boolean).join(" / ") || "この葬儀";
    if (!window.confirm(`「${who}」の訃報案内を削除します。よろしいですか？\n（一覧から消え、公開ページも開けなくなります）`)) return;
    setErr(null);
    start(async () => {
      const res = await deleteCeremony(r.id);
      if (res.ok) router.refresh();
      else setErr(res.error ?? "削除に失敗しました");
    });
  };
  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer align-top hover:bg-[#faf5fc]"
    >
      <td className="px-3 py-4">
        <span className="inline-block rounded bg-[#f3e9f6] px-2 py-0.5 text-xs text-[#9b2fae]">{r.type}</span>
        {r.isTest && (
          <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">テスト</span>
        )}
      </td>
      <td className="px-3 py-4">{r.customerName ?? "—"}</td>
      <td className="px-3 py-4 font-medium text-[#9b2fae]">{r.mournerName}</td>
      <td className="px-3 py-4">{r.deceasedName}</td>
      <td className="px-3 py-4">{r.event1.name}<br /><span className="text-xs text-gray-500">{r.event1.date}</span></td>
      <td className="px-3 py-4">{r.event2 ? <>{r.event2.name}<br /><span className="text-xs text-gray-500">{r.event2.date}</span></> : "-"}</td>
      <td className="px-3 py-4 text-xs">{r.publishFrom}<br />〜 {r.publishUntil}</td>
      <td className="px-3 py-4 text-xs">
        供花：{r.flowerDeadline ?? "-"}<br />
        供物：{r.offeringDeadline ?? "-"}
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">{r.status}</span>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            title="この葬儀を削除"
            aria-label="この葬儀を削除"
            className="flex h-8 w-8 items-center justify-center rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
        {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
      </td>
    </tr>
  );
}
