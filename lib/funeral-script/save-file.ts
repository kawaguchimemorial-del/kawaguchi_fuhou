/**
 * 台本の保存ファイル（通夜→告別式の引き継ぎ）入出力。
 *
 * 方針:
 * - サーバー保存・DB なし。ブラウザ完結で 1 案件 = 1 ファイル（JSON）。
 * - 通夜台本をファイルに書き出し、翌日に読み込んで告別式台本へ引き継ぐ。
 * - 将来 DB 化する場合も、この中身（form + sections）をそのまま 1 レコードに移せる。
 */

import {
  FUNERAL_SCRIPT_FILE_KIND,
  FUNERAL_SCRIPT_FILE_VERSION,
} from "./types";
import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
  FuneralScriptSavedFile,
  FuneralScriptSection,
} from "./types";

/** ファイル名に使えない文字を除いた短い案件名（故人名）を作る */
function safeName(deceasedName: string): string {
  const trimmed = deceasedName.trim().replace(/[\\/:*?"<>|\s]+/g, "_");
  return trimmed ? trimmed.slice(0, 24) : "故人";
}

/** YYYYMMDD（保存日） */
function dateStamp(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** 書き出すファイル名（例: 葬儀台本_山田太郎_20260617.json） */
export function buildSavedFileName(
  form: FuneralScriptFormData,
  now: Date,
): string {
  return `葬儀台本_${safeName(form.deceasedName)}_${dateStamp(now)}.json`;
}

/** form + sections を保存ファイルの JSON 文字列にする */
export function serializeSavedFile(
  form: FuneralScriptFormData,
  sections: FuneralScriptSection[],
  now: Date,
  originalLetter?: FuneralScriptOriginalLetter | null,
): string {
  const payload: FuneralScriptSavedFile = {
    kind: FUNERAL_SCRIPT_FILE_KIND,
    version: FUNERAL_SCRIPT_FILE_VERSION,
    savedAt: now.toISOString(),
    form,
    sections,
    originalLetter: originalLetter ?? null,
  };
  return JSON.stringify(payload, null, 2);
}

export type ParseSavedFileResult =
  | { ok: true; data: FuneralScriptSavedFile }
  | { ok: false; error: string };

/** 読み込んだテキストを検証して保存ファイルとして取り出す */
export function parseSavedFile(text: string): ParseSavedFileResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "ファイルを読み取れませんでした（JSON 形式ではありません）。" };
  }

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "台本ファイルの形式が正しくありません。" };
  }

  const obj = raw as Partial<FuneralScriptSavedFile>;
  if (obj.kind !== FUNERAL_SCRIPT_FILE_KIND) {
    return {
      ok: false,
      error: "この機能で書き出した台本ファイルではないようです。",
    };
  }
  if (
    typeof obj.form !== "object" ||
    obj.form === null ||
    typeof (obj.form as FuneralScriptFormData).deceasedName !== "string" ||
    !Array.isArray(obj.sections)
  ) {
    return { ok: false, error: "台本ファイルの中身が壊れています。" };
  }

  return {
    ok: true,
    data: {
      kind: FUNERAL_SCRIPT_FILE_KIND,
      version: typeof obj.version === "number" ? obj.version : 0,
      savedAt: typeof obj.savedAt === "string" ? obj.savedAt : "",
      form: obj.form as FuneralScriptFormData,
      sections: obj.sections as FuneralScriptSection[],
      originalLetter:
        "originalLetter" in obj
          ? (obj.originalLetter as FuneralScriptOriginalLetter | null)
          : null,
    },
  };
}
