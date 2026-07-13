import Link from "next/link";

export default function MailSettings() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/fuhou/settings" className="mb-4 inline-block text-sm text-[#9b2fae] underline">← 設定へ戻る</Link>
      <h1 className="mb-6 text-xl font-bold">メール設定</h1>
      <div className="space-y-6">
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <p className="mb-2 font-medium">注文メール通知先</p>
          <p className="mb-3 text-sm text-gray-500">EC（供花・供物）で注文を受けた際に通知するメールアドレス。</p>
          <input defaultValue="kawaguchi.memorial@gmail.com" className="w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" />
        </section>
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <p className="mb-2 font-medium">自動送信メール文言</p>
          <p className="mb-3 text-sm text-gray-500">システムから自動送信するメールに追加する任意の文言。</p>
          <textarea rows={4} className="w-full rounded border p-3 focus:border-[#9b2fae] focus:outline-none" />
        </section>
        <button className="rounded bg-[#9b2fae] px-6 py-2.5 text-sm text-white">保存する（準備中）</button>
      </div>
    </div>
  );
}
