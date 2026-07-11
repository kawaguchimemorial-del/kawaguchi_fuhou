"use server";

import { randomUUID } from "crypto";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { VENUE_MASTER } from "@/lib/admin/venues";

// 既定の葬儀社（デモ）。TODO(auth): ログイン中ユーザーの funeral_home_id を使う。
const DEMO_FUNERAL_HOME_ID = "11111111-1111-1111-1111-111111111111";
const PHOTO_BUCKET = "product-images"; // 公開読取バケットを流用（遺影は portraits/ 配下）

/**
 * 遺影写真アップロード用の署名付きURLを発行する。
 * 実ファイルはブラウザから Supabase Storage へ直接アップロードするため、
 * Next.js Server Action(1MB) や Vercel関数(4.5MB) のボディ上限を回避できる。
 * 戻り値の path/token を使い、クライアントが uploadToSignedUrl で送信する。
 */
export async function createPortraitUploadUrl(
  ext: string
): Promise<{ ok: boolean; path?: string; token?: string; publicUrl?: string; error?: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return { ok: false, error: "Supabaseが未設定です。" };
  const clean = (ext || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!["jpg", "jpeg", "png"].includes(clean))
    return { ok: false, error: "JPGまたはPNG画像を選択してください。" };

  const path = `portraits/${DEMO_FUNERAL_HOME_ID}/${randomUUID()}.${clean}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as unknown as { storage: any };
  const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "アップロードURLの発行に失敗しました: " + (error?.message ?? "") };
  const { data: pub } = db.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return { ok: true, path: data.path ?? path, token: data.token, publicUrl: pub.publicUrl };
}

/**
 * 遺影写真URLを既存案件へ即時保存する（slug指定）。
 * フォーム全体の保存（guard）に依存せず、アップロード直後に確実に永続化するため。
 * publicUrl=null で遺影を削除。venue.altar / form_state / deceased.portrait_path を更新。
 */
export async function savePortrait(
  slug: string,
  publicUrl: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return { ok: false, error: "Supabaseが未設定です。" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as unknown as { from: (t: string) => any };
  const { data: mem, error } = await supabase
    .from("memorials")
    .select("id, venue, form_state")
    .eq("slug", slug)
    .single();
  if (error || !mem) return { ok: false, error: "対象の案件が見つかりません。" };

  // venue.altar.portraitPath（オンライン式場の祭壇遺影）
  const venue = mem.venue ?? null;
  if (venue) {
    venue.altar = venue.altar ?? {};
    if (publicUrl) venue.altar.portraitPath = publicUrl;
    else delete venue.altar.portraitPath;
  }
  // form_state.portraitPath（編集再開時のプレビュー復元用）
  const formState = (mem.form_state ?? {}) as Record<string, unknown>;
  formState.portraitPath = publicUrl ?? "";

  const { error: upErr } = await supabase
    .from("memorials")
    .update({ venue, form_state: formState })
    .eq("id", mem.id);
  if (upErr) return { ok: false, error: "保存に失敗しました: " + upErr.message };

  // 訃報側の遺影にも反映
  await supabase.from("deceased").update({ portrait_path: publicUrl }).eq("memorial_id", mem.id);
  return { ok: true };
}

/**
 * アルバム写真アップロード用の署名付きURLを発行する（遺影と同方式）。
 * ファイルはブラウザから Supabase Storage へ直接アップロードし、上限を回避。
 */
export async function createAlbumUploadUrl(
  ext: string
): Promise<{ ok: boolean; path?: string; token?: string; publicUrl?: string; error?: string }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return { ok: false, error: "Supabaseが未設定です。" };
  const clean = (ext || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!["jpg", "jpeg", "png"].includes(clean))
    return { ok: false, error: "JPGまたはPNG画像を選択してください。" };

  const path = `album/${DEMO_FUNERAL_HOME_ID}/${randomUUID()}.${clean}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as unknown as { storage: any };
  const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "アップロードURLの発行に失敗しました: " + (error?.message ?? "") };
  const { data: pub } = db.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return { ok: true, path: data.path ?? path, token: data.token, publicUrl: pub.publicUrl };
}

const MAX_ALBUM = 30;
type VenuePhotoField = "albumPaths" | "scenePaths";

/**
 * オンライン式場の写真一覧（アルバム／葬儀の様子）を既存案件へ即時保存する（slug指定）。
 * venue[field] と form_state[field] を更新。最大30枚。
 */
