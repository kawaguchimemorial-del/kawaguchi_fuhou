"use server";

import { randomUUID } from "crypto";
import sharp from "sharp";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { VENUE_MASTER } from "@/lib/admin/venues";

// 既定の葬儀社（デモ）。TODO(auth): ログイン中ユーザーの funeral_home_id を使う。
const DEMO_FUNERAL_HOME_ID = "11111111-1111-1111-1111-111111111111";
const PHOTO_BUCKET = "product-images"; // 公開読取バケットを流用（遺影は portraits/ 配下）
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB上限

/** 遺影写真アップロード（jpg/png、5MBまで）。WebP最適化して公開URLを返す。 */
export async function uploadPortrait(
  formData: FormData
): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return { ok: false, error: "Supabaseが未設定です。" };
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "ファイルが選択されていません。" };
  if (!["image/jpeg", "image/png"].includes(file.type))
    return { ok: false, error: "JPGまたはPNG画像を選択してください。" };
  if (file.size > MAX_PHOTO_BYTES)
    return { ok: false, error: "画像は5MBまでです。サイズの小さい画像をお選びください。" };

  // 遺影は縦長表示。長辺1200pxに収め WebP 化（高画質）。
  const original = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(original)
    .rotate() // EXIF回転を反映
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  const path = `portraits/${DEMO_FUNERAL_HOME_ID}/${randomUUID()}.webp`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as unknown as { storage: any };
  const { error } = await db.storage
    .from(PHOTO_BUCKET)
    .upload(path, optimized, { contentType: "image/webp", upsert: false });
  if (error) return { ok: false, error: "アップロードに失敗しました: " + error.message };
  const { data } = db.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

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
  portraitPath?: string; // 遺影写真の公開URL
}

// フォーム状態(payload) → DB各テーブルの行へ変換（create/updateで共通利用）
function buildRows(p: CeremonyPayload) {
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
          portraitPath: p.portraitPath || undefined, // 遺影写真
        },
      }
    : null;

  const memorial = {
    religion_type: p.religion || "仏式",
    koden_decline: p.kodenOption === "不要",
    flower_decline: p.flowerAccept === "受け付けない",
    obituary_title: p.obituaryTitle || "訃報",
    obituary_body: p.obituaryBody || null,
    announce_mourner_name: p.announceMourner || null,
    venue: venueJson,
    form_state: p as unknown as Record<string, unknown>, // 編集で完全復元するため丸ごと保存
  };
  const deceased = {
    name_kanji: [p.dSei, p.dMei].filter(Boolean).join(" "),
    name_kana: [p.dSeiKana, p.dMeiKana].filter(Boolean).join(" ") || null,
    age_kazoe: p.ageKazoe ? Number(p.ageKazoe) : null,
    death_date: p.deathDate || null,
    relation_to_mourner: p.relation || null,
  };
  const event = {
    event_type: p.eventType || "通夜式",
    start_at: startAt,
    end_at: endAt,
    datetime_label: p.dateAdjusting === "1" ? "日程調整中" : null,
    venue_name: venueName,
    venue_address: venueAddress,
    map_url: mapUrl,
  };
  return { memorial, deceased, event };
}

function guard(p: CeremonyPayload): string | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return "Supabaseが未設定です（環境変数を確認してください）。";
  if (!p.dSei && !p.dMei) return "故人のお名前をご入力ください。";
  return null;
}

// 新規作成
export async function createCeremony(p: CeremonyPayload): Promise<CreateResult> {
  const err = guard(p);
  if (err) return { ok: false, error: err };

  const supabase = createAdminClient() as unknown as { from: (t: string) => any };
  const slug = randomUUID().replace(/-/g, "");
  const memorialId = randomUUID();
  const { memorial, deceased, event } = buildRows(p);

  const { error: mErr } = await supabase.from("memorials").insert({
    id: memorialId,
    funeral_home_id: DEMO_FUNERAL_HOME_ID,
    slug,
    status: "published",
    access_level: "unlisted",
    noindex_flag: true,
    published_at: new Date().toISOString(),
    ...memorial,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (mErr) return { ok: false, error: "保存に失敗しました: " + mErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dErr } = await supabase.from("deceased").insert({ memorial_id: memorialId, ...deceased } as any);
  if (dErr) return { ok: false, error: "故人情報の保存に失敗: " + dErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: eErr } = await supabase.from("funeral_events").insert({ memorial_id: memorialId, ...event } as any);
  if (eErr) return { ok: false, error: "式情報の保存に失敗: " + eErr.message };

  return { ok: true, slug };
}

// 既存案件の更新（slug指定）
export async function updateCeremony(slug: string, p: CeremonyPayload): Promise<CreateResult> {
  const err = guard(p);
  if (err) return { ok: false, error: err };

  const supabase = createAdminClient() as unknown as { from: (t: string) => any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mem, error: findErr } = await (supabase.from("memorials").select("id").eq("slug", slug).single() as any);
  if (findErr || !mem) return { ok: false, error: "対象の案件が見つかりません。" };
  const memorialId = mem.id as string;
  const { memorial, deceased, event } = buildRows(p);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: mErr } = await (supabase.from("memorials").update(memorial as any).eq("id", memorialId) as any);
  if (mErr) return { ok: false, error: "更新に失敗しました: " + mErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("deceased").update(deceased as any).eq("memorial_id", memorialId) as any);
  // 式は単純化のため一旦削除して入れ直し（式1のみ管理）
  await supabase.from("funeral_events").delete().eq("memorial_id", memorialId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase.from("funeral_events").insert({ memorial_id: memorialId, ...event } as any);

  return { ok: true, slug };
}

// 編集用：保存済みフォーム状態を取得
export async function getCeremonyFormState(
  slug: string
): Promise<{ withVenue: boolean; isTest: boolean; state: Record<string, string> } | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const supabase = createAdminClient() as unknown as { from: (t: string) => any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("memorials").select("form_state,venue").eq("slug", slug).single() as any);
  if (error || !data) return null;
  const fs = (data.form_state ?? {}) as Record<string, string> & { withVenue?: boolean; isTest?: boolean };
  return {
    withVenue: Boolean(fs.withVenue ?? data.venue != null),
    isTest: Boolean(fs.isTest),
    state: fs as Record<string, string>,
  };
}
