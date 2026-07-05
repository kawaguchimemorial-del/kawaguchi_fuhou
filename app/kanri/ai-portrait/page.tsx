import Link from "next/link";

export const metadata = { title: "AI遺影写真" };

export default function AiPortraitPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">AI遺影写真</h1>
      <div className="rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">
          AI遺影写真の作成機能です。<br />
          専用のAI遺影作成ツールで、お写真から遺影を生成します。
        </p>
        <div className="mt-6">
          <Link href="/kanri/ai-portrait/create" className="inline-block rounded bg-[#9b2fae] px-6 py-3 text-sm text-white">
            AI遺影写真を作成する
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">※ 作成ツールは別途連携予定です。</p>
      </div>
    </div>
  );
}
