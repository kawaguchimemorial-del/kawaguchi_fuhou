import { SmsForm } from "@/components/kanri/SmsForm";
import { listSmsLogs } from "@/lib/kanri/orders";
export const metadata = { title: "SMS" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ sent?: string }> };
function fmt(iso?: string){ if(!iso) return ""; const d=new Date(iso); if(isNaN(d.getTime()))return ""; return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
export default async function SmsPage({ searchParams }: SP){
  const { sent } = await searchParams;
  const logs = await listSmsLogs();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">SMS配信</h1>
      {sent && <p className="rounded bg-green-50 px-4 py-2 text-sm text-green-700">SMSを送信しました。</p>}
      <SmsForm />
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold text-[#9b2fae]">送信ログ</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b text-xs text-gray-500"><tr>{["送信日時","電話番号","本文","状態"].map(h=><th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {logs.length===0 ? <tr><td colSpan={4} className="px-2 py-8 text-center text-gray-400">送信ログはありません。</td></tr> :
                logs.map(l=>(<tr key={l.id}><td className="px-2 py-2 whitespace-nowrap text-gray-500">{fmt(l.sentAt)}</td><td className="px-2 py-2">{l.phone}</td><td className="px-2 py-2 max-w-xs truncate">{l.body}</td><td className="px-2 py-2 text-green-600 text-xs">送信済</td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
