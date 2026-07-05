import { KanriStub } from "@/components/kanri/Stub";
export const metadata = { title: "発注管理" };
export default function Page() {
  return <KanriStub title="発注管理" items={["発注（発注先向け）", "納品管理", "買掛管理", "発注CSV"]} note="仕入先への発注・納品・買掛を管理します（Phase5で実装）。" />;
}
