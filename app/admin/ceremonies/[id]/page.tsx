import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { getFuneralHomeName } from "@/lib/admin/data";
import { toWarekiDate } from "@/lib/wareki";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
const PURPLE = "#9b2fae";

// 葬儀詳細（管理）— アット葬儀の実仕様に準拠した1枚ページ（セクション折りたたみ＋各セクション編集）。
// 参照: .claude/skills/atsougi-spec/SKILL.md
export default async function CeremonyDetail({ params }: Params) {
  const { id } = await params; // id = slug
  const m = await getPublicMemorial(id);
  if (!m) notFound();
  const homeName = await getFuneralHomeName();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const obituaryUrl = `${appUrl}/m/${id}`;
  const venueUrl = `${appUrl}/m/${id}/venue`;
  const editBase = `/admin/ceremonies/${id}/edit`;

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* ヘッダー */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {m.testMode && <span className="mr-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">テスト葬儀</span>}
          故 {m.deceased.nameKana ?? m.deceased.nameKanji} 儀　葬儀詳細
        </h1>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/ceremonies" className="rounded border px-3 py-1.5">一覧へ</Link>
          <button className="rounded border border-[#9b2fae] px-3 py-1.5 text-[#9b2fae]">テスト/本番 切替</button>
        </div>
      </div>

      {/* 公開前の注意帯＋喪主アカウント発行 */}
      <div className="mb-6 rounded bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ページの公開には喪主アカウントの発行が必要です。電話番号またはメールアドレスで発行してください。
        <button className="ml-3 rounded bg-[#9b2fae] px-3 py-1.5 text-white">▶ 喪主アカウントを発行</button>
      </div>

      {/* === セクション群 === */}
      <Section title="喪主／故人" status="登録済" editHref={`${editBase}#step1`}>
        <Row label="故人">{m.deceased.nameKanji}{m.deceased.nameKana ? `（${m.deceased.nameKana}）` : ""}</Row>
        <Row label="没日">{m.deceased.deathDate ? `${toWarekiDate(m.deceased.deathDate)}${m.deceased.ageKazoe ? `　享年${m.deceased.ageKazoe}` : ""}` : "—"}</Row>
        <Row label="喪主">{m.chiefMourner?.nameKanji ?? "—"}</Row>
        <Row label="ログインID">{/* TODO: 喪主アカウント発行後に表示 */}未発行</Row>
      </Section>

      <Section title="訃報・香典" status="登録済" editHref={`${editBase}#step2`}>
        <Row label="訃報プレビュー"><a href={obituaryUrl} target="_blank" className="text-[#9b2fae] underline">プレビューを表示する ↗</a></Row>
        <Row label="訃報URL"><span className="break-all text-xs">{obituaryUrl}</span></Row>
        <Row label="訃報QR">
          <a href={`/admin/ceremonies/${id}/qr?url=${encodeURIComponent(obituaryUrl)}&dl=1`} className="text-[#9b2fae] underline">QRコードダウンロード</a>
        </Row>
        <Row label="印刷ダウンロード">
          <span className="text-xs text-gray-400">PDFダウンロード / Wordダウンロード（準備中）</span>
        </Row>
        <Row label="訃報タイトル">{m.obituaryTitle}</Row>
        {m.obituaryBody && (
          <Row label="訃報文"><span className="whitespace-pre-wrap text-xs">{m.obituaryBody}</span></Row>
        )}
        <Row label="案内される喪主名">{m.chiefMourner?.nameKanji ?? "—"}</Row>
        {m.events.map((e, i) => (
          <Row key={e.id} label={`式${i + 1}`}>
            {e.eventType}　{e.datetimeLabel ?? (e.startAt ? toWarekiDate(e.startAt) : "日程調整中")}
            {e.venueName ? `　${e.venueName}` : ""}
          </Row>
        ))}
        <Row label="儀式形態">{m.religionType}</Row>
        <Row label="御用達">{homeName}{m.funeralHomeContact?.phone ? `　${m.funeralHomeContact.phone}` : ""}</Row>
        <Row label="香典決済">{m.kodenDecline ? "利用しない" : "利用する"}</Row>
      </Section>

      <Section title="記帳" status="登録済" editHref={`${editBase}#step3`}>
        <p className="text-sm text-gray-500">参列者の記帳フォームで入力を求める項目（性別／メール／電話／会社名／メッセージ／写真）を設定します。</p>
        <p className="mt-1 text-xs text-gray-400">※ お悔やみメッセージは既定で承認制。</p>
      </Section>

      <Section title="供花・供物" status="登録済" editHref={`${editBase}#step4`}>
        <Row label="供花 受付終了">{m.offeringAcceptUntil ? new Date(m.offeringAcceptUntil).toLocaleString("ja-JP") : "—"}</Row>
        <Row label="受付">{m.flowerDecline ? "受け付けない" : "受け付ける"}</Row>
        <p className="mt-2 text-xs text-gray-400">商品マスタは「設定 › 供花・供物の設定・商品登録」で管理。</p>
      </Section>

      {m.venue && (
        <Section title="オンライン式場" status="登録済" editHref={`${editBase}#step5`}>
          <Row label="プレビュー"><a href={venueUrl} target="_blank" className="text-[#9b2fae] underline">プレビューを表示する ↗</a></Row>
          <Row label="式場URL"><span className="break-all text-xs">{venueUrl}</span></Row>
          <Row label="式場QR"><a href={`/admin/ceremonies/${id}/qr?url=${encodeURIComponent(venueUrl)}&dl=1`} className="text-[#9b2fae] underline">QRコードダウンロード</a></Row>
          <Row label="オンライン式名">{m.venue.venueName}</Row>
          <Row label="挨拶文見出し">{m.venue.greetingHeading}</Row>
          <Row label="挨拶文"><span className="whitespace-pre-wrap text-xs">{m.venue.greetingBody}</span></Row>
          <Row label="公開期間">
            {m.venue.openFrom ? new Date(m.venue.openFrom).toLocaleDateString("ja-JP") : "—"}
            {m.venue.openUntil ? ` 〜 ${new Date(m.venue.openUntil).toLocaleDateString("ja-JP")}` : ""}
            {m.venue.openDays ? `（${m.venue.openDays}日間）` : ""}
          </Row>
        </Section>
      )}

      <Section title="香典" status={m.kodenDecline ? "未登録" : "登録済"} editHref={`${editBase}#step2`} />
      <Section title="動画" status="0件" editHref={`${editBase}#media`} />
      <Section title="故人の写真" status={`${m.venue?.ceremonyPhotoPath ? 1 : 0}件`} editHref={`${editBase}#media`} />
      <Section title="アルバム" status={`${m.venue?.albumPaths.length ?? 0}件`} editHref={`${editBase}#media`} />
      <Section title="贈答品" status="未登録" editHref={`${editBase}#gift`} />
      <Section title="YouTubeライブ配信" status="0件" editHref={`${editBase}#live`} />

      {/* 閲覧数一覧 */}
      <div className="mb-3 rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold">オンライン式場閲覧数一覧</p>
        <div className="flex gap-2 text-sm">
          <Link href={`/admin/ceremonies/${id}/entries`} className="rounded border px-4 py-2">入場一覧</Link>
          <Link href={`/admin/ceremonies/${id}/guestbook`} className="rounded border px-4 py-2">芳名録</Link>
        </div>
      </div>

      {/* 各注文一覧 */}
      <OrderListBlock title="供花の注文一覧" id={id} kind="flower" />
      <OrderListBlock title="供物の注文一覧" id={id} kind="offering" />
      <OrderListBlock title="贈答品の注文一覧" id={id} kind="gift" />

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="font-bold">注文メール通知先追加</p>
        <p className="mt-1 text-xs text-gray-400">EC注文の通知先メールを追加します（準備中）。</p>
      </div>
    </div>
  );
}

