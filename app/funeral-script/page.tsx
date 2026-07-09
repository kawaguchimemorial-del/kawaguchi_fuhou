"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FuneralScriptForm, {
  FUNERAL_FORM_SECTIONS,
} from "@/components/funeral-script/FuneralScriptForm";
import FuneralScriptFileControls from "@/components/funeral-script/FuneralScriptFileControls";
import FuneralScriptAiControls from "@/components/funeral-script/FuneralScriptAiControls";
import FuneralScriptOriginalLetterPanel from "@/components/funeral-script/FuneralScriptOriginalLetterPanel";
import FuneralScriptPreview from "@/components/funeral-script/FuneralScriptPreview";
import FuneralScriptPrintView from "@/components/funeral-script/FuneralScriptPrintView";
import FuneralScriptToolbar from "@/components/funeral-script/FuneralScriptToolbar";
import { cn } from "@/lib/simulatorUtils";
import { createPdfBlobFromElement, downloadPdfBlob } from "@/lib/pdf";
import { generateFuneralScript } from "@/lib/funeral-script/generator";
import {
  buildOriginalCondolenceLetter,
  originalLetterToPrintText,
} from "@/lib/funeral-script/original-letter";
import {
  buildSavedFileName,
  serializeSavedFile,
} from "@/lib/funeral-script/save-file";
import {
  CEREMONY_TYPE_LABELS,
  defaultFormData,
  sectionsToPlainText,
} from "@/lib/funeral-script/format";
import type {
  FuneralScriptCeremonyType,
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
  FuneralScriptSection,
  GenerateNarrationResponse,
  GenerateOriginalLetterResponse,
} from "@/lib/funeral-script/types";

const AI_GENERIC_ERROR =
  "AI生成に失敗しました。固定テンプレートの台本はそのまま利用できます。";

type WorkspaceView = "form" | "script" | "letter";
type PdfShareData = {
  files?: File[];
};
type FileShareNavigator = Navigator & {
  share?: (data: PdfShareData) => Promise<void>;
  canShare?: (data: PdfShareData) => boolean;
};

// 印刷用CSS（共有 globals.css は変更せず、本ページ内に閉じる）
const PRINT_CSS = `
.fs-print-root { display: none; }
.fs-pdf-root {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 794px;
  min-height: 1123px;
  overflow: visible;
  background: #ffffff;
  color: #0f172a;
  pointer-events: none;
}
@page { size: A4; margin: 16mm 14mm; }
@media print {
  html, body { background: #ffffff !important; }
  .no-print { display: none !important; }
  .fs-pdf-root { display: none !important; }
  .fs-print-root { display: block !important; }
  .fs-print-root { width: auto; margin: 0; padding: 0; }
  .fs-heading { break-after: avoid; page-break-after: avoid; }
  .fs-section.avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .fs-section { break-inside: auto; orphans: 3; widows: 3; }
  .fs-letter-page { break-before: page; page-break-before: always; }
}
`;

function safeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

function buildScriptPdfFileName(form: FuneralScriptFormData): string {
  const name = safeFileNamePart(form.deceasedName || "未入力");
  return `葬儀司会台本_${name}.pdf`;
}

function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iP(hone|ad|od)/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function createPdfFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: "application/pdf" });
}

function canSharePdf(blob: Blob, filename: string): boolean {
  if (typeof navigator === "undefined" || typeof File === "undefined") {
    return false;
  }
  const nav = navigator as FileShareNavigator;
  if (typeof nav.share !== "function") return false;
  const file = createPdfFile(blob, filename);
  return typeof nav.canShare === "function"
    ? nav.canShare({ files: [file] })
    : true;
}