export async function saveVenuePhotos(
  slug: string,
  field: VenuePhotoField,
  paths: string[]
): Promise<{ ok: boolean; error?: string; paths?: string[] }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return { ok: false, error: "Supabaseが未設定です。" };
  if (field !== "albumPaths" && field !== "scenePaths")
    return { ok: false, error: "不正な保存先です。" };
  const clean = (Array.isArray(paths) ? paths : []).filter((p) => typeof p === "string" && p).slice(0, MAX_ALBUM);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as unknown as { from: (t: string) => any };
  const { data: mem, error } = await supabase
    .from("memorials")
    .select("id, venue, form_state")
    .eq("slug", slug)
    .single();
  if (error || !mem) return { ok: false, error: "対象の案件が見つかりません。" };

  const venue = mem.venue ?? null;
  if (!venue) return { ok: false, error: "この葬儀はオンライン式場が未設定のため、写真を登録できません。" };
  venue[field] = clean;

  const formState = (mem.form_state ?? {}) as Record<string, unknown>;
  formState[field] = clean;

  const { error: upErr } = await supabase
    .from("memorials")
    .update({ venue, form_state: formState })
    .eq("id", mem.id);
  if (upErr) return { ok: false, error: "保存に失敗しました: " + upErr.message };
  return { ok: true, paths: clean };
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
  estimateId?: string; // 紐づく見積(施行)ID。AI遺影の一意照合に使用。
  albumPaths?: string[]; // アルバム写真の公開URL一覧（別画面で管理。ウィザード保存時は温存）
  scenePaths?: string[]; // 葬儀の様子の写真の公開URL一覧（別画面で管理。ウィザード保存時は温存）
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
        albumPaths: (Array.isArray(p.albumPaths) ? p.albumPaths : []) as string[],
        scenePaths: (Array.isArray(p.scenePaths) ? p.scenePaths : []) as string[],
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
    estimate_id: p.estimateId || null,
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

// ISO日時 → JSTの日付(YYYY-MM-DD)・時刻(HH:MM)
function jstParts(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  const jst = new Date(d.getTime() + 9 * 3600 * 1000);
  return { date: jst.toISOString().slice(0, 10), time: jst.toISOString().slice(11, 16) };
}

// 正規化テーブル（memorial/deceased/event/venue）からウィザードのフォーム状態を復元。
// form_state が未保存/不完全な既存案件でも、編集時に現在の内容を表示できるようにする。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reconstructState(mem: any, dec: any, ev: any): Record<string, string> {
  const s: Record<string, string> = {};
  // 故人
  if (dec) {
    const [dSei, ...dMeiRest] = String(dec.name_kanji ?? "").split(/\s+/);
    if (dSei) s.dSei = dSei;
    if (dMeiRest.length) s.dMei = dMeiRest.join(" ");
    const [kSei, ...kMeiRest] = String(dec.name_kana ?? "").split(/\s+/);
    if (kSei) s.dSeiKana = kSei;
    if (kMeiRest.length) s.dMeiKana = kMeiRest.join(" ");
    if (dec.age_kazoe != null) s.ageKazoe = String(dec.age_kazoe);
    if (dec.death_date) s.deathDate = String(dec.death_date);
    if (dec.relation_to_mourner) s.relation = String(dec.relation_to_mourner);
  }
  // 喪主（正規化には氏名分割が無いため announce_mourner_name から推定）
  const announce = String(mem.announce_mourner_name ?? "").replace(/^喪主\s*/, "").trim();
  if (announce) {
    const [mSei, ...mMeiRest] = announce.split(/\s+/);
    if (mSei) s.mSei = mSei;
    if (mMeiRest.length) s.mMei = mMeiRest.join(" ");
    s.announceMourner = String(mem.announce_mourner_name ?? "");
  }
  // 訃報・香典
  if (mem.obituary_title) s.obituaryTitle = String(mem.obituary_title);
  if (mem.obituary_body) s.obituaryBody = String(mem.obituary_body);
  if (mem.religion_type) s.religion = String(mem.religion_type);
  s.kodenOption = mem.koden_decline ? "不要" : "必要";
  s.flowerAccept = mem.flower_decline ? "受け付けない" : "受け付ける";
  // 式1
  if (ev) {
    if (ev.event_type) s.eventType = String(ev.event_type);
    if (ev.datetime_label === "日程調整中") s.dateAdjusting = "1";
    const { date, time } = jstParts(ev.start_at);
    if (date) s.eventDate = date;
    if (time && time !== "00:00") s.startTime = time;
    const end = jstParts(ev.end_at);
    if (end.time && end.time !== "00:00") s.endTime = end.time;
    if (ev.venue_name || ev.venue_address) {
      const master = VENUE_MASTER.find((v) => v.name === ev.venue_name);
      if (master) { s.placeMode = "master"; s.venueId = master.id; }
      else {
        s.placeMode = "manual";
        if (ev.venue_name) s.venueName = String(ev.venue_name);
        if (ev.venue_address) s.venueAddress = String(ev.venue_address);
      }
    }
  }
  // オンライン式場（venue jsonb）
  const v = mem.venue;
  if (v) {
    if (v.venueName) s.venueOnlineName = String(v.venueName);
    if (v.greetingHeading) s.greetingHeading = String(v.greetingHeading);
    if (v.greetingBody) s.greetingBody = String(v.greetingBody);
    if (v.greetingSignature) s.greetingSign = String(v.greetingSignature);
    if (v.openFrom) s.openFrom = String(v.openFrom);
    if (v.openDays != null) s.openDays = String(v.openDays);
    s.mgmtNo = v.requireManagementNo ? "必要" : "不要";
    s.attendeeName = v.requireAttendeeName ? "必要" : "不要";
    s.showOfferings = v.showOfferings ? "表示する" : "表示しない";
    const a = v.altar ?? {};
    if (a.frame) s.frame = String(a.frame);
    if (a.sideFlower) s.side = String(a.sideFlower);
    if (a.center) s.center = String(a.center);
    if (a.top) s.top = String(a.top);
    if (a.background) s.background = String(a.background);
    if (a.portraitPath) s.portraitPath = String(a.portraitPath);
  }
  return s;
}

