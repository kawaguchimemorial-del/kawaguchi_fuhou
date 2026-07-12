"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCeremony, updateCeremony, createPortraitUploadUrl, savePortrait, type CeremonyPayload } from "@/lib/admin/actions";
import { createClient } from "@/lib/supabase/client";

// 遺影画像の保存先バケット（公開読取）。署名付きURLでブラウザから直接アップロード。
const PHOTO_BUCKET = "product-images";
import { toWareki, toWarekiDate } from "@/lib/wareki";
import { render } from "@/lib/template";
import { VENUE_MASTER } from "@/lib/admin/venues";
import { FRAME_KEYS, frameImageSrc, normalizeFrameKey } from "@/lib/memorial/altar-frames";
import { backgroundSrc, topSrc, sideFlowerSrc, centerSrc } from "@/lib/memorial/altar-assets";
import { AltarView } from "@/components/guest/AltarView";
import {
  OBITUARY_TEMPLATES,
  GREETING_TEMPLATES,
  defaultVenueName,
} from "@/lib/memorial/copy-templates";

// 作成ウィザード（5ステップ／状態保持・入力補助つき）
// TODO(supabase): 最終保存で memorials/deceased/funeral_events/venue 等へINSERT。
const STEPS = ["喪主／故人", "訃報・香典", "記帳", "供花・供物", "オンライン式場"];
const EVENT_TYPES = ["通夜式", "告別式", "葬儀告別式", "一日葬", "お別れの会", "火葬式"];
const SIDE = ["黒", "白", "花(1)", "花(2)"];
const CENTERS = ["焼香(黒)", "焼香(白)", "線香(1本)", "線香(2本)", "線香(3本)", "花(1)", "花(2)", "非表示"];
const BACKGROUNDS = ["七宝", "菊", "波", "ドレープ(ベージュ)", "ドレープ(ピンク)"];

type State = Record<string, string | boolean>;

