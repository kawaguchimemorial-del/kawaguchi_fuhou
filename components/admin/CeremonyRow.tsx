"use client";

import { useRouter } from "next/navigation";
import type { CeremonyListItem } from "@/lib/admin/data";

// 葬儀一覧の行。行全体をクリックすると葬儀詳細（編集）へ遷移する（アット葬儀の実仕様に準拠）。
export function CeremonyRow({ r }: { r: CeremonyListItem }) {
  const router = useRouter();
  const href = `/admin/ceremonies/${r.id}`;
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
        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">{r.status}</span>
      </td>
    </tr>
  );
}
