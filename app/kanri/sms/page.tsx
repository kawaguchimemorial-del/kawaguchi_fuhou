import { KanriStub } from "@/components/kanri/Stub";
export const metadata = { title: "SMS" };
export default function Page() {
  return <KanriStub title="SMS" items={["SMS配信", "SMS送信ログ", "自動配信設定"]} note="顧客へのSMS配信・ログ（Phase6で実装）。" />;
}
