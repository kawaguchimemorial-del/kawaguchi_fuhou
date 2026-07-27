import { LegalLayout, DefRow } from "@/components/guest/LegalLayout";
import { COMPANY } from "@/lib/legal/company";

export const metadata = { title: "特定商取引法に基づく表記" };

export default function TokushohoPage() {
  return (
    <LegalLayout title="特定商取引法に基づく表記">
      <dl className="border-t border-[var(--border)]">
        <DefRow label="販売事業者">{COMPANY.name}</DefRow>
        <DefRow label="運営統括責任者">{COMPANY.representative}</DefRow>
        <DefRow label="所在地">{COMPANY.address}</DefRow>
        <DefRow label="電話番号">
          {COMPANY.phone}（{COMPANY.phoneHours}）
        </DefRow>
        <DefRow label="メールアドレス">{COMPANY.email}</DefRow>
        <DefRow label="事業内容">{COMPANY.business}</DefRow>

        <DefRow label="販売価格">
          各商品のご注文ページに表示された価格（消費税込み）となります。
        </DefRow>
        <DefRow label="商品代金以外の必要料金">
          商品代金には消費税および式場までの配送料を含みます。
          {"\n"}銀行振込をご選択の場合、振込手数料はお客様のご負担となります。
        </DefRow>
        <DefRow label="お支払い方法">
          クレジットカード決済（VISA / Mastercard / JCB / American Express / Diners Club）
          {"\n"}銀行振込（請求書払い）
          {"\n"}当日現地払い（式場受付にてお支払い）
          {"\n"}※ ご葬家やご葬儀の内容により、ご利用いただけないお支払い方法がございます。
        </DefRow>
        <DefRow label="お支払い時期">
          クレジットカード：ご注文確定時に決済いたします。
          {"\n"}銀行振込：ご注文確認メールに記載の請求書に基づき、記載の期日までにお振り込みください。
          {"\n"}当日現地払い：ご葬儀当日、式場受付にてお支払いください。
        </DefRow>
        <DefRow label="商品の引渡し時期">
          ご指定のご葬儀（通夜式・葬儀告別式）の開式時刻までに、式場へ供花・供物を設営いたします。
          {"\n"}受付期限を過ぎたご注文は、ご葬儀に間に合わない場合がございます。
        </DefRow>
        <DefRow label="キャンセル・返品について">
          商品の性質上、ご注文確定後のお客様都合によるキャンセル・返品・交換はお受けできません。
          {"\n"}ただし、次の場合は全額を返金いたします。
          {"\n"}・ご葬家のご意向、または当社の都合により、ご注文の供花・供物をお届けできない場合
          {"\n"}・当社の手配に誤りがあった場合
          {"\n"}クレジットカード決済の返金は、ご利用のカード会社を通じて行われます。お客様の口座への反映まで5〜10営業日程度お時間をいただきます。
        </DefRow>
        <DefRow label="不良品について">
          当社の責に帰すべき事由により、商品に不備・破損があった場合は、
          速やかに代替品のご用意または全額のご返金にて対応いたします。
          上記の連絡先までお申し出ください。
        </DefRow>
      </dl>
    </LegalLayout>
  );
}