type FlowerProduct = { id: string; name: string; type: string; priceJpy: number };
export function CeremonyWizard({
  withVenue,
  isTest,
  editSlug,
  initialState,
  focusStep,
  flowerProducts = [],
}: {
  withVenue: boolean;
  isTest: boolean;
  editSlug?: string; // 指定時は編集モード（更新）
  initialState?: State;
  focusStep?: number; // 指定時はそのステップのみ編集（セクション個別編集）
  flowerProducts?: FlowerProduct[];
}) {
  const singleStep = focusStep != null;
  const [step, setStep] = useState(focusStep ?? 0);
  const last = withVenue ? 4 : 2;
  const [s, setS] = useState<State>({
    religion: "仏式",
    eventType: "通夜式",
    placeMode: "master", // master | manual
    venueId: VENUE_MASTER[0]?.id ?? "",
    kodenOption: "必要",
    returnGift: "必要",
    publishImmediately: "1",
    openDays: "60",
    frame: "黒",
    side: "黒",
    center: "焼香(黒)",
    top: "黒",
    background: "七宝",
    ...(initialState ?? {}), // 編集時は保存済みフォーム状態で上書き
  });
  const set = (k: string, v: string | boolean) => setS((p) => ({ ...p, [k]: v }));
  const g = (k: string) => (s[k] as string) ?? "";
  // 表示する供花・供物の選択(空=全表示)
  const selectedFlowerIds: string[] = Array.isArray(s.flowerProductIds) ? (s.flowerProductIds as unknown as string[]) : [];
  const toggleFlower = (id: string) => setS((p) => {
    const cur = Array.isArray(p.flowerProductIds) ? (p.flowerProductIds as unknown as string[]) : [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    return { ...p, flowerProductIds: next as unknown as string };
  });

  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleSave() {
    setSaveError(null);
    const announce = g("announceMourner") || (mournerFull ? `喪主 ${mournerFull}` : "");
    const payload: CeremonyPayload = {
      withVenue,
      isTest,
      dSei: g("dSei"), dMei: g("dMei"), dSeiKana: g("dSeiKana"), dMeiKana: g("dMeiKana"),
      deathDate: g("deathDate"), deathTime: g("deathTime"), ageKazoe: g("ageKazoe"), relation: g("relation"),
      obituaryTitle: g("obituaryTitle"), obituaryBody: g("obituaryBody"), announceMourner: announce, religion: g("religion"),
      eventType: g("eventType"), dateAdjusting: g("dateAdjusting"), eventDate: g("eventDate"), startTime: g("startTime"), endTime: g("endTime"),
      placeMode: g("placeMode"), venueId: g("venueId"), venueName: g("venueName"), venuePostal: g("venuePostal"), venueAddress: g("venueAddress"),
      kodenOption: g("kodenOption"), flowerAccept: g("flowerAccept"), flowerDeadline: g("flowerDeadline"),
      flowerProductIds: Array.isArray(s.flowerProductIds) ? (s.flowerProductIds as unknown as string[]) : undefined,
      venueOnlineName: g("venueOnlineName") || defaultVenueName(deceasedFull),
      greetingHeading: g("greetingHeading") || "喪主挨拶", greetingBody: g("greetingBody"),
      greetingSign: g("greetingSign") || (mournerFull ? `喪主 ${mournerFull}` : ""),
      publishImmediately: g("publishImmediately"), openFrom: g("openFrom"), openDays: g("openDays"),
      mgmtNo: g("mgmtNo"), attendeeName: g("attendeeName"), showOfferings: g("showOfferings"),
      frame: g("frame"), side: g("side"), center: g("center"), top: g("top"), background: g("background"),
      portraitPath: g("portraitPath"),
      estimateId: g("estimateId") || undefined, // 紐づく見積(施行)ID
      // アルバム／葬儀の様子は専用画面で管理。ウィザード保存で消えないよう既存値を温存。
      albumPaths: Array.isArray(s.albumPaths) ? (s.albumPaths as unknown as string[]) : undefined,
      scenePaths: Array.isArray(s.scenePaths) ? (s.scenePaths as unknown as string[]) : undefined,
    };
    startSave(async () => {
      const res = editSlug
        ? await updateCeremony(editSlug, payload)
        : await createCeremony(payload);
      if (res.ok) router.push(`/admin/ceremonies/${res.slug}`);
      else setSaveError(res.error);
    });
  }

  // 派生値
  const deceasedFull = [g("dSei"), g("dMei")].filter(Boolean).join(" ");
  const deceasedKana = [g("dSeiKana"), g("dMeiKana")].filter(Boolean).join(" ");
  const mournerFull = [g("mSei"), g("mMei")].filter(Boolean).join(" ");
  const tvars = useMemo(
    () => ({
      故人続柄: g("relation"),
      故人名: deceasedFull,
      故人カナ: deceasedKana,
      没年月日和暦: toWarekiDate(g("deathDate")),
      没時刻: g("deathTime"),
      享年: g("ageKazoe"),
      喪主名: mournerFull,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s]
  );

  return (
    <div className="mx-auto max-w-3xl">
      {isTest && <p className="mb-4 rounded bg-red-100 px-4 py-2 text-sm text-red-700">テスト葬儀として作成します（無料）</p>}

      {!singleStep && (
      <ol className="mb-8 flex items-center justify-between text-xs">
        {STEPS.slice(0, last + 1).map((label, i) => (
          <li key={label} className="flex flex-1 items-center">
            <span className={"flex h-7 w-7 items-center justify-center rounded-full text-white " + (i <= step ? "bg-[#9b2fae]" : "bg-gray-300")}>{i + 1}</span>
            <span className="ml-2 hidden sm:inline">{label}</span>
            {i < last && <span className="mx-2 h-px flex-1 bg-gray-300" />}
          </li>
        ))}
      </ol>
      )}
      {singleStep && (
        <p className="mb-4 text-sm text-gray-500">「{STEPS[focusStep!]}」を編集しています。</p>
      )}

      <div className="rounded-lg bg-white p-6 shadow-sm">
        {step === 0 && <StepMourner g={g} set={set} />}
        {step === 1 && <StepObituary g={g} set={set} tvars={tvars} mournerFull={mournerFull} />}
        {step === 2 && <StepGuestbook />}
        {step === 3 && <StepFlowers g={g} set={set} flowerProducts={flowerProducts} selectedIds={selectedFlowerIds} toggle={toggleFlower} />}
        {step === 4 && <StepVenue g={g} set={set} tvars={tvars} deceasedFull={deceasedFull} mournerFull={mournerFull} editSlug={editSlug} />}
      </div>

      <div className="mt-6 flex justify-between">
        {singleStep ? (
          <>
            <a href={editSlug ? `/admin/ceremonies/${editSlug}` : "/admin/ceremonies"} className="rounded border px-6 py-2.5 text-sm">← 戻る</a>
            <button onClick={handleSave} disabled={saving} className="rounded bg-[#9b2fae] px-6 py-2.5 text-sm text-white disabled:opacity-60">
              {saving ? "保存中…" : "この内容で更新"}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setStep((x) => Math.max(0, x - 1))} disabled={step === 0} className="rounded border px-6 py-2.5 text-sm disabled:opacity-40">← 前に戻る</button>
            {step < last ? (
              <button onClick={() => setStep((x) => Math.min(last, x + 1))} className="rounded bg-[#9b2fae] px-6 py-2.5 text-sm text-white">保存して次へ →</button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="rounded bg-[#9b2fae] px-6 py-2.5 text-sm text-white disabled:opacity-60">
                {saving ? "保存中…" : editSlug ? "更新して保存 →" : "保存して公開する →"}
              </button>
            )}
          </>
        )}
      </div>
      {saveError && <p className="mt-4 rounded bg-red-50 px-4 py-2 text-sm text-red-700">{saveError}</p>}
    </div>
  );
}

// ---- 共通UI ----
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-3 border-l-4 border-[#9b2fae] pl-2 font-bold">{title}</legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
function Req() {
  return <span className="ml-1 text-xs text-red-500">必須</span>;
}
function Text({ label, k, g, set, required, placeholder, type = "text" }: { label: string; k: string; g: (k: string) => string; set: (k: string, v: string) => void; required?: boolean; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}{required && <Req />}</span>
      <input type={type} value={g(k)} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} className="mt-1 w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" />
    </label>
  );
}
function Pills({ label, k, options, g, set, required }: { label: string; k: string; options: string[]; g: (k: string) => string; set: (k: string, v: string) => void; required?: boolean }) {
  const cur = g(k) || options[0];
  return (
    <div>
      <p className="text-sm text-gray-600">{label}{required && <Req />}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button type="button" key={o} onClick={() => set(k, o)} className={"rounded border px-3 py-1.5 text-sm " + (cur === o ? "border-[#9b2fae] bg-[#f3e9f6]" : "")}>{o}</button>
        ))}
      </div>
    </div>
  );
}

