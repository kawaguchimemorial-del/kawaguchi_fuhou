import "server-only";
import type { Memorial } from "./types";
import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase/admin";

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
      scenePaths: [],
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

/** 公開訃報を取得（匿名閲覧）。見つからない/非公開なら null。
 *  Supabaseが設定されていれば RPC get_public_obituary を参照、
 *  未設定 or 取得失敗時はシードにフォールバック（ローカル開発・オフライン耐性）。
 *  TODO: passcode/invite_only はトークン検証RPCを別途用意。 */
export async function getPublicMemorial(slug: string): Promise<Memorial | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAnonServerClient();
      const { data, error } = await supabase.rpc("get_public_obituary", {
        p_slug: slug,
      });
      if (!error && data) return mapRpcToMemorial(slug, data as RpcObituary);
    } catch {
      // ネットワーク不通等はシードにフォールバック
    }
  }
  const m = SEED[slug];
  if (!m || m.status !== "published") return null;
  return m;
}

interface RpcObituary {
  slug: string;
  status: string;
  access_level: string;
  noindex_flag: boolean;
  religion_type: Memorial["religionType"];
  funeral_style?: Memorial["funeralStyle"];
  koden_decline: boolean;
  flower_decline: boolean;
  attend_decline: boolean;
  koden_accept_until?: string;
  offering_accept_until?: string;
  published_at?: string;
  obituary_title?: string;
  obituary_body?: string;
  announce_mourner_name?: string;
  venue?: Memorial["venue"];
  funeral_home_name?: string;
  fh_phone?: string;
  fh_email?: string;
  name_kanji: string;
  name_kana?: string;
  age_kazoe?: number;
  age_full?: number;
  death_date?: string;
  portrait_path?: string;
  portrait_alt?: string;
  relation_to_mourner?: string;
  bio_text?: string;
  events: Memorial["events"];
}

function mapRpcToMemorial(slug: string, r: RpcObituary): Memorial {
  return {
    id: slug,
    slug: r.slug,
    status: "published",
    testMode: false,
    accessLevel: r.access_level as Memorial["accessLevel"],
    noindex: r.noindex_flag,
    religionType: r.religion_type,
    funeralStyle: r.funeral_style,
    obituaryTitle: r.obituary_title || "訃報",
    obituaryBody: r.obituary_body || undefined,
    kodenDecline: r.koden_decline,
    flowerDecline: r.flower_decline,
    attendDecline: r.attend_decline,
    kodenAcceptUntil: r.koden_accept_until,
    offeringAcceptUntil: r.offering_accept_until,
    publishedAt: r.published_at,
    funeralHomeName: r.funeral_home_name,
    funeralHomeContact: { phone: r.fh_phone, email: r.fh_email },
    chiefMourner: r.announce_mourner_name
      ? { nameKanji: r.announce_mourner_name.replace(/^喪主\s*/, "") }
      : undefined,
    venue: r.venue ?? undefined,
    deceased: {
      nameKanji: r.name_kanji,
      nameKana: r.name_kana,
      ageKazoe: r.age_kazoe,
      ageFull: r.age_full,
      deathDate: r.death_date,
      portraitPath: r.portrait_path,
      portraitAlt: r.portrait_alt,
      relationToMourner: r.relation_to_mourner,
      bioText: r.bio_text,
    },
    events: r.events ?? [],
  };
}