async function writeClipboardText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export default function FuneralScriptPage() {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FuneralScriptFormData>(() =>
    defaultFormData("buddhist_funeral"),
  );
  const [activeView, setActiveView] = useState<WorkspaceView>("form");
  // PC: 会葬礼状ON時に台本と礼状を並べて表示するか（既定OFF＝全幅1カラム）
  const [compareMode, setCompareMode] = useState(false);
  const [sections, setSections] = useState<FuneralScriptSection[]>([]);
  const [copied, setCopied] = useState(false);
  const [letterCopied, setLetterCopied] = useState(false);
  const [originalLetter, setOriginalLetter] =
    useState<FuneralScriptOriginalLetter | null>(null);

  // AIナレーション生成の状態
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  // AI生成前のセクション退避（「AI生成前に戻す」用）
  const [preAiSections, setPreAiSections] = useState<
    FuneralScriptSection[] | null
  >(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [letterWarnings, setLetterWarnings] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState("葬儀司会台本.pdf");
  const [pdfShareAvailable, setPdfShareAvailable] = useState(false);

  // 顧客/施行/既存台本の紐付け（一覧・作成導線から引き継ぐ）
  const [scriptCtx, setScriptCtx] = useState<{
    customerId?: string;
    estimateId?: string;
    scriptId?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const clearPdfResult = useCallback(() => {
    setPdfError(null);
    setPdfUrl(null);
    setPdfBlob(null);
    setPdfShareAvailable(false);
  }, []);

  const handleChange = useCallback(
    (patch: Partial<FuneralScriptFormData>) => {
      setForm((prev) => ({ ...prev, ...patch }));
      clearPdfResult();
      if (patch.hasOriginalCondolenceLetter === false) {
        setLetterError(null);
        setLetterWarnings([]);
        setLetterCopied(false);
        setActiveView((prev) => (prev === "letter" ? "form" : prev));
      }
    },
    [clearPdfResult],
  );

  // 式種別変更時は、その式に推奨の進行オプション既定値へ更新（入力済みテキストは保持）
  const handleCeremonyTypeChange = useCallback(
    (ceremonyType: FuneralScriptCeremonyType) => {
      const d = defaultFormData(ceremonyType);
      setForm((prev) => ({
        ...prev,
        ceremonyType,
        hasCondolenceAddress: d.hasCondolenceAddress,
        hasTelegram: d.hasTelegram,
        hasChiefMournerGreeting: d.hasChiefMournerGreeting,
        hasMemorialService: d.hasMemorialService,
        hasFarewellPreparation: d.hasFarewellPreparation,
        hasDeparture: d.hasDeparture,
        hasCrematoriumGuidance: d.hasCrematoriumGuidance,
        hasFlowerOffering: d.hasFlowerOffering,
        hasCandleOffering: d.hasCandleOffering,
        hasSilentPrayer: d.hasSilentPrayer,
      }));
    },
    [],
  );

  const handleGenerate = useCallback(() => {
    setSections(generateFuneralScript(form));
    if (form.hasOriginalCondolenceLetter) {
      setOriginalLetter((prev) => prev ?? buildOriginalCondolenceLetter(form));
      setLetterError(null);
      setLetterWarnings([]);
    } else {
      setOriginalLetter(null);
      setLetterError(null);
      setLetterWarnings([]);
    }
    setCopied(false);
    setLetterCopied(false);
    // テンプレート再生成時はAI状態をリセット
    setPreAiSections(null);
    setAiError(null);
    setAiWarnings([]);
    clearPdfResult();
    setActiveView("script");
  }, [clearPdfResult, form]);

  // AI生成対象（ai_placeholder）の id 一覧
  const aiTargetIds = useMemo(
    () =>
      sections.filter((s) => s.kind === "ai_placeholder").map((s) => s.id),
    [sections],
  );
  const hasAiGenerated = useMemo(
    () => sections.some((s) => s.aiGenerated),
    [sections],
  );

  const handleGenerateAi = useCallback(async () => {
    if (aiTargetIds.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    // AI生成前のスナップショットを一度だけ退避（プレースホルダー基準を保持）
    setPreAiSections((prev) => prev ?? sections);

    try {
      const res = await fetch("/api/funeral-script/generate-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form,
          sections,
          targetSectionIds: aiTargetIds,
        }),
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        const message =
          (data as { error?: string })?.error || AI_GENERIC_ERROR;
        setAiError(message);
        setAiWarnings([]);
        return;
      }

      const ok = data as GenerateNarrationResponse;
      const generatedById = new Map(ok.sections.map((s) => [s.id, s]));
      // 返ってきた id に対応する ai_placeholder の本文だけ置換（固定部分は触れない）
      setSections((prev) =>
        prev.map((section) => {
          const g = generatedById.get(section.id);
          if (g && section.kind === "ai_placeholder") {
            return {
              ...section,
              body: g.body,
              note: undefined,
              aiGenerated: true,
            };
          }
          return section;
        }),
      );
      setAiWarnings(ok.warnings ?? []);
      setCopied(false);
    } catch {
      // 入力本文はログ出力しない
      setAiError(AI_GENERIC_ERROR);
    } finally {
      setAiLoading(false);
    }
  }, [aiTargetIds, sections, form]);

  const handleRevertAi = useCallback(() => {
    if (!preAiSections) return;
    setSections(preAiSections);
    setPreAiSections(null);
    setAiWarnings([]);
    setAiError(null);
    setCopied(false);
  }, [preAiSections]);

  // 台本をファイルに書き出す（通夜→告別式の引き継ぎ用）
  const handleSaveFile = useCallback(() => {
    const json = serializeSavedFile(
      form,
      sections,
      new Date(),
      form.hasOriginalCondolenceLetter ? originalLetter : null,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildSavedFileName(form, new Date());
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [form, sections, originalLetter]);

  // 保存ファイルを読み込み、form と sections を復元
  const handleLoadFile = useCallback(
    (
      loadedForm: FuneralScriptFormData,
      loadedSections: FuneralScriptSection[],
      loadedOriginalLetter?: FuneralScriptOriginalLetter | null,
    ) => {
      const normalizedForm = {
        ...defaultFormData(loadedForm.ceremonyType),
        ...loadedForm,
      };
      setForm(normalizedForm);
      setSections(loadedSections);
      setOriginalLetter(
        loadedOriginalLetter ??
          (normalizedForm.hasOriginalCondolenceLetter
            ? buildOriginalCondolenceLetter(normalizedForm)
            : null),
      );
      setPreAiSections(null);
      setAiError(null);
      setAiWarnings([]);
      setLetterError(null);
      setLetterWarnings([]);
      setCopied(false);
      setLetterCopied(false);
      clearPdfResult();
      setActiveView(loadedSections.length > 0 ? "script" : "form");
    },
    [clearPdfResult],
  );

  // 台本を保存する: PCにダウンロード ＋ サーバー保存 ＋ 一覧へ（AI遺影と同方針）
  const handleSaveToList = useCallback(async () => {
    if (sections.length === 0) return;
    const name = form.deceasedName.trim();
    if (!name) {
      setSaveMessage({
        ok: false,
        text: "対象者（故人）名を入力してください。保存には氏名が必要です。",
      });
      return;
    }
    // 1) PCに保存（引き継ぎファイルをダウンロード）
    handleSaveFile();
    // 2) サーバー保存＋一覧
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/funeral-script/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: scriptCtx.scriptId,
          customerId: scriptCtx.customerId,
          estimateId: scriptCtx.estimateId,
          deceasedName: name,
          form,
          sections,
          originalLetter: form.hasOriginalCondolenceLetter
            ? originalLetter
            : null,
        }),
      });
      const data: { ok?: boolean; id?: string; error?: string } =
        await res.json();
      if (!res.ok || !data.ok) {
        setSaveMessage({
          ok: false,
          text:
            data.error ||
            "サーバー保存に失敗しました。PCへのダウンロードは完了しています。",
        });
      } else {
        if (data.id) setScriptCtx((p) => ({ ...p, scriptId: data.id }));
        setSaveMessage({
          ok: true,
          text: "保存しました（PCにダウンロード＋一覧に保存）。",
        });
      }
    } catch {
      setSaveMessage({
        ok: false,
        text: "サーバー保存に失敗しました。PCへのダウンロードは完了しています。",
      });
    } finally {
      setSaving(false);
    }
  }, [sections, form, originalLetter, scriptCtx, handleSaveFile]);

  // 作成導線/一覧からの引き継ぎ（URLパラメータ）を反映
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const scriptId = sp.get("script_id") ?? undefined;
    const customerId = sp.get("customer_id") ?? undefined;
    const estimateId = sp.get("estimate_id") ?? undefined;
    const deceased = (sp.get("deceased") ?? "").trim();
    setScriptCtx({ customerId, estimateId, scriptId });
    if (scriptId) {
      (async () => {
        try {
          const res = await fetch(`/api/funeral-script/${scriptId}`);
          const data: {
            ok?: boolean;
            content?: {
              form: FuneralScriptFormData;
              sections: FuneralScriptSection[];
              originalLetter?: FuneralScriptOriginalLetter | null;
            };
          } = await res.json();
          if (res.ok && data.content) {
            handleLoadFile(
              data.content.form,
              data.content.sections,
              data.content.originalLetter ?? null,
            );
          }
        } catch {
          /* 読み込み失敗時は空のフォームのまま */
        }
      })();
    } else if (deceased) {
      setForm((prev) => ({ ...prev, deceasedName: deceased }));
    }
    // 初回マウント時のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditBody = useCallback((id: string, body: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, body } : section,
      ),
    );
    clearPdfResult();
  }, [clearPdfResult]);

  const handleEditLetterBody = useCallback((body: string) => {
    setOriginalLetter((prev) =>
      prev
        ? {
            ...prev,
            body,
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );
    setLetterCopied(false);
    clearPdfResult();
  }, [clearPdfResult]);

  const handleGenerateLetter = useCallback(async () => {
    if (!form.hasOriginalCondolenceLetter) return;
    const current = originalLetter ?? buildOriginalCondolenceLetter(form);
    setOriginalLetter(current);
    setLetterLoading(true);
    setLetterError(null);

    try {
      const res = await fetch("/api/funeral-script/generate-original-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, currentLetter: current }),
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        const message =
          (data as { error?: string })?.error ||
          "オリジナル会葬礼状の再生成に失敗しました。現在の本文はそのまま編集できます。";
        setLetterError(message);
        setLetterWarnings([]);
        return;
      }

      const ok = data as GenerateOriginalLetterResponse;
      setOriginalLetter(ok.letter);
      setLetterWarnings(ok.warnings ?? []);
      setLetterCopied(false);
    } catch {
      setLetterError(
        "オリジナル会葬礼状の再生成に失敗しました。現在の本文はそのまま編集できます。",
      );
    } finally {
      setLetterLoading(false);
    }
  }, [form, originalLetter]);

  const handleCopy = useCallback(async () => {
    const blocks = [
      sectionsToPlainText(sections, {
        ceremonyType: form.ceremonyType,
        deceasedName: form.deceasedName,
      }),
    ];
    if (form.hasOriginalCondolenceLetter && originalLetter) {
      blocks.push(originalLetterToPrintText(form, originalLetter));
    }
    const text = blocks.join("\n\n────────────────\n\n");
    try {
      await writeClipboardText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 本文には個人情報が含まれ得るため、内容はログ出力しない
      setCopied(false);
    }
  }, [sections, form, originalLetter]);

  const handleCopyLetter = useCallback(async () => {
    if (!originalLetter) return;
    try {
      await writeClipboardText(originalLetterToPrintText(form, originalLetter));
      setLetterCopied(true);
      window.setTimeout(() => setLetterCopied(false), 2000);
    } catch {
      setLetterCopied(false);
    }
  }, [form, originalLetter]);

  const handleCreatePdf = useCallback(async () => {
    if (sections.length === 0 || !pdfRef.current || pdfLoading) return;

    const filename = buildScriptPdfFileName(form);
    const previewWindow = isAppleTouchDevice()
      ? window.open("", "_blank")
      : null;
    if (previewWindow) {
      previewWindow.document.write(
        "<!doctype html><html><head><title>PDF作成中</title><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body style=\"font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;line-height:1.7;color:#0f172a\"><p>PDFを作成しています。</p><p>完了するとこの画面にPDFを表示します。</p></body></html>",
      );
      previewWindow.document.close();
    }

    setPdfFileName(filename);
    setPdfLoading(true);
    setPdfError(null);

    try {
      const blob = await createPdfBlobFromElement(pdfRef.current);
      const url = isAppleTouchDevice()
        ? URL.createObjectURL(blob)
        : downloadPdfBlob(blob, filename);
      setPdfUrl(url);
      setPdfBlob(blob);
      setPdfShareAvailable(canSharePdf(blob, filename));
      if (previewWindow) {
        previewWindow.location.href = url;
      }
    } catch {
      if (previewWindow) {
        previewWindow.close();
      }
      setPdfError(
        "PDF作成に失敗しました。本文をコピーして印刷会社へ渡すか、時間をおいて再度お試しください。",
      );
    } finally {
      setPdfLoading(false);
    }
  }, [form, pdfLoading, sections.length]);

  const handleSharePdf = useCallback(async () => {
    if (!pdfBlob) {
      setPdfError("先にPDFを作成してください。");
      return;
    }
    const nav = navigator as FileShareNavigator;
    if (typeof nav.share !== "function") {
      setPdfError("このブラウザでは共有保存を利用できません。PDFを開くから保存してください。");
      return;
    }

    const file = createPdfFile(pdfBlob, pdfFileName);
    if (typeof nav.canShare === "function" && !nav.canShare({ files: [file] })) {
      setPdfError("この端末ではPDFファイル共有を利用できません。PDFを開くから保存してください。");
      return;
    }

    try {
      await nav.share({ files: [file] });
      setPdfError(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setPdfError("共有保存を開始できませんでした。PDFを開くから保存してください。");
    }
  }, [pdfBlob, pdfFileName]);

  const handleOpenPdf = useCallback(() => {
    if (!pdfUrl) return;
    const opened = window.open(pdfUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      setPdfError("PDFを開けませんでした。ブラウザのポップアップ設定をご確認ください。");
    }
  }, [pdfUrl]);

  const hasScript = sections.length > 0;
  const hasLetter = form.hasOriginalCondolenceLetter;
  // PCで台本と礼状を左右に並べるか（礼状ONかつトグルON時のみ有効）
  const compareOn = compareMode && hasLetter;
  const deceasedLabel = form.deceasedName.trim() || "故人名未入力";

  // 入力進捗（台本の土台になる主要項目の充足率）
  const progressFields = [
    form.deceasedName,
    form.age,
    form.birthDate,
    form.deathDate,
    form.birthPlace,
    form.venueName,
    form.startTime,
    form.chiefMournerName,
    form.relationshipToChiefMourner,
    form.hobbies,
    form.personality,
    form.episodes,
    form.portraitPhotoDescription,
    form.workDescription || form.career,
    form.familyStructure,
  ];
  const progressFilled = progressFields.filter((v) => v?.trim()).length;
  const progressPct = Math.round(
    (progressFilled / progressFields.length) * 100,
  );
  const hasFuneralDay = form.ceremonyType !== "buddhist_wake";
  const navSections = FUNERAL_FORM_SECTIONS.filter(
    (s) => !s.funeralOnly || hasFuneralDay,
  );
  const [activeStepId, setActiveStepId] = useState("fs-basic");
  const scrollToSection = useCallback((id: string) => {
    setActiveStepId(id);
    setActiveView("form");
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) el.open = true;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const profileCount = [
    form.hobbies,
    form.personality,
    form.episodes,
    form.portraitPhotoDescription,
    form.workDescription || form.career,
    form.familyStructure,
  ].filter((value) => value?.trim()).length;
  const mobileTabs: { id: WorkspaceView; label: string; status: string }[] = [
    {
      id: "form",
      label: "入力",
      status: `${profileCount}/6`,
    },
    {
      id: "script",
      label: "台本",
      status: hasScript ? `${sections.length}項目` : "未生成",
    },
    {
      id: "letter",
      label: "礼状",
      status: hasLetter ? (originalLetter ? "作成済" : "未生成") : "任意",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:pb-10">
      <style>{PRINT_CSS}</style>

      {/* 画面表示（印刷時は非表示） */}
      <div className="no-print">
        <header className="mb-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-white shadow-sm sm:mb-5 lg:hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:py-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-amber-300">
                川口典礼
              </p>
              <h1 className="mt-0.5 text-xl font-bold leading-tight sm:text-2xl">
                葬儀司会台本・会葬礼状 作成ツール
              </h1>
              <p className="mt-0.5 text-xs text-slate-300">
                大切な方を想う、心に寄り添うお手伝いを。
              </p>
            </div>
            <Link
              href="/kanri"
              className="shrink-0 rounded-md border border-white/20 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
            >
              ← 管理画面へ
            </Link>
          </div>
          <div className="border-t border-white/10 bg-slate-950/40 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs font-medium text-slate-300">
                入力進捗
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-200">
                {progressPct}%（{progressFilled}/{progressFields.length}項目）
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300">
              <span>案件：{deceasedLabel}</span>
              <span>式種別：{CEREMONY_TYPE_LABELS[form.ceremonyType]}</span>
              <span>
                作成状況：
                {hasScript ? `台本 ${sections.length}項目` : "台本未生成"}
                {hasLetter ? " ／ 礼状あり" : ""}
              </span>
            </div>
          </div>
        </header>

        {/* デスクトップ・アプリシェル（濃紺サイドバー＋上部アクションバー＋本文） */}
        <div className="lg:flex lg:items-start lg:gap-5">
          {/* 濃紺・左サイドバー（lg+のみ） */}
          <aside className="sticky top-4 hidden w-60 shrink-0 self-start overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-white shadow-sm lg:flex lg:flex-col">
            <div className="border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-lg text-amber-300"
                  aria-hidden
                >
                  ⚜
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-wide text-amber-300">
                    川口典礼
                  </p>
                  <p className="truncate text-xs font-bold leading-tight">
                    司会台本・会葬礼状
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">
                大切な方を想う、心に寄り添うお手伝いを。
              </p>
            </div>

            <nav className="px-2 py-3">
              <ol className="grid gap-1">
                {navSections.map((s) => {
                  const active = activeStepId === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(s.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm transition",
                          active
                            ? "bg-white/10 font-semibold text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                            active
                              ? "bg-amber-500 text-slate-900"
                              : "border border-white/25 text-slate-300",
                          )}
                        >
                          {s.step}
                        </span>
                        <span className="truncate">{s.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="mt-auto border-t border-white/10 p-3">
              <div className="rounded-lg bg-white/5 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                  <span aria-hidden>💡</span>入力のヒント
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">
                  わかる範囲でご入力ください。後からいつでも編集できます。
                </p>
              </div>
              <Link
                href="/kanri"
                className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
              >
                ← 管理画面へ
              </Link>
            </div>
          </aside>

          {/* 本文エリア */}
          <div className="lg:min-w-0 lg:flex-1">
            {/* 上部アクションバー（lg+のみ） */}
            <div className="mb-4 hidden items-center gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm lg:flex">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  入力進捗
                </span>
                <div className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">
                  {progressPct}%（{progressFilled}/{progressFields.length}項目）
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveFile}
                  disabled={!hasScript}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden>🗂</span>保存・引き継ぎ
                </button>
                <button
                  type="button"
                  onClick={handleCreatePdf}
                  disabled={!hasScript || pdfLoading}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden>📄</span>
                  {pdfLoading ? "PDF作成中..." : "PDFを作成"}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!hasScript}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden>⧉</span>
                  {copied ? "コピーしました" : "全文をコピー"}
                </button>
              </div>
            </div>

            {/* セグメント切替（入力｜司会台本｜会葬礼状）＋ 並べて表示（PCのみ） */}
            <div className="sticky top-0 z-30 -mx-4 mb-4 border-y border-stone-200 bg-[#f7f4ee]/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
              <div className="flex items-center gap-2">
                <div className={cn("grid flex-1 gap-2", hasLetter ? "grid-cols-3" : "grid-cols-2")}>
                  {mobileTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeView === tab.id}
                      onClick={() => setActiveView(tab.id)}
                      disabled={tab.id === "letter" && !hasLetter}
                      className={cn(
                        "min-h-12 rounded-md border px-2 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                        activeView === tab.id
                          ? "border-slate-800 bg-slate-800 text-white"
                          : "border-stone-300 bg-white text-slate-700 hover:bg-stone-50",
                      )}
                    >
                      <span className="block text-sm font-semibold">{tab.label}</span>
                      <span
                        className={cn(
                          "block text-[11px]",
                          activeView === tab.id ? "text-slate-200" : "text-slate-500",
                        )}
                      >
                        {tab.status}
                      </span>
                    </button>
                  ))}
                </div>
                {hasLetter && activeView !== "form" && (
                  <button
                    type="button"
                    onClick={() => setCompareMode((v) => !v)}
                    aria-pressed={compareMode}
                    className={cn(
                      "hidden shrink-0 items-center gap-1.5 rounded-md border px-3 py-2.5 text-xs font-semibold transition lg:inline-flex",
                      compareMode
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-stone-300 bg-white text-slate-700 hover:bg-stone-50",
                    )}
                    title="台本と礼状を左右に並べて表示"
                  >
                    <span aria-hidden>▥</span>
                    {compareMode ? "並べて表示中" : "台本と礼状を並べる"}
                  </button>
                )}
              </div>
            </div>

            {/* 入力 */}
            <div
              className={cn(
                "content-start gap-4",
                activeView === "form" ? "grid" : "hidden",
              )}
            >
              <FuneralScriptForm
                form={form}
                onChange={handleChange}
                onCeremonyTypeChange={handleCeremonyTypeChange}
                onGenerate={handleGenerate}
              />
              <FuneralScriptFileControls
                canSave={hasScript}
                onSave={handleSaveFile}
                onLoaded={handleLoadFile}
              />
            </div>

            {/* 台本・礼状（既定は全幅1カラム。PCで「並べて表示」時のみ2カラム） */}
            {activeView !== "form" && (
              <div
                className={cn(
                  compareOn ? "lg:grid lg:grid-cols-2 lg:items-start lg:gap-4" : "",
                )}
              >
                {/* 司会台本カラム */}
                <div
                  className={cn(
                    "min-w-0",
                    activeView === "script"
                      ? "block"
                      : compareOn
                        ? "hidden lg:block"
                        : "hidden",
                  )}
                >
                  <div className="grid content-start gap-3">
                    {hasScript && (
                      <FuneralScriptAiControls
                        targetCount={aiTargetIds.length}
                        hasGenerated={hasAiGenerated}
                        loading={aiLoading}
                        error={aiError}
                        warnings={aiWarnings}
                        onGenerate={handleGenerateAi}
                        onRevert={handleRevertAi}
                        canRevert={preAiSections !== null}
                        onSave={handleSaveToList}
                        saving={saving}
                        saveMessage={saveMessage}
                      />
                    )}
                    <div className="lg:hidden">
                      <FuneralScriptToolbar
                        printSize={form.printSize}
                        onPrintSizeChange={(printSize) => handleChange({ printSize })}
                        onCopy={handleCopy}
                        onCreatePdf={handleCreatePdf}
                        copied={copied}
                        disabled={!hasScript}
                        pdfLoading={pdfLoading}
                      />
                    </div>
                    {(pdfLoading || pdfError || pdfUrl) && (
                      <div
                        className={cn(
                          "rounded-md border px-3 py-2 text-xs leading-5",
                          pdfError
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-emerald-200 bg-emerald-50 text-slate-700",
                        )}
                      >
                        {pdfLoading && "PDFを作成しています。長い台本は少し時間がかかります。"}
                        {pdfError && pdfError}
                        {pdfUrl && !pdfLoading && !pdfError && (
                          <div>
                            <p>PDFを作成しました。</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {pdfShareAvailable && (
                                <button
                                  type="button"
                                  onClick={handleSharePdf}
                                  className="min-h-10 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                  ファイル/Driveへ保存
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleOpenPdf}
                                className="min-h-10 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800"
                              >
                                PDFを開く
                              </button>
                              <a
                                href={pdfUrl}
                                download={pdfFileName}
                                className="inline-flex min-h-10 items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                              >
                                ダウンロード
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {hasScript && (
                      <p className="text-xs text-slate-500">
                        {CEREMONY_TYPE_LABELS[form.ceremonyType]} ／ 全{" "}
                        {sections.length} セクション（本文は直接編集できます）
                      </p>
                    )}
                    <div className="min-w-0">
                      <p className="mb-2 hidden text-center text-sm font-semibold text-slate-700 lg:block">
                        葬儀司会台本（プレビュー）
                      </p>
                      <FuneralScriptPreview
                        sections={sections}
                        printSize={form.printSize}
                        onEditBody={handleEditBody}
                      />
                    </div>
                  </div>
                </div>

                {/* 会葬礼状カラム */}
                {hasLetter && (
                  <div
                    className={cn(
                      "min-w-0",
                      activeView === "letter"
                        ? "block"
                        : compareOn
                          ? "hidden lg:block"
                          : "hidden",
                    )}
                  >
                    <p className="mb-2 hidden text-center text-sm font-semibold text-slate-700 lg:block">
                      オリジナル会葬礼状（プレビュー）
                    </p>
                    <FuneralScriptOriginalLetterPanel
                      form={form}
                      letter={originalLetter}
                      loading={letterLoading}
                      error={letterError}
                      warnings={letterWarnings}
                      copied={letterCopied}
                      onEditBody={handleEditLetterBody}
                      onRegenerate={handleGenerateLetter}
                      onCopy={handleCopyLetter}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
          {activeView === "form" ? (
            <button
              type="button"
              onClick={handleGenerate}
              className="min-h-12 w-full rounded-md bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              台本を生成して確認へ
            </button>
          ) : (
            <div className="grid gap-2">
              {(pdfError || pdfUrl) && (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs leading-5",
                    pdfError
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-slate-700",
                  )}
                >
                  {pdfError}
                  {pdfUrl && !pdfError && (
                    <div className="grid grid-cols-2 gap-2">
                      {pdfShareAvailable && (
                        <button
                          type="button"
                          onClick={handleSharePdf}
                          className="min-h-10 rounded-md bg-emerald-700 px-2 py-1.5 text-xs font-semibold text-white"
                        >
                          保存/Drive
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenPdf}
                        className="min-h-10 rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-xs font-semibold text-emerald-800"
                      >
                        PDFを開く
                      </button>
                      <a
                        href={pdfUrl}
                        download={pdfFileName}
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        ダウンロード
                      </a>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView("form")}
                  className="min-h-12 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  入力を直す
                </button>
                <button
                  type="button"
                  onClick={handleCreatePdf}
                  disabled={!hasScript || pdfLoading}
                  className="min-h-12 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pdfLoading ? "PDF作成中..." : "PDFを作成"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 印刷専用ビュー（画面では非表示、印刷時のみ表示） */}
      <div className="fs-print-root">
        <FuneralScriptPrintView
          sections={sections}
          form={form}
          ceremonyType={form.ceremonyType}
          deceasedName={form.deceasedName}
          printSize={form.printSize}
          originalLetter={originalLetter}
        />
      </div>
      <div ref={pdfRef} className="fs-pdf-root" aria-hidden="true">
        <FuneralScriptPrintView
          sections={sections}
          form={form}
          ceremonyType={form.ceremonyType}
          deceasedName={form.deceasedName}
          printSize={form.printSize}
          originalLetter={originalLetter}
        />
      </div>
    </main>
  );
}
