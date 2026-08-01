import { requireAdmin } from "@/lib/admin/auth";

// AI遺影スタジオも管理者専用（OpenAI課金が発生する）。
// middleware でも門前払いしているが、許可リスト(admin_users)の確認をここで行う。
export default async function IeiPhotoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin("/iei-photo");
  return <>{children}</>;
}
