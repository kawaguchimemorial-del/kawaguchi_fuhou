import { LegalLayout, Article } from "@/components/guest/LegalLayout";
import { COMPANY } from "@/lib/legal/company";

export const metadata = { title: "プライバシーポリシー" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="プライバシーポリシー">
      <p>
        {COMPANY.name}（以下「当社」といいます）は、訃報案内・オンライン式場および供花・供物の
        ご注文サービス（以下「本サービス」といいます）においてお預かりする個人情報を、
        以下の方針に基づき適切に取り扱います。
      </p>

      <Article title="1. 取得する情報">
        <p>本サービスでは、次の情報を取得します。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>ご注文者様のお名前、フリガナ、法人・団体名、ご住所、電話番号、メールアドレス</li>
          <li>供花・供物の札名、ご注文内容、備考</li>
          <li>ご記帳・ご弔電・参列のご連絡にあたりご入力いただいた情報</li>
          <li>ページの閲覧状況（アクセス日時等の統計情報）</li>
        </ul>
        <p>
          クレジットカード情報は決済代行会社（Stripe）が直接取得・管理しており、
          当社のサーバーに保存されることはありません。
        </p>
      </Article>

      <Article title="2. 利用目的">
        <ul className="list-disc space-y-1 pl-5">
          <li>供花・供物のご注文の受付、手配、設営およびご連絡</li>
          <li>代金の請求、領収書・請求書の発行</li>
          <li>ご葬家（喪主様・ご遺族様）へのご芳名・ご記帳内容のご報告</li>
          <li>本サービスの提供、維持、改善</li>
          <li>法令に基づく対応</li>
        </ul>
      </Article>

      <Article title="3. 第三者提供">
        <p>
          当社は、次の場合を除き、ご本人の同意なく個人情報を第三者に提供いたしません。
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>ご注文の性質上、ご葬家（喪主様・ご遺族様）へ、ご注文者様のお名前・札名をお伝えする場合</li>
          <li>供花・供物の手配のため、生花店等の協力会社へ必要な範囲で提供する場合</li>
          <li>法令に基づき開示が求められた場合</li>
        </ul>
      </Article>

      <Article title="4. 外部サービスの利用">
        <p>
          本サービスは、決済処理のため Stripe, Inc. を利用しています。
          お支払い手続きにおいて入力された情報は同社のプライバシーポリシーに従って取り扱われます。
        </p>
      </Article>

      <Article title="5. 安全管理">
        <p>
          当社は、個人情報の漏えい、滅失またはき損の防止その他の安全管理のために、
          通信の暗号化、アクセス権限の管理等の必要かつ適切な措置を講じます。
        </p>
      </Article>

      <Article title="6. 開示・訂正・削除のご請求">
        <p>
          ご本人からの個人情報の開示、訂正、利用停止、削除のご請求については、
          下記のお問い合わせ先にて承ります。ご本人であることを確認のうえ、
          法令に従い速やかに対応いたします。
        </p>
      </Article>

      <Article title="7. お問い合わせ窓口">
        <p>
          {COMPANY.name}
          <br />
          {COMPANY.address}
          <br />
          電話：{COMPANY.phone}（{COMPANY.phoneHours}）
          <br />
          メール：{COMPANY.email}
        </p>
      </Article>

      <Article title="8. 本ポリシーの変更">
        <p>
          法令の改正やサービス内容の変更に伴い、本ポリシーを変更することがあります。
          変更後の内容は本ページに掲載した時点から適用されます。
        </p>
      </Article>
    </LegalLayout>
  );
}
