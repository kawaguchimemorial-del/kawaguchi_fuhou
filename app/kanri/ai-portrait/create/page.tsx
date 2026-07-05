import Link from "next/link";

export const metadata = { title: "AI遺影写真 作成（仮）" };

export default function AiPortraitCreatePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">AI遺影写真 作成（仮ページ）</h1>
      <div className="rounded-lg bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-gray-600">
          こちらはAI遺影写真作成ツールの連携用の仮ページです。<br />
          別途開発中のAI遺影写真作成ソフトをこの画面に組み込みます。
        </p>
        <div className="mt-6">
          <Link href="/kanri/ai-portrait" className="rounded border px-6 py-2.5 text-sm">戻る</Link>
        </div>
      </div>
    </div>
  );
}
