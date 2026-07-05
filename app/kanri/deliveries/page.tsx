import { listPurchaseOrders } from "@/lib/kanri/orders";
import Link from "next/link";

export const metadata = { title: "納品管理" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ from?: string; to?: string; supplier?: string; status?: string }> };

function fmt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function DeliveriesPage({ searchParams }: SP) {
  const { from, to, supplier, status } = await searchParams;
  let orders = await listPurchaseOrders();
  if (from) orders = orders.filter((o) => o.orderedOn && o.orderedOn >= from);
  if (to) orders = orders.filter((o) => o.orderedOn && o.orderedOn <= to + "T99");
  if (supplier) orders = orders.filter((o) => (o.supplier ?? "").includes(supplier));
  if (status) orders = orders.filter((o) => o.status === status);

  const cols = ["ID", "発注日", "見積もり", "発注先", "商品名", "下代", "下代(税込)", "発注数", "発注額", "消費税額", "発注額(税込)", "納品日時", ""];

  return (
    <div>
      {/* 緑ヘッダー＋右上[直接発注]（実画面準拠） */}
      <div className="-m-5 mb-4 flex flex-wrap items-center justify-between gap-2 bg-[#2c8c6f] px-5 py-3">
        <h1 className="text-lg font-bold text-white">納品管理</h1>
        <Link href="/kanri/orders" className="rounded bg-white px-3 py-1.5 text-xs font-medium text-[#2c8c6f]">直接発注</Link>
      </div>

      {/* 検索（実画面準拠） */}
      <form className="mb-4 rounded-lg bg-white p-4 shadow-sm text-sm">
        <p className="mb-3 font-bold text-gray-700">検索</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500">発注日</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="date" name="from" defaultValue={from ?? ""} className="w-full rounded border px-3 py-2" />
              <span className="text-gray-400">〜</span>
              <input type="date" name="to" defaultValue={to ?? ""} className="w-full rounded border px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500">納品希望日時</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="date" className="w-full rounded border px-3 py-2" />
              <span className="text-gray-400">〜</span>
              <input type="date" className="w-full rounded border px-3 py-2" />
            </div>
          </div>
          <div><label className="block text-xs text-gray-500">発注先</label><input name="supplier" defaultValue={supplier ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">納品先名</label><input className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">商品</label><input className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">発注書ID</label><input className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">見積書ID</label><input className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">施行番号</label><input className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">計上組織</label><input className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">在庫管理会場</label><input className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">発注ステータス</label><select name="status" defaultValue={status ?? ""} className="mt-1 w-full rounded border px-3 py-2"><option value=""></option><option value="ordered">発注済</option><option value="delivered">納品済</option></select></div>
          <div><label className="block text-xs text-gray-500">メールステータス</label><select className="mt-1 w-full rounded border px-3 py-2"><option value=""></option><option>未送信</option><option>送信済</option></select></div>
          <div><label className="block text-xs text-gray-500">支払ステータス</label><select className="mt-1 w-full rounded border px-3 py-2"><option value=""></option><option>未払い</option><option>支払済</option></select></div>
          <div><label className="block text-xs text-gray-500">ロックステータス</label><select className="mt-1 w-full rounded border px-3 py-2"><option value=""></option><option>ロック中</option><option>未ロック</option></select></div>
        </div>
        <button className="mt-4 rounded border border-[#2c8c6f] px-5 py-2 text-[#2c8c6f]">🔍 検索</button>
      </form>

      {/* 一覧（実画面準拠: 明細行展開） */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="border-b px-4 py-3"><p className="text-sm font-bold">一覧</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{cols.map((h, i) => <th key={i} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {orders.length === 0 ? <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-gray-400">発注がありません。</td></tr> :
                orders.flatMap((o) =>
                  (o.items && o.items.length ? o.items : [null]).map((it, i) => {
                    const amount = it?.amount ?? o.total;
                    const tax = Math.round(amount * 0.1);
                    return (
                      <tr key={`${o.id}-${i}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs">{i === 0 ? o.id.slice(0, 8) : ""}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">{i === 0 ? fmt(o.orderedOn) : ""}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{i === 0 ? (o.estimateId ? o.estimateId.slice(0, 8) : "—") : ""}</td>
                        <td className="px-3 py-2">{i === 0 ? (o.supplier ?? "—") : ""}</td>
                        <td className="px-3 py-2">{it?.name ?? "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">{(it?.unitPrice ?? 0).toLocaleString()}円</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">{Math.round((it?.unitPrice ?? 0) * 1.1).toLocaleString()}円</td>
                        <td className="px-3 py-2 text-center">{it?.quantity ?? 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">{amount.toLocaleString()}円</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">{tax.toLocaleString()}円</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">{(amount + tax).toLocaleString()}円</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">{i === 0 ? fmt(o.deliveredOn) : ""}</td>
                        <td className="px-3 py-2">{i === 0 && <Link href={`/kanri/orders/${o.id}`} className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">詳細</Link>}</td>
                      </tr>
                    );
                  })
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
