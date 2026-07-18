import { notFound, redirect } from "next/navigation";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { getAttendee } from "@/lib/mourner/data";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";
import { photoPublicUrl } from "@/lib/mourner/storage";

// 参列者詳細。＠葬儀に倣い、未入力の項目は行ごと非表示にする。

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="border-b py-3 last:border-b-0">
      <dt className="text-xs text-[#8a8a8a]">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap leading-relaxed">{value}</dd>
    </div>
  );
}

export default async function AttendeeDetailPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");

  const a = await getAttendee(id, entryId);
  if (!a) notFound();

  const address = [a.postalCode ? `〒${a.postalCode}` : null, a.address].filter(Boolean).join("\n");

  return (
    <div>
      <PageHeader title="参列者詳細" backHref={`/mypage/${id}/attendees`} backLabel="一覧へ戻る" />

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">{a.name} 様</h2>
        <dl>
          <Row label="名前" value={a.name} />
          <Row label="名前（ふりがな）" value={a.kana} />
          <Row label="住所" value={address || null} />
          <Row label="電話番号" value={a.phone} />
          <Row label="メールアドレス" value={a.email} />
          <Row label="故人とのご関係" value={a.relation} />
          <Row label="会社名" value={a.company} />
          <Row label="お香典" value={a.kodenAmount > 0 ? `${a.kodenAmount.toLocaleString("ja-JP")}円` : null} />
          <Row label="メッセージ" value={a.body} />
        </dl>

        {a.imagePaths.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-[#8a8a8a]">画像</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {a.imagePaths.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={photoPublicUrl(p, "condolence")} alt=""
                     className="aspect-square w-full rounded object-cover" />
              ))}
            </div>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
