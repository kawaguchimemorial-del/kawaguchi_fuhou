"use server";

import { randomUUID } from "crypto";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { VENUE_MASTER } from "@/lib/admin/venues";

// 既定の葬儀社（デモ）。TODO(auth): ログイン中ユーザーの funeral_home_id を使う。
const DEMO_FUNERAL_HOME_ID = "11111111-1111-1111-1111-111111111111";

export type CreateResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export interface CeremonyPayload {
  withVenue: boolean;
  isTest: boolean;
  // 故人
  dSei?: string; dMei?: string; dSeiKana?: string; dMeiKana?: string;
  deathDate?: string; deathTime?: string; ageKazoe?: string; relation?: string;
  // 訃報
  obituaryTitle?: string; obituaryBody?: string; announceMourner?: string; religion?: string;
  // 式1
  eventType?: string; dateAdjusting?: string; eventDate?: string; startTime?: string; endTime?: string;
  placeMode?: string; venueId?: string; venueName?: string; venuePostal?: string; venueAddress?: string;
  // 香典/供花
  kodenOption?: string; flowerAccept?: string;
  // オンライン式場
  venueOnlineName?: string; greetingHeading?: string; greetingBody?: string; greetingSign?: string;
  publishImmediately?: string; openFrom?: string; openDays?: string;
  mgmtNo?: string; attendeeName?: string; showOfferings?: string;
  frame?: string; side?: string; center?: string; top?: string; background?: string;
}

export async function createCeremony(p: CeremonyPayload): Promise<CreateResult> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Supabaseが未設定です（環境変数を確認してください）。" };
  }
  if (!p.dSei && !p.dMei) {
    return { ok: false, error: "故人のお名前をご入力ください。" };
  }

  const supabase = createAdminClient();
  const slug = randomUUID().replace(/-/g, "");
  const memorialId = randomUUID();

  // 会場（マスタ選択 or 手入力）を解決
  let venueName = p.venueName ?? null;
  let venueAddress = p.venueAddress ?? null;
  let mapUrl: string | null = null;
  if (p.placeMode !== "manual") {
    const v = VENUE_MASTER.find((x) => x.id === p.venueId) ?? VENUE_MASTER[0];
    if (v) {
      venueName = v.name;
      venueAddress = v.address;
      mapUrl = `https://maps.google.com/?q=${encodeURIComponent(v.address)}`;
    }
  }

  const deathDate = p.deathDate || null;
  const startAt =
    p.dateAdjusting !== "1" && p.eventDate
      ? new Date(`${p.eventDate}T${p.startTime || "00:00"}:00+09:00`).toISOString()
      : null;
  const endAt =
    p.dateAdjusting !== "1" && p.eventDate && p.endTime
      ? new Date(`${p.eventDate}T${p.endTime}:00+09:00`).toISOString()
      : null;

  const venueJson = p.withVenue
    ? {
        venueName: p.venueOnlineName ?? "",
        greetingHeading: p.greetingHeading ?? "喪主挨拶",
        greetingBody: p.greetingBody ?? "",
        greetingSignature: p.greetingSign ?? "",
        openFrom: p.openFrom || null,
        openDays: Number(p.openDays) || 60,
        requireManagementNo: p.mgmtNo === "必要",
        requireAttendeeName: p.attendeeName === "必要",
        showOfferings: p.showOfferings === "表示する",
        albumPaths: [] as string[],
        altar: {
          frame: p.frame ?? "黒",
          sideFlower: p.side ?? "黒",
          center: p.center ?? "焼香(黒)",
          top: p.top ?? "黒",
          background: p.background ?? "七宝",
        },
      }
    : null;

  // 1) memorial
  const { error: mErr } = await supabase.from("memorials").insert({
    id: memorialId,
    funeral_home_id: DEMO_FUNERAL_HOME_ID,
    slug,
    status: "published", // デモ: すぐ閲覧できるよう公開
    access_level: "unlisted",
    noindex_flag: true,
    religion_type: p.religion || "仏式",
    koden_decline: p.kodenOption === "不要",
    flower_decline: p.flowerAccept === "受け付けない",
    obituary_title: p.obituaryTitle || "訃報",
    obituary_body: p.obituaryBody || null,
    announce_mourner_name: p.announceMourner || null,
    venue: venueJson,
    published_at: new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (mErr) return { ok: false, error: "保存に失敗しました: " + mErr.message };

  // 2) deceased
  const { error: dErr } = await supabase.from("deceased").insert({
    memorial_id: memorialId,
    name_kanji: [p.dSei, p.dMei].filter(Boolean).join(" "),
    name_kana: [p.dSeiKana, p.dMeiKana].filter(Boolean).join(" ") || null,
    age_kazoe: p.ageKazoe ? Number(p.ageKazoe) : null,
    death_date: deathDate,
    relation_to_mourner: p.relation || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (dErr) return { ok: false, error: "故人情報の保存に失敗: " + dErr.message };

  // 3) funeral_event（式1）
  const { error: eErr } = await supabase.from("funeral_events").insert({
    memorial_id: memorialId,
    event_type: p.eventType || "通夜式",
    start_at: startAt,
    end_at: endAt,
    datetime_label: p.dateAdjusting === "1" ? "日程調整中" : null,
    venue_name: venueName,
    venue_address: venueAddress,
    map_url: mapUrl,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (eErr) return { ok: false, error: "式情報の保存に失敗: " + eErr.message };

  return { ok: true, slug };
}
