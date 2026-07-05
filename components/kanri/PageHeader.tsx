import Link from "next/link";

// CRM各画面の緑のタイトルバー（スマート葬儀の一覧画面ヘッダーに準拠）
export function PageHeader({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="-m-5 mb-4 flex items-center justify-between bg-[#2c8c6f] px-5 py-3">
      <h1 className="text-lg font-bold text-white">{title}</h1>
      {action && (
        <Link href={action.href} className="rounded bg-white/15 px-4 py-1.5 text-sm text-white hover:bg-white/25">{action.label}</Link>
      )}
    </div>
  );
}