// セクション（折りたたみ＋状態バッジ＋編集ボタン）
function Section({
  title,
  status,
  editHref,
  children,
}: {
  title: string;
  status: string;
  editHref: string;
  children?: React.ReactNode;
}) {
  const registered = status === "登録済";
  return (
    <details open={registered} className="mb-3 rounded-lg bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
        <span className="flex items-center gap-2 font-bold" style={{ color: PURPLE }}>
          <span className="text-xs">▾</span>{title}
        </span>
        <span className={"rounded-full px-3 py-0.5 text-xs " + (registered ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
          {status}
        </span>
      </summary>
      <div className="border-t px-5 py-4">
        <div className="mb-4">
          <Link href={editHref} className="inline-block rounded bg-[#9b2fae] px-4 py-2 text-sm text-white">登録内容を編集</Link>
        </div>
        {children}
      </div>
    </details>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b py-2 last:border-0">
      <span className="w-32 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

function OrderListBlock({ title, id, kind }: { title: string; id: string; kind: string }) {
  return (
    <div className="mb-3 rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold">{title}</p>
        <div className="flex gap-2 text-sm">
          <a href={`/admin/ceremonies/${id}/orders/export?kind=${kind}&fmt=csv`} className="rounded border border-[#9b2fae] px-3 py-1.5 text-[#9b2fae]">CSVダウンロード</a>
          <a href={`/admin/ceremonies/${id}/orders/export?kind=${kind}&fmt=excel`} className="rounded border border-[#9b2fae] px-3 py-1.5 text-[#9b2fae]">EXCELダウンロード</a>
        </div>
      </div>
      <p className="text-xs text-gray-400">受付終了　合計 0件 0円</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs text-gray-500">
          <thead className="border-b">
            <tr>{["商品", "商品名", "数量", "金額", "支払い方法", "ステータス", "注文者", "注文日時", "メールアドレス"].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr>
          </thead>
          <tbody><tr><td colSpan={9} className="px-2 py-6 text-center text-gray-400">注文はまだありません。</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}
