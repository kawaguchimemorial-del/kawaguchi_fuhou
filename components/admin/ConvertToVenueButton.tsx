"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertToVenue } from "@/lib/admin/actions";

// 訃報のみ → 訃報+式場 へ変換。変換後はオンライン式場ステップの編集画面へ。
export function ConvertToVenueButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="mb-6 rounded border border-[#9b2fae] bg-[#faf5fc] px-4 py-3 text-sm">
      <p className="mb-2 text-gray-700">この訃報は「訃報のみ」です。オンライン式場（祭壇・挨拶・供物受付など）も開設する場合は変換できます。</p>
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm("この訃報を「訃報＋オンライン式場」に変更します。よろしいですか？")) return;
          start(async () => {
            const r = await convertToVenue(slug);
            if (r.ok) router.push(`/fuhou/ceremonies/${slug}/edit?step=4`);
            else alert(`変換に失敗しました：${r.error ?? ""}`);
          });
        }}
        className="rounded bg-[#9b2fae] px-4 py-2 text-white disabled:opacity-60"
      >
        {pending ? "変換中…" : "▶ 訃報＋オンライン式場に変更する"}
      </button>
    </div>
  );
}
