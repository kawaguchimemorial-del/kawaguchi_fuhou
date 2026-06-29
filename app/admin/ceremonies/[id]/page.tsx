import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { getFuneralHomeName, listOrders, countViews, listGuestbook, type OrderRow } from "@/lib/admin/data";
import { getMournerAccount } from "@/lib/admin/mourner-actions";
import { MournerAccount } from "@/components/admin/MournerAccount";
import { getSiteOrigin } from "@/lib/site-url";
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
  const [orders, views, guestbook, mourner] = await Promise.all([
    listOrders(id),
    countViews(id),
    listGuestbook(id),
    getMournerAccount(id),
  ]);

  const appUrl = await getSiteOrigin();
  const obituaryUrl = `${appUrl}/m/${id}`;
  const venueUrl = `${appUrl}/m/${id}/venue`;
  const editBase = `/admin/ceremonies/${id}/edit`;

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* ヘッダー */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {m.testMode && <span className="mr-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">テスト葬儀</span>}
          故 {m.deceased.nameKanji} 儀　葬儀詳細
        </h1>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/ceremonies" className="rounded border px-3 py-1.5">一覧へ</Link>
          <button className="rounded border border-[#9b2fae] px-3 py-1.5 text-[#9b2fae]">テスト/本番 切替</button>
        </div>
      </div>

      {/* 喪主アカウント発行 */}
      <MournerAccount slug={id} issued={mourner.issued} loginId={mourner.loginId} />

      {/* === セクション群 === */}
      <Section title="喪主／故人" status="登録済" editHref={`${editBase}?step=0`}>
        <Row label="故人">{m.deceased.nameKanji}{m.deceased.nameKana ? `（${m.deceased.nameKana}）` : ""}</Row>
        <Row label="没日">{m.deceased.deathDate ? `${toWarekiDate(m.deceased.deathDate)}${m.deceased.ageKazoe ? `　享年${m.deceased.ageKazoe}` : ""}` : "—"}</Row>
        <Row label="喪主">{m.chiefMourner?.nameKanji ?? "—"}</Row>
        <Row label="ログインID">{mourner.issued ? mourner.loginId : "未発行"}</Row>
      </Section>

      <Section title="訃報・香典" status="登録済" editHref={`${editBase}?step=1`}>
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

      <Section title="記帳" status="登録済" editHref={`${editBase}?step=2`}>
        <p className="text-sm text-gray-500">参列者の記帳フォームで入力を求める項目（性別／メール／電話／会社名／メッセージ／写真）を設定します。</p>
        <p className="mt-1 text-xs text-gray-400">※ お悔やみメッセージは既定で承認制。</p>
      </Section>

      <Section title="供花・供物" status="登録済" editHref={`${editBase}?step=3`}>
        <Row label="供花 受付終了">{m.offeringAcceptUntil ? new Date(m.offeringAcceptUntil).toLocaleString("ja-JP") : "—"}</Row>
        <Row label="受付">{m.flowerDecline ? "受け付けない" : "受け付ける"}</Row>
        <p className="mt-2 text-xs text-gray-400">商品マスタは「設定 › 供花・供物の設定・商品登録」で管理。</p>
      </Section>

      {m.venue && (
        <Section title="オンライン式場" status="登録済" editHref={`${editBase}?step=4`}>
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

      <Section title="動画" status="0件" editHref={editBase} />
      <Section title="故人の写真" status={`${m.venue?.ceremonyPhotoPath ? 1 : 0}件`} editHref={editBase} />
      <Section title="アルバム" status={`${m.venue?.albumPaths.length ?? 0}件`} editHref={editBase} />
      <Section title="YouTubeライブ配信" status="0件" editHref={editBase} />

      {/* 閲覧数一覧 */}
      <div className="mb-3 rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold">オンライン式場閲覧数一覧</p>
        <p className="mb-3 text-sm text-gray-600">入場（閲覧）{views}回　／　芳名録 {guestbook.length}件</p>
        <div className="flex gap-2 text-sm">
          <Link href={`/admin/ceremonies/${id}/entries`} className="rounded border px-4 py-2">入場一覧（{views}）</Link>
          <Link href={`/admin/ceremonies/${id}/guestbook`} className="rounded border px-4 py-2">芳名録（{guestbook.length}）</Link>
        </div>
      </div>

      {/* 注文一覧（供花・供物のみ。香典決済・贈答品は非対応） */}
      <OrderListBlock title="供花・供物の注文一覧" id={id} kind="flower" rows={orders} />

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

function OrderListBlock({ title, id, kind, rows }: { title: string; id: string; kind: string; rows: OrderRow[] }) {
  const total = rows.reduce((s, r) => s + r.amountJpy, 0);
  return (
    <div className="mb-3 rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold">{title}</p>
        <div className="flex gap-2 text-sm">
          <a href={`/admin/ceremonies/${id}/orders/export?kind=${kind}&fmt=csv`} className="rounded border border-[#9b2fae] px-3 py-1.5 text-[#9b2fae]">CSVダウンロード</a>
          <a href={`/admin/ceremonies/${id}/orders/export?kind=${kind}&fmt=excel`} className="rounded border border-[#9b2fae] px-3 py-1.5 text-[#9b2fae]">EXCELダウンロード</a>
        </div>
      </div>
      <p className="text-xs text-gray-500">合計 {rows.length}件 {total.toLocaleString()}円</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="border-b text-gray-500">
            <tr>{["商品名", "数量", "金額", "ステータス", "注文者", "札名", "注文日時", "メールアドレス"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-2 py-6 text-center text-gray-400">注文はまだありません。</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-2 py-2">{r.productName}</td>
                  <td className="px-2 py-2">{r.quantity}</td>
                  <td className="px-2 py-2">{r.amountJpy.toLocaleString()}円</td>
                  <td className="px-2 py-2">{r.status}</td>
                  <td className="px-2 py-2">{r.ordererName}</td>
                  <td className="px-2 py-2 max-w-[10rem] truncate">{r.namePlate}</td>
                  <td className="px-2 py-2 text-gray-500">{new Date(r.createdAt).toLocaleString("ja-JP")}</td>
                  <td className="px-2 py-2 text-gray-500">{r.email}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