// 編集用：保存済みフォーム状態を取得（form_state を優先し、無い項目は実データから復元）
// 施行(見積)IDに紐づく既存の訃報(memorial)があれば、その slug を返す。
// 見積一覧から訃報作成する際、既存があれば新規でなく編集(上書き)に回すために使う。
export async function findMemorialSlugByEstimate(
  estimateId: string
): Promise<string | null> {
  if (!estimateId) return null;
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as unknown as { from: (t: string) => any };
  const { data } = await supabase
    .from("memorials")
    .select("slug")
    .eq("estimate_id", estimateId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const rows = (data ?? []) as { slug?: string }[];
  return rows[0]?.slug ?? null;
}

// estimate_id 未設定の既存訃報を「対象者(故人)名」で名寄せする。
// 見つかった場合はその memorial に estimate_id を補完(今後は施行で一意照合できるように)し、slug を返す。
// 誤照合を避けるため、対象は estimate_id が未設定の訃報のみ。
export async function findMemorialSlugByDeceasedName(
  deceasedName: string,
  estimateId: string
): Promise<string | null> {
  const target = (deceasedName || "").replace(/[\s　]/g, "");
  if (!target) return null;
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as unknown as { from: (t: string) => any };
  // estimate_id 未設定・未削除の訃報を新しい順に取得
  const { data: mems } = await supabase
    .from("memorials")
    .select("id, slug, created_at")
    .is("estimate_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (mems ?? []) as { id: string; slug: string }[];
  if (rows.length === 0) return null;
  const ids = rows.map((r) => r.id);
  const { data: decs } = await supabase
    .from("deceased")
    .select("memorial_id, name_kanji")
    .in("memorial_id", ids);
  const nameByMemorial = new Map<string, string>();
  for (const d of (decs ?? []) as { memorial_id: string; name_kanji?: string }[]) {
    nameByMemorial.set(d.memorial_id, (d.name_kanji ?? "").replace(/[\s　]/g, ""));
  }
  // 新しい順に走査し、対象者名が一致する最初の訃報を採用
  const hit = rows.find((r) => nameByMemorial.get(r.id) === target);
  if (!hit) return null;
  // 今後の一意照合のため estimate_id を補完(失敗しても編集導線は成立させる)
  try {
    await supabase.from("memorials").update({ estimate_id: estimateId }).eq("id", hit.id);
  } catch {
    /* 補完失敗は致命ではない */
  }
  return hit.slug;
}

export async function getCeremonyFormState(
  slug: string
): Promise<{ withVenue: boolean; isTest: boolean; state: Record<string, string> } | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const supabase = createAdminClient() as unknown as { from: (t: string) => any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mem, error } = await (supabase
    .from("memorials")
    .select("id, form_state, venue, obituary_title, obituary_body, announce_mourner_name, religion_type, koden_decline, flower_decline")
    .eq("slug", slug)
    .single() as any);
  if (error || !mem) return null;
  // 故人・式1を取得
  const [{ data: dec }, { data: evs }] = await Promise.all([
    supabase.from("deceased").select("*").eq("memorial_id", mem.id).maybeSingle(),
    supabase.from("funeral_events").select("*").eq("memorial_id", mem.id).order("start_at").limit(1),
  ]);
  const ev = Array.isArray(evs) ? evs[0] : evs;

  const reconstructed = reconstructState(mem, dec, ev);
  const fsRaw = (mem.form_state ?? {}) as Record<string, string> & { withVenue?: boolean; isTest?: boolean };
  // form_state を優先しつつ、欠けている項目は復元値で補完
  const merged: Record<string, string> = { ...reconstructed };
  for (const [k, val] of Object.entries(fsRaw)) {
    if (val !== "" && val != null) merged[k] = val as string;
  }
  // アルバム／葬儀の様子は form_state に無い旧案件でも venue から取り込み、ウィザード保存で消えないようにする。
  const vj = mem.venue as { albumPaths?: unknown; scenePaths?: unknown } | null;
  if (vj) {
    if (merged.albumPaths == null && Array.isArray(vj.albumPaths))
      (merged as Record<string, unknown>).albumPaths = vj.albumPaths;
    if (merged.scenePaths == null && Array.isArray(vj.scenePaths))
      (merged as Record<string, unknown>).scenePaths = vj.scenePaths;
  }
  return {
    withVenue: Boolean(fsRaw.withVenue ?? mem.venue != null),
    isTest: Boolean(fsRaw.isTest),
    state: merged,
  };
}
