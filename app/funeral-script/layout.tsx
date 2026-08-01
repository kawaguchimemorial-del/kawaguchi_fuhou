import { requireAdmin } from "@/lib/admin/auth";

// 司会台本・会葬礼状も管理者専用（AI生成の課金が発生する）。
// middleware でも門前払いしているが、許可リスト(admin_users)の確認をここで行う。
export default async function FuneralScriptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin("/funeral-script");
  return <>{children}</>;
}
