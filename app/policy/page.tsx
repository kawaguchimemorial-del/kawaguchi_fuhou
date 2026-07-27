import Link from "next/link";
import { LegalLayout, Article } from "@/components/guest/LegalLayout";
import { COMPANY } from "@/lib/legal/company";

export const metadata = { title: "サイトポリシー" };

export default function PolicyPage() {
  return (
    <LegalLayout title="サイトポリシー">
      <p>
        本サイトは {COMPANY.name}（以下「当社」といいます）が運営しています。
        ご利用にあたっては、以下の事項をご確認ください。
      </p>

      <Article title="1. 訃報案内ページの取り扱い">
        <p>
          訃報案内ページおよびオンライン式場は、ご葬家の許可のもとで公開しているものです。
          お知らせを受け取られた方以外への転載・拡散はお控えください。
          また、掲載内容の無断転載・複製を禁じます。
        </p>
      </Article>

      <Article title="2. 公開期間">
        <p>
          各ページはご葬家の意向に基づき、一定期間の経過後に公開を終了します。
          公開終了後はご覧いただけなくなりますのでご了承ください。
        </p>
      </Article>

      <Article title="3. 免責事項">
        <p>
          当社は、掲載内容の正確性に努めておりますが、
          ご葬家からご提供いただいた情報に基づく記載について、その完全性を保証するものではありません。
          本サイトのご利用により生じた損害について、当社は責任を負いかねます。
        </p>
        <p>
          通信回線やシステムの障害、保守作業等により、
          予告なく本サイトの提供を中断または終了する場合があります。
        </p>
      </Article>

      <Article title="4. 推奨環境">
        <p>
          各OSの最新版ブラウザ（Google Chrome、Safari、Microsoft Edge、Firefox）でのご利用を推奨します。
          お使いの環境によっては、正しく表示されない場合があります。
        </p>
      </Article>

      <Article title="5. 個人情報の取り扱い">
        <p>
          <Link href="/privacy" className="text-[var(--accent)] underline">
            プライバシーポリシー
          </Link>
          をご確認ください。
        </p>
      </Article>

      <Article title="6. 供花・供物のご注文について">
        <p>
          お取引条件は
          <Link href="/legal/tokushoho" className="text-[var(--accent)] underline">
            特定商取引法に基づく表記
          </Link>
          に定めるとおりです。
        </p>
      </Article>

      <Article title="7. お問い合わせ">
        <p>
          {COMPANY.name}
          <br />
          電話：{COMPANY.phone}（{COMPANY.phoneHours}）
          <br />
          メール：{COMPANY.email}
        </p>
      </Article>
    </LegalLayout>
  );
}
