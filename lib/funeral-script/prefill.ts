/**
 * 顧客・施行（見積）の登録内容から、司会台本フォームの初期値を作る。
 *
 * 台本作成のたびに生年月日や没日を手入力し直すのは二度手間で、
 * 打ち間違いがそのままナレーションの事実誤りになる。
 * 既に登録されている情報は、台本画面を開いた時点で埋まっている状態にする。
 *
 * 方針:
 * - 埋めるのは「登録済みの事実」だけ。無い項目は空のままにして、推測で補わない。
 * - 表記は司会者が読み上げる形（和暦・「午前十時」形式）に整える。
 */

import type { Estimate } from "@/lib/kanri/estimates";
import type { FuneralScriptCeremonyType, FuneralScriptFormData } from "./types";

/** 元号の切り替わり（その日から新元号）。 */
const ERAS: { name: string; from: string; baseYear: number }[] = [
  { name: "令和", from: "2019-05-01", baseYear: 2018 },
  { name: "平成", from: "1989-01-08", baseYear: 1988 },
  { name: "昭和", from: "1926-12-25", baseYear: 1925 },
  { name: "大正", from: "1912-07-30", baseYear: 1911 },
  { name: "明治", from: "1868-01-25", baseYear: 1867 },
];

/**
 * "YYYY-MM-DD"（または ISO 日時）を和暦の「昭和30年3月19日」形式にする。
 * 元号が判定できない・日付として読めない場合は西暦のまま返す。
 */
export function toJapaneseEraDate(value?: string | null): string {
  if (!value) return "";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const [, ys, ms, ds] = m;
  const ymd = `${ys}-${ms}-${ds}`;
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);
  const era = ERAS.find((e) => ymd >= e.from);
  if (!era) return `${year}年${month}月${day}日`;
  const eraYear = year - era.baseYear;
  // 元年は「1年」ではなく「元年」と読む
  const label = eraYear === 1 ? "元" : String(eraYear);
  return `${era.name}${label}年${month}月${day}日`;
}

/**
 * ISO 日時（DBはUTC保存）を JST の「午前十時三十分」形式にする。
 * 分が 0 のときは「午前十時」と省く。
 */
export function toSpokenTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const jst = new Date(d.getTime() + 9 * 3600 * 1000);
  const h24 = jst.getUTCHours();
  const min = jst.getUTCMinutes();
  const period = h24 < 12 ? "午前" : "午後";
  // 12時台は「午後12時」ではなく「午後0時」と読むのが通例。0時台は「午前0時」。
  const h12 = h24 % 12;
  return min === 0 ? `${period}${h12}時` : `${period}${h12}時${min}分`;
}

/** 見積の宗教区分 → 台本の式種別。判定できなければ undefined（画面の選択を尊重する）。 */
function ceremonyTypeFromReligion(
  religion?: string,
): FuneralScriptCeremonyType | undefined {
  const r = (religion ?? "").trim();
  if (!r) return undefined;
  if (r.includes("無宗教")) return "non_religious_funeral";
  if (r.includes("仏")) return "buddhist_funeral";
  return undefined;
}

/** 姓名を全角スペース区切りで結合（片方だけでも可）。 */
function joinName(last?: string, first?: string): string {
  return [last, first].filter((v) => v && v.trim()).join("　");
}

export type FuneralScriptPrefill = Partial<FuneralScriptFormData> & {
  /** 画面で「どこから何を取り込んだか」を伝えるための説明 */
  filledLabels: string[];
};

/**
 * 見積（施行）から台本フォームの初期値を組み立てる。
 * 通夜・告別式の両方がある場合は「通夜・告別式」の台本として扱う。
 */
export function prefillFromEstimate(e: Estimate): FuneralScriptPrefill {
  const out: Partial<FuneralScriptFormData> = {};
  const labels: string[] = [];

  const deceasedName = joinName(e.deceased.lastName, e.deceased.firstName);
  if (deceasedName) {
    out.deceasedName = deceasedName;
    labels.push("対象者名");
  }

  const birthDate = toJapaneseEraDate(e.deceased.birthDate);
  if (birthDate) {
    out.birthDate = birthDate;
    labels.push("生年月日");
  }

  const deathDate = toJapaneseEraDate(e.deceased.deathDate);
  if (deathDate) {
    out.deathDate = deathDate;
    labels.push("没日");
  }

  if (e.deceased.age != null) {
    out.age = String(e.deceased.age);
    labels.push("行年");
  }

  const chiefMourner = joinName(e.mourner.lastName, e.mourner.firstName);
  if (chiefMourner) {
    out.chiefMournerName = chiefMourner;
    labels.push("喪主名");
  }

  if (e.mourner.relation?.trim()) {
    out.relationshipToChiefMourner = e.mourner.relation.trim();
    labels.push("続柄");
  }

  if (e.venueName?.trim()) {
    out.venueName = e.venueName.trim();
    labels.push("式場");
  }

  // 開式時刻は告別式を優先。告別式が未設定なら通夜の時刻を使う。
  const startTime = toSpokenTime(e.funeralAt) || toSpokenTime(e.wakeAt);
  if (startTime) {
    out.startTime = startTime;
    labels.push("開式時刻");
  }

  // 仏式で通夜・告別式の両方が登録されていれば、1つの台本に両日を収める型にする。
  const byReligion = ceremonyTypeFromReligion(e.religion);
  const ceremonyType =
    byReligion === "buddhist_funeral" && e.wakeAt && e.funeralAt
      ? "buddhist_wake_funeral"
      : byReligion;
  if (ceremonyType) {
    out.ceremonyType = ceremonyType;
    labels.push("式種別");
  }

  return { ...out, filledLabels: labels };
}
