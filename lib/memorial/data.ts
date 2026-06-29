import "server-only";
import type { Memorial } from "./types";

// =============================================================================
// 訃報データアクセス層。
// 現状: Supabase未接続のためシード(サンプル)データを返す。
// 移行: Supabase接続後、この関数の中身を obituary_public_view への
//       クエリ + passcode/invite はRPC検証 に差し替えるだけでUIは無改修。
// =============================================================================

const SEED: Record<string, Memorial> = {
  "sample-haruko": {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "sample-haruko",
    status: "published",
    testMode: true,
    accessLevel: "unlisted",
    noindex: true,
    religionType: "仏式",
    funeralStyle: "family",
    obituaryTitle: "訃報",
    obituaryBody:
      "かねてより病気療養中のところ\n6月28日午前10時22分永眠いたしました\n享年43\nここに生前に賜りましたご厚誼に感謝し\n謹んでご通知申し上げます\nなお葬儀告別式は下記の通り家族葬にて執り行います",
    kodenDecline: false,
    flowerDecline: false,
    attendDecline: false,
    kodenAcceptUntil: "2026-07-05T12:00:00+09:00",
    offeringAcceptUntil: "2026-06-30T08:30:00+09:00",
    publishedAt: "2026-06-29T08:41:00+09:00",
    funeralHomeName: "川口メモリアルホール",
    funeralHomeContact: {
      phone: "0120-963-765",
      email: "kawaguchi.memorial@gmail.com",
      url: "https://kawaguchitenrei.com/",
    },
    deceased: {
      nameKanji: "山田 哲夫",
      nameKana: "やまだ てつお",
      ageKazoe: 43,
      deathDate: "2026-06-28",
      portraitAlt: "故 山田哲夫様のご遺影",
      relationToMourner: "父",
    },
    chiefMourner: { nameKanji: "山田 太郎", relation: "長男" },
    events: [
      {
        id: "e1",
        eventType: "葬儀",
        startAt: "2026-07-01T11:30:00+09:00",
        datetimeLabel: "令和8年7月1日(水) 11:30 〜",
        venueName: "川口メモリアルホール",
        venueAddress: "埼玉県川口市西新井宿440-1",
        mapUrl: "https://maps.google.com/?q=埼玉県川口市西新井宿440-1",
      },
    ],
    venue: {
      venueName: "故 山田 哲夫 儀 葬儀会場",
      greetingHeading: "喪主挨拶",
      greetingBody:
        "本日はお忙しい中、オンライン葬儀に参列頂きありがとうございました。\n皆様にお見送りいただき、故人もさぞ喜んでいることと思います。\nここに生前中賜りましたご厚誼に、厚く御礼申し上げます。\n残された私ども遺族に対しましても、変わらぬご指導ご厚誼を賜りますようお願い申し上げます。\n本日は誠にありがとうございました。",
      greetingSignature: "喪主 山田 太郎",
      openFrom: "2026-06-29T08:41:00+09:00",
      openUntil: "2026-08-28T08:41:00+09:00",
      openDays: 60,
      requireManagementNo: false,
      requireAttendeeName: false,
      showOfferings: true,
      albumPaths: [],
      altar: {
        frame: "黒",
        sideFlower: "黒",
        center: "焼香黒",
        top: "黒",
        background: "七宝",
      },
    },
  },
};

/** 公開訃報を取得（匿名閲覧）。見つからない/非公開なら null。 */
export async function getPublicMemorial(slug: string): Promise<Memorial | null> {
  // TODO(supabase): obituary_public_view を slug で参照し、
  //   access_level=passcode/invite_only は別途RPCトークン検証に置き換える。
  const m = SEED[slug];
  if (!m) return null;
  if (m.status !== "published") return null;
  return m;
}
