import Link from "next/link";
import { listEstimates, deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";
export const metadata = { title: "見積管理" };
export const dynamic = "force-dynamic";
function fmt(iso?: string){ if(!iso) return ""; const d=new Date(iso); if(isNaN(d.getTime()))return ""; return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`; }
export default async function EstimatesPage(){
  const rows = await listEstimates();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">見積管理</h1>
        <Link href="/kanri/estimates/new" className="rounded bg-[#9b2fae] px-4 py-2 text-sm text-white">＋ 見積作成</Link>
      </div>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["件名","故人","喪主","合計(税込)","見積日","訃報連携",""].map(h=><th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {rows.length===0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">見積がありません。</td></tr> :
              rows.map(e=>(
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2"><Link href={`/kanri/estimates/${e.id}`} className="font-medium text-[#9b2fae] underline">{e.title || "（無題）"}</Link></td>
                  <td className="px-3 py-2">{deceasedFullName(e) || "—"}</td>
                  <td className="px-3 py-2">{mournerFullName(e) || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{e.total.toLocaleString()}円</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(e.estimateOn)}</td>
                  <td className="px-3 py-2">{e.memorialId ? <span className="text-green-600 text-xs">連携済</span> : <span className="text-gray-400 text-xs">未</span>}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{e.kind==="pre"?"事前":"葬儀"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