// 額縁選択（透過PNGの見本画像をクリックして選択）
function FramePicker({ g, set }: { g: (k: string) => string; set: (k: string, v: string) => void }) {
  const cur = normalizeFrameKey(g("frame"));
  return (
    <div>
      <p className="text-sm text-gray-600">額縁<Req /></p>
      <div className="mt-2 flex flex-wrap gap-3">
        {FRAME_KEYS.map((key) => {
          const selected = cur === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => set("frame", key)}
              aria-pressed={selected}
              className={
                "flex flex-col items-center rounded border p-1.5 text-xs " +
                (selected ? "border-[#9b2fae] bg-[#f3e9f6]" : "border-gray-200 hover:border-gray-300")
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frameImageSrc(key)}
                alt={`額縁 ${key}`}
                className="h-16 w-12 object-contain"
              />
              <span className={"mt-1 " + (selected ? "text-[#9b2fae]" : "text-gray-500")}>{key}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 汎用：見本画像をクリックして選択（花飾り・祭壇中央・天板・背景で共用）
function ImagePicker({
  label,
  k,
  options,
  srcOf,
  g,
  set,
  imgClass = "h-14 w-14 object-contain",
}: {
  label: string;
  k: string;
  options: string[];
  srcOf: (v: string) => string;
  g: (k: string) => string;
  set: (k: string, v: string) => void;
  imgClass?: string;
}) {
  const cur = g(k) || options[0];
  return (
    <div>
      <p className="text-sm text-gray-600">{label}<Req /></p>
      <div className="mt-2 flex flex-wrap gap-3">
        {options.map((o) => {
          const selected = cur === o;
          return (
            <button
              type="button"
              key={o}
              onClick={() => set(k, o)}
              aria-pressed={selected}
              className={
                "flex flex-col items-center rounded border p-1.5 text-xs " +
                (selected ? "border-[#9b2fae] bg-[#f3e9f6]" : "border-gray-200 hover:border-gray-300")
              }
            >
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#f3f3f3_0_25%,#fff_0_50%)] bg-[length:12px_12px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={srcOf(o)} alt={`${label} ${o}`} className={imgClass} />
              </span>
              <span className={"mt-1 " + (selected ? "text-[#9b2fae]" : "text-gray-500")}>{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- ステップ1: 喪主／故人 ----
function StepMourner({ g, set }: { g: (k: string) => string; set: (k: string, v: string) => void }) {
  return (
    <>
      <Sec title="喪主">
        <div className="grid grid-cols-2 gap-4">
          <Text label="姓" k="mSei" g={g} set={set} required />
          <Text label="名" k="mMei" g={g} set={set} required />
          <Text label="セイ" k="mSeiKana" g={g} set={set} required />
          <Text label="メイ" k="mMeiKana" g={g} set={set} required />
        </div>
      </Sec>
      <Sec title="喪主管理画面ログインIDの発行">
        <p className="text-xs text-gray-500">※オンライン香典を受け付ける場合、ここの電話/メール宛に口座情報の連絡を行います。</p>
        <Pills label="発行方法" k="idMethod" options={["自動ID（電話番号）", "メールアドレス"]} g={g} set={set} />
        <Text label="電話番号（ハイフンなし）/ メールアドレス" k="idContact" g={g} set={set} />
      </Sec>
      <Sec title="故人">
        <div className="grid grid-cols-2 gap-4">
          <Text label="姓" k="dSei" g={g} set={set} required />
          <Text label="名" k="dMei" g={g} set={set} required />
          <Text label="セイ" k="dSeiKana" g={g} set={set} required />
          <Text label="メイ" k="dMeiKana" g={g} set={set} required />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Text label="没年月日" k="deathDate" g={g} set={set} type="date" />
          <Text label="没時間" k="deathTime" g={g} set={set} type="time" />
          <Text label="享年" k="ageKazoe" g={g} set={set} type="number" />
          <Text label="喪主との続柄" k="relation" g={g} set={set} placeholder="父" />
        </div>
        {g("deathDate") && (
          <p className="text-xs text-gray-500">没日（和暦）：{toWarekiDate(g("deathDate"))}{g("deathTime") ? ` ${g("deathTime")}` : ""}</p>
        )}
      </Sec>
    </>
  );
}

// ---- ステップ2: 訃報・香典 ----
function StepObituary({ g, set, tvars, mournerFull }: { g: (k: string) => string; set: (k: string, v: string) => void; tvars: Record<string, string>; mournerFull: string }) {
  const announce = g("announceMourner") || (mournerFull ? `喪主 ${mournerFull}` : "");
  return (
    <>
      <Sec title="訃報案内">
        <Text label="訃報タイトル" k="obituaryTitle" g={g} set={set} placeholder="訃報" />
        <div>
          <p className="text-sm text-gray-600">訃報文テンプレート</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {OBITUARY_TEMPLATES.map((t) => (
              <button type="button" key={t.id} onClick={() => set("obituaryBody", render(t.body, tvars))} className="rounded border px-3 py-1.5 text-sm hover:bg-[#f3e9f6]">{t.label}を適用</button>
            ))}
            <span className="text-xs text-gray-400">※ 入力済みの故人・喪主・没日（和暦）が自動で反映されます</span>
          </div>
          <textarea rows={7} value={g("obituaryBody")} onChange={(e) => set("obituaryBody", e.target.value)} className="mt-2 w-full rounded border p-3 focus:border-[#9b2fae] focus:outline-none" placeholder="テンプレートを適用するか、直接ご入力ください。" />
        </div>
        <label className="block">
          <span className="text-sm text-gray-600">訃報を案内される喪主名<Req /></span>
          <input value={announce} onChange={(e) => set("announceMourner", e.target.value)} className="mt-1 w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" placeholder="喪主名（前ステップの喪主名を自動表示）" />
          <span className="text-xs text-gray-400">※ 喪主氏名から自動表示。必要に応じて編集できます。</span>
        </label>
        <Pills label="喪式形式" k="religion" options={["仏式", "神式", "キリスト教式", "無宗教"]} g={g} set={set} />
      </Sec>

      <Sec title="式1">
        <Pills label="式名" k="eventType" options={EVENT_TYPES} g={g} set={set} required />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={g("dateAdjusting") === "1"} onChange={(e) => set("dateAdjusting", e.target.checked ? "1" : "")} /> 日程調整中</label>
        {g("dateAdjusting") !== "1" && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Text label="式日" k="eventDate" g={g} set={set} type="date" />
              <Text label="開始時刻" k="startTime" g={g} set={set} type="time" />
              <Text label="終了時刻" k="endTime" g={g} set={set} type="time" />
            </div>
            {g("eventDate") && <p className="text-xs text-gray-500">式日（和暦）：{toWareki(g("eventDate"))} {g("startTime")}{g("endTime") ? `〜${g("endTime")}` : ""}</p>}
          </>
        )}
        <VenuePicker g={g} set={set} />
      </Sec>

      {/* 香典決済・返礼品は今回非対応のため非表示 */}
    </>
  );
}

// 会館選択（マスタから選ぶ→なければ手入力）
function VenuePicker({ g, set }: { g: (k: string) => string; set: (k: string, v: string) => void }) {
  const mode = g("placeMode") || "master";
  return (
    <div>
      <p className="text-sm text-gray-600">場所（式場）</p>
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="radio" name="placeMode" checked={mode === "master"} onChange={() => set("placeMode", "master")} /> 登録式場から選ぶ</label>
        <label className="flex items-center gap-1"><input type="radio" name="placeMode" checked={mode === "manual"} onChange={() => set("placeMode", "manual")} /> その他（手入力）</label>
      </div>
      {mode === "master" ? (
        <select value={g("venueId")} onChange={(e) => set("venueId", e.target.value)} className="mt-2 w-full rounded border px-3 py-2">
          {VENUE_MASTER.map((v) => (
            <option key={v.id} value={v.id}>{v.name}（{v.address}）</option>
          ))}
        </select>
      ) : (
        <div className="mt-2 space-y-3">
          <Text label="会館・ホール名" k="venueName" g={g} set={set} />
          <Text label="郵便番号" k="venuePostal" g={g} set={set} placeholder="3330833" />
          <Text label="住所" k="venueAddress" g={g} set={set} />
        </div>
      )}
    </div>
  );
}

function StepGuestbook() {
  return (
    <Sec title="記帳設定">
      <p className="text-xs text-gray-500">※ お悔やみメッセージは既定で承認制（公開前にご遺族が確認）。</p>
    </Sec>
  );
}

function StepFlowers({ g, set, flowerProducts, selectedIds, toggle }: { g: (k: string) => string; set: (k: string, v: string) => void; flowerProducts: FlowerProduct[]; selectedIds: string[]; toggle: (id: string) => void }) {
  const flowers = flowerProducts.filter((p) => p.type === "供花");
  const offerings = flowerProducts.filter((p) => p.type === "供物");
  const Group = ({ title, items }: { title: string; items: FlowerProduct[] }) => (
    items.length === 0 ? null : (
      <div className="mt-3">
        <p className="mb-1 text-sm font-bold text-gray-600">{title}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((p) => (
            <label key={p.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={selectedIds.includes(p.id)} onChange={() => toggle(p.id)} />
              <span className="flex-1">{p.name}</span>
              <span className="text-xs text-gray-500">{p.priceJpy.toLocaleString()}円</span>
            </label>
          ))}
        </div>
      </div>
    )
  );
  return (
    <Sec title="供花・供物">
      <Pills label="供花・供物の受付" k="flowerAccept" options={["受け付ける", "受け付けない"]} g={g} set={set} />
      <Text label="供花 受付終了日時" k="flowerDeadline" g={g} set={set} type="datetime-local" />
      <div className="mt-4 rounded border border-dashed border-[#9b2fae] bg-[#faf5fb] p-3">
        <p className="text-sm font-bold text-gray-700">表示する供花・供物を選択</p>
        <p className="mt-0.5 text-xs text-gray-500">葬儀の規模に合わせて、この訃報で表示する商品にチェックを入れてください。<b>未選択の場合は全商品を表示</b>します。</p>
        {flowerProducts.length === 0 ? (
          <p className="mt-2 text-xs text-gray-400">商品が未登録です（設定 › 供花・供物の設定・商品登録）。</p>
        ) : (
          <>
            <Group title="供花" items={flowers} />
            <Group title="供物" items={offerings} />
            <p className="mt-2 text-xs text-gray-500">選択中: {selectedIds.length === 0 ? "全商品を表示" : `${selectedIds.length} 件`}</p>
          </>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">※ 商品マスタは「設定 › 供花・供物の設定・商品登録」で管理します。</p>
    </Sec>
  );
}

// 遺影写真アップロード（jpg/png・5MBまで）。オンライン式場の祭壇に表示される。
const MAX_PORTRAIT_MB = 5;
function PortraitUpload({ g, set, editSlug }: { g: (k: string) => string; set: (k: string, v: string) => void; editSlug?: string }) {
  const current = g("portraitPath");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [applyingAi, setApplyingAi] = useState(false);

  // AI遺影写真（手札）を祭壇の遺影に反映する。
  // 施行(見積)IDで一意照合(同姓同名でも誤マッチしない)。無ければ対象者名でフォールバック。
  async function applyAiPortrait() {
    setError(null);
    const estimateId = g("estimateId");
    const name = [g("dSei"), g("dMei")].filter(Boolean).join(" ").trim();
    setApplyingAi(true);
    try {
      let d: { found?: boolean; tefudaUrl?: string | null; imageUrl?: string | null } = { found: false };
      // 1) 施行(見積)で一意照合
      if (estimateId) {
        d = await (await fetch(`/api/iei-photo/for-estimate?estimate_id=${encodeURIComponent(estimateId)}`)).json();
      }
      // 2) フォールバック: 対象者名で照合
      if (!d.found && name) {
        d = await (await fetch(`/api/iei-photo/for-deceased?name=${encodeURIComponent(name)}`)).json();
      }
      if (!d.found) {
        setError(estimateId || name ? `この施行に紐づくAI遺影写真が見つかりません。先にAI遺影写真を作成してください。` : "先に故人名を入力するか、見積から作成してください。");
        return;
      }
      const url = (d.tefudaUrl || d.imageUrl) as string | null;
      if (!url) { setError("AI遺影写真の画像URLがありません。"); return; }
      const finalUrl = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      set("portraitPath", finalUrl);
      setSaved(false);
      if (editSlug) {
        const sv = await savePortrait(editSlug, finalUrl);
        if (sv.ok) setSaved(true);
        else setError("反映の保存に失敗しました: " + (sv.error ?? ""));
      } else {
        setSaved(true);
      }
    } catch (err) {
      setError("AI遺影の反映に失敗しました。" + (err instanceof Error ? `（${err.message}）` : ""));
    } finally {
      setApplyingAi(false);
    }
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("JPGまたはPNG画像を選択してください。");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PORTRAIT_MB * 1024 * 1024) {
      setError(`画像は${MAX_PORTRAIT_MB}MBまでです。サイズの小さい画像をお選びください。`);
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      // 1) サーバーで署名付きアップロードURLを発行（ファイルは送らないので上限回避）
      const ext = file.type === "image/png" ? "png" : "jpg";
      const sig = await createPortraitUploadUrl(ext);
      if (!sig.ok || !sig.path || !sig.token || !sig.publicUrl) {
        setError(sig.error ?? "アップロードURLの発行に失敗しました。");
        return;
      }
      // 2) ブラウザから Supabase Storage へ直接アップロード
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .uploadToSignedUrl(sig.path, sig.token, file, { contentType: file.type });
      if (upErr) {
        setError("アップロードに失敗しました: " + upErr.message);
        return;
      }
      // 3) 新しい写真のみ反映（キャッシュ無効化のためクエリ付与）
      const finalUrl = `${sig.publicUrl}?v=${Date.now()}`;
      set("portraitPath", finalUrl);
      setSaved(false);
      // 4) 編集中の案件なら、フォーム全体の保存を待たずに遺影だけ即時保存
      if (editSlug) {
        const sv = await savePortrait(editSlug, finalUrl);
        if (sv.ok) setSaved(true);
        else setError("写真の保存に失敗しました: " + (sv.error ?? ""));
      } else {
        setSaved(true); // 新規作成時は「保存して公開」で確定
      }
    } catch (err) {
      setError("アップロード中にエラーが発生しました。" + (err instanceof Error ? `（${err.message}）` : ""));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-600">遺影写真（JPG / PNG・5MBまで）</p>
      <p className="text-xs text-gray-400">アップロードした写真がオンライン式場の祭壇に表示されます。</p>
      <div className="mt-2 flex items-start gap-4">
        <div className="flex h-40 w-32 shrink-0 items-center justify-center overflow-hidden rounded border bg-gray-50">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="遺影プレビュー" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400">未設定</span>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <label className="inline-block cursor-pointer rounded border border-[#9b2fae] px-4 py-2 text-sm text-[#9b2fae]">
              {uploading ? "アップロード中…" : current ? "写真を変更" : "写真を選択"}
              <input type="file" accept="image/jpeg,image/png" onChange={onChange} disabled={uploading} className="hidden" />
            </label>
            <button
              type="button"
              onClick={applyAiPortrait}
              disabled={applyingAi || uploading}
              className="inline-flex items-center rounded bg-[#2c8c6f] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {applyingAi ? "反映中…" : "AI遺影写真を反映"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">「AI遺影写真を反映」は、対象者名で一致するAI遺影の手札を祭壇に設定します。</p>
          {current && (
            <button
              type="button"
              onClick={async () => {
                set("portraitPath", "");
                setSaved(false);
                if (editSlug) await savePortrait(editSlug, null);
              }}
              className="block text-xs text-gray-500 underline"
            >
              写真を削除
            </button>
          )}
          {saved && current && !error && (
            <p className="text-xs text-green-600">
              {editSlug ? "保存しました（オンライン式場に反映されます）" : "アップロードしました"}
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ---- ステップ5: オンライン式場 ----
function StepVenue({ g, set, tvars, deceasedFull, mournerFull, editSlug }: { g: (k: string) => string; set: (k: string, v: string) => void; tvars: Record<string, string>; deceasedFull: string; mournerFull: string; editSlug?: string }) {
  const venueName = g("venueOnlineName") || defaultVenueName(deceasedFull);
  const greetingHeading = g("greetingHeading") || "喪主挨拶";
  const greetingSign = g("greetingSign") || (mournerFull ? `喪主 ${mournerFull}` : "");
  return (
    <>
      <Sec title="オンライン式名">
        <label className="block">
          <span className="text-sm text-gray-600">オンライン式名<Req /></span>
          <input value={venueName} onChange={(e) => set("venueOnlineName", e.target.value)} className="mt-1 w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" />
          <span className="text-xs text-gray-400">※ 故人名から「故 ●● 儀　オンライン葬儀会場」を自動表示。編集可。</span>
        </label>
      </Sec>
      <Sec title="オンライン式場挨拶文">
        <label className="block">
          <span className="text-sm text-gray-600">見出し<Req /></span>
          <input value={greetingHeading} onChange={(e) => set("greetingHeading", e.target.value)} className="mt-1 w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" placeholder="喪主挨拶" />
          <span className="text-xs text-gray-400">※ 既定で「喪主挨拶」。必要に応じて編集できます。</span>
        </label>
        <div>
          <p className="text-sm text-gray-600">挨拶文テンプレート</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {GREETING_TEMPLATES.map((t) => (
              <button type="button" key={t.id} onClick={() => set("greetingBody", render(t.body, tvars))} className="rounded border px-3 py-1.5 text-sm hover:bg-[#f3e9f6]">{t.label}を適用</button>
            ))}
          </div>
          <textarea rows={6} value={g("greetingBody")} onChange={(e) => set("greetingBody", e.target.value)} className="mt-2 w-full rounded border p-3 focus:border-[#9b2fae] focus:outline-none" />
        </div>
        <label className="block">
          <span className="text-sm text-gray-600">挨拶文右下の喪主名<Req /></span>
          <input value={greetingSign} onChange={(e) => set("greetingSign", e.target.value)} className="mt-1 w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" placeholder="喪主 ●● ●●" />
          <span className="text-xs text-gray-400">※ 喪主氏名から自動表示。必要に応じて編集できます。</span>
        </label>
      </Sec>
      <Sec title="公開日時">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s_bool(g, "publishImmediately")} onChange={(e) => set("publishImmediately", e.target.checked ? "1" : "")} /> 喪主の同意後、すぐに公開する</label>
        <div className="grid grid-cols-2 gap-4">
          <Text label="公開開始" k="openFrom" g={g} set={set} type="datetime-local" />
          <Text label="公開期間（1〜60日）" k="openDays" g={g} set={set} type="number" placeholder="60" />
        </div>
      </Sec>
      <Sec title="入場画面の表示・入力制御">
        <Pills label="管理番号" k="mgmtNo" options={["不要", "必要"]} g={g} set={set} />
        <Pills label="参列者名" k="attendeeName" options={["不要", "必要"]} g={g} set={set} />
        <Pills label="供花・供物の表示" k="showOfferings" options={["表示しない", "表示する"]} g={g} set={set} />
      </Sec>
      <Sec title="祭壇設定（レイヤー）">
        <PortraitUpload g={g} set={set} editSlug={editSlug} />
        {/* 選択中のレイヤーを合成したプレビュー（実際のオンライン式場と同じ見え方） */}
        <div>
          <p className="text-sm text-gray-600">プレビュー</p>
          <div className="mt-2 rounded border bg-white p-2">
            <AltarView
              altar={{
                frame: g("frame") || "黒",
                sideFlower: g("side") || "黒",
                center: g("center") || "焼香(黒)",
                top: g("top") || "黒",
                background: g("background") || "七宝",
                portraitPath: g("portraitPath") || undefined,
              }}
            />
          </div>
        </div>
        <FramePicker g={g} set={set} />
        <ImagePicker label="花飾り（左右）" k="side" options={SIDE} srcOf={sideFlowerSrc} g={g} set={set} />
        <ImagePicker label="祭壇（中央）" k="center" options={CENTERS} srcOf={centerSrc} g={g} set={set} />
        <ImagePicker label="天板" k="top" options={["黒", "木目"]} srcOf={topSrc} g={g} set={set} imgClass="h-10 w-14 object-contain" />
        <ImagePicker label="背景" k="background" options={BACKGROUNDS} srcOf={backgroundSrc} g={g} set={set} imgClass="h-14 w-11 object-cover" />
      </Sec>
    </>
  );
}

function s_bool(g: (k: string) => string, k: string): boolean {
  return g(k) === "1" || g(k) === "true";
}
