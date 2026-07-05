export const metadata = { title: "売掛残高" };
export const dynamic = "force-dynamic";

// 実スマート葬儀: 条件指定(対象日範囲/発行会社/計上組織)＋CSVダウンロードのみのシンプル画面
export default async function ReceivablesPage() {
  const today = new Date();
  const first = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const now = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">売掛残高</h1></div>

      <form action="/kanri/receivables/export" className="rounded-lg bg-white p-5 shadow-sm text-sm">
        <p className="mb-4 font-bold text-gray-700">条件指定</p>

        <label className="mb-1 block font-bold text-gray-700">対象日</label>
        <div className="mb-4 flex items-center gap-3">
          <input type="date" name="from" defaultValue={first} className="w-full rounded border px-3 py-2" />
          <span className="text-gray-400">〜</span>
          <input type="date" name="to" defaultValue={now} className="w-full rounded border px-3 py-2" />
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-gray-700">発行会社</label>
            <select name="issuer" className="w-full rounded border px-3 py-2"><option value="">すべて</option><option>株式会社 川口典礼</option></select>
          </div>
          <div>
            <label className="mb-1 block font-bold text-gray-700">計上組織</label>
            <select name="org" className="w-full rounded border px-3 py-2"><option value="">すべて</option></select>
          </div>
        </div>

        <button className="rounded bg-[#5b6ee1] px-5 py-2.5 text-white">📄 CSVダウンロード</button>
      </form>
    </div>
  );
}
