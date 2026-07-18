import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Album, BookUser, ClipboardList, FileText, Images, KeyRound,
  LogOut, Mail, MessageSquare, Scale, Send, Share2,
} from "lucide-react";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { getMournerCounts, getMournerMemorial } from "@/lib/mourner/data";
import { signOutAction } from "@/lib/mourner/actions";
import { SiteFooter } from "@/components/mourner/Shell";

// 喪主マイページのホーム。＠葬儀に倣いカード型メニュー（タイトル＋バッジ＋説明）。

export default async function MournerHome({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");

  const memorial = await getMournerMemorial(id);
  if (!memorial) notFound();
  const counts = await getMournerCounts(id);

  const name = memorial.mournerName || memorial.deceasedName;

  const cards = [
    { href: `/mypage/${id}/announcement`, Icon: Share2, title: "参列者へのご案内", badge: null,
      desc: "参列者にご案内する訃報・オンライン式場ページはこちらからご確認いただけます。" },
    { href: `/mypage/${id}/online`, Icon: MessageSquare, title: "オンライン式場",
      badge: memorial.status === "published" ? "公開中" : "準備中",
      desc: "オンライン式場のご確認と、挨拶文の編集ができます。" },
    { href: `/mypage/${id}/attendees`, Icon: BookUser, title: "芳名録", badge: `${counts.attendees}件`,
      desc: "参列者の一覧・メッセージ・お香典はこちらからご確認いただけます。" },
    { href: `/mypage/${id}/visitors`, Icon: ClipboardList, title: "入場記録", badge: `${counts.visitors}件`,
      desc: "オンライン式場に入場された方の一覧はこちらからご確認いただけます。" },
    { href: `/mypage/${id}/funeral-photos`, Icon: Images, title: "葬儀の写真", badge: `${counts.funeralPhotos}枚`,
      desc: "オンライン式場に表示する葬儀の写真を編集できます。" },
    { href: `/mypage/${id}/album`, Icon: Album, title: "アルバム", badge: `${counts.albumPhotos}枚`,
      desc: "オンライン式場に表示する故人の思い出写真を編集できます。" },
    { href: `/mypage/${id}/password`, Icon: KeyRound, title: "アカウント情報", badge: null,
      desc: "アカウント確認・パスワード変更はこちらから。" },
    { href: `/mypage/${id}/mail-settings`, Icon: Mail, title: "メール通知設定", badge: null,
      desc: "メールアドレスの登録と通知の設定はこちらから。" },
    { href: `/mypage/${id}/contact`, Icon: Send, title: "お問い合わせ", badge: null,
      desc: "お問い合わせはこちらから。" },
    { href: `/mypage/${id}/term`, Icon: FileText, title: "利用規約", badge: null,
      desc: "利用規約はこちらからご確認いただけます。" },
    { href: `/mypage/${id}/transactions`, Icon: Scale, title: "特定商取引法に基づく表記", badge: null,
      desc: "特定商取引法に基づく表記はこちらからご確認いただけます。" },
  ];

  return (
    <div>
      <header className="py-8">
        <h1 className="text-2xl font-bold">マイページ</h1>
        {name && <p className="mt-1 text-[#6b6b6b]">{name} 様向けページ</p>}
      </header>

      <ul className="space-y-3">
        {cards.map(({ href, Icon, title, badge, desc }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex gap-4 rounded-lg bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <Icon size={22} className="mt-0.5 shrink-0 text-[#a8842f]" aria-hidden />
              <div className="min-w-0">
                <p className="font-bold">
                  {title}
                  {badge && (
                    <span className="ml-2 rounded-full bg-[#f0ece2] px-2.5 py-0.5 text-xs font-normal text-[#6b5b32]">
                      {badge}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-[#6b6b6b]">{desc}</p>
              </div>
            </Link>
          </li>
        ))}

        <li>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full gap-4 rounded-lg bg-white p-5 text-left shadow-sm transition hover:shadow-md"
            >
              <LogOut size={22} className="mt-0.5 shrink-0 text-[#a8842f]" aria-hidden />
              <div>
                <p className="font-bold">ログアウト</p>
                <p className="mt-1 text-sm text-[#6b6b6b]">ログアウトします。</p>
              </div>
            </button>
          </form>
        </li>
      </ul>

      <SiteFooter />
    </div>
  );
}
