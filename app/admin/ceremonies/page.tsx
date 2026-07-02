import Link from "next/link";
import { listCeremonies } from "@/lib/admin/data";
import { CeremonyRow } from "@/components/admin/CeremonyRow";

// 作成直後の案件を常に反映するため動的レンダリング
export const dynamic = "force-dynamic";

export default async function CeremoniesPage() {
  const rows = await listCeremonies();
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">葬儀一覧</h1>
        <Link
          href="/admin/ceremonies/new?type=obituary_venue"
          className="rounded-md bg-[#9b2fae] px-4 py-2 text-sm text-white"
        >
          ＋ 新しい葬儀を作成する
        </Link>
      </div>

      {/* 検索バー（UIのみ・TODO: フィルタ実装） */}
      <div className="mb-4 flex flex-wrap gap-3 rounded-lg bg-white p-4 text-sm shadow-sm">
        <input placeholder="喪主氏名（漢字 or カナ）" className="rounded border px-3 py-2" />
        <select className="rounded border px-3 py-2">
          <option>ステータス</option>
          <option>公開中</option>
          <option>下書き</option>
          <option>終了</option>
        </select>
        <label className="flex items-center gap-1"><input type="radio" name="t" defaultChecked /> 全て表示</label>
        <label className="flex items-center gap-1"><input type="radio" name="t" /> 本番のみ</label>
        <label className="flex items-center gap-1"><input type="radio" name="t" /> テストのみ</label>
        <button className="rounded bg-gray-700 px-4 py-2 text-white">検索</button>
      </div>

      {/* 一覧テーブル */}
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>
              {["", "喪主名", "故人名", "式1", "式2", "オンライン会場公開期間", "注文受付終了", "ステータス"].map((h, i) => (
                <th key={i} className="px-3 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <CeremonyRow key={r.id} r={r} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
