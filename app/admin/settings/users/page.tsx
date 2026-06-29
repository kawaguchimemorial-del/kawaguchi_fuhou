import Link from "next/link";

export default function UsersSettings() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/settings" className="mb-4 inline-block text-sm text-[#9b2fae] underline">← 設定へ戻る</Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">ユーザー管理</h1>
        <button className="rounded bg-[#9b2fae] px-4 py-2 text-sm text-white">＋ ユーザーを追加（準備中）</button>
      </div>
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>{["お名前", "メールアドレス", "権限", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-4 py-3">川口 典礼（管理者）</td>
              <td className="px-4 py-3">kawaguchi.memorial@gmail.com</td>
              <td className="px-4 py-3">葬儀社管理者</td>
              <td className="px-4 py-3 text-xs text-gray-400">編集（準備中）</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500">※ ログイン認証の実装後に、実ユーザーの追加・編集・削除が可能になります。</p>
    </div>
  );
}
