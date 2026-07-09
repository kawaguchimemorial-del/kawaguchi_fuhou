"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import IeiPhotoStatus from "@/components/iei-photo/IeiPhotoStatus";
import IeiPhotoQualityCheck from "@/components/iei-photo/IeiPhotoQualityCheck";
import IeiPhotoAiQualityCheck from "@/components/iei-photo/IeiPhotoAiQualityCheck";
import StudioSidebar, {
  type StudioNavId,
} from "@/components/iei-photo/studio/StudioSidebar";
import StudioCanvas from "@/components/iei-photo/studio/StudioCanvas";
import StudioCandidates, {
  type StudioCandidate,
} from "@/components/iei-photo/studio/StudioCandidates";
import {
  StudioSectionHeading,
  StudioSlider,
  StudioToggle,
  StudioPillGroup,
  StudioSwatchGroup,
} from "@/components/iei-photo/studio/StudioUI";
import {
  IconCrop,
  IconImage,
  IconSave,
  IconShirt,
  IconSmile,
  IconSun,
  IconUndo,
  IconUpload,
  IconExport,
} from "@/components/iei-photo/studio/StudioIcons";
import {
  IEI_PHOTO_DEFAULT_MODE,
  IEI_PHOTO_MODE_ORDER,
  IEI_PHOTO_MODE_RULES,
} from "@/lib/iei-photo/image-rules";
import { IEI_PHOTO_MOCK_STEPS } from "@/lib/iei-photo/mock-job";
import {
  getAiGenerationProvider,
  IEI_PHOTO_MODE_TO_ROLE,
} from "@/lib/iei-photo/ai-generation-provider";
import {
  requestAiImage,
  requestAiWideImage,
} from "@/lib/iei-photo/ai-image-client";
import {
  applyDeAiEffectToImage,
  deAiCanvasToPngBlob,
} from "@/lib/iei-photo/de-ai";
import {
  IEI_PHOTO_BACKGROUND_OPTIONS,
  IEI_PHOTO_DEFAULT_BACKGROUND,
  supportsBackgroundGradient,
} from "@/lib/iei-photo/backgrounds";
import {
  IEI_PHOTO_CLOTHING_LABELS,
  IEI_PHOTO_CLOTHING_ORDER,
  IEI_PHOTO_POSE_LABELS,
  IEI_PHOTO_POSE_ORDER,
} from "@/lib/iei-photo/ai-prompts";
import {
  IEI_PHOTO_DEFAULT_ADJUSTMENTS,
  IEI_PHOTO_ADJUSTMENT_RANGES,
  applyAutoCorrect,
  type IeiPhotoAdjustmentKey,
} from "@/lib/iei-photo/adjustments";
import {
  IEI_PHOTO_EXPORT_ORDER,
  IEI_PHOTO_EXPORT_SIZES,
} from "@/lib/iei-photo/export-sizes";
import {
  loadImageElement,
  renderBasePhotoCanvas,
  resolveBackgroundImage,
  exportFromBaseByKind,
  exportAllZipFromBase,
  exportFromWideMasterByKind,
  exportAllZipFromWideMaster,
  renderWideMasterCanvas,
  filenameForKind,
  downloadBlob,
} from "@/lib/iei-photo/client-export";
import {
  saveImageToDevice,
  saveImagesToDevice,
} from "@/lib/iei-photo/save-image";
import type {
  IeiPhotoAdjustments,
  IeiPhotoAiImageMode,
  IeiPhotoAiResultMode,
  IeiPhotoBackgroundSettings,
  IeiPhotoBackgroundType,
  IeiPhotoClothingStyle,
  IeiPhotoDeAiStrength,
  IeiPhotoExportKind,
  IeiPhotoExports,
  IeiPhotoJobStatus,
  IeiPhotoMode,
  IeiPhotoPose,
  IeiPhotoQualityCheckItem,
  IeiPhotoSmileLevel,
  IeiPhotoTeethVisibility,
} from "@/lib/iei-photo/types";

/** 生成前の品質チェック項目（未判定） */
const INITIAL_QUALITY_CHECKS: IeiPhotoQualityCheckItem[] = [
  {
    key: "identityLikeness",
    label: "本人らしさチェック",
    status: "pending",
    description: "生成後も本人らしさが保たれているかを確認します。",
  },
  {
    key: "featureRetention",
    label: "顔・髪・服の保持",
    status: "pending",
    description: "顔・髪・服の特徴が保持されているかを確認します。",
  },
  {
    key: "aiArtifact",
    label: "AIっぽさチェック",
    status: "pending",
    description: "不自然なAI特有の質感や破綻が出ていないかを確認します。",
  },
  {
    key: "exposureShadow",
    label: "白飛び・影チェック",
    status: "pending",
    description: "白飛びや強い影が残っていないかを確認します。",
  },
  {
    key: "backgroundNaturalness",
    label: "背景自然さチェック",
    status: "pending",
    description: "背景が自然に見えるかを確認します。",
  },
];

/**
 * 基準写真が用意できた後の品質チェック表示。
 * 実判定は未実装。標準生成は元写真ピクセルを優先し、人物を別人化させない。
 */
const READY_QUALITY_CHECKS: IeiPhotoQualityCheckItem[] = [
  {
    key: "identityLikeness",
    label: "本人らしさチェック",
    status: "pending",
    description: "AIによる本人らしさの自動判定は行っていません。",
    note: "未実装",
  },
  {
    key: "featureRetention",
    label: "顔・髪・服の保持",
    status: "pass",
    description: "標準生成では人物を別人化させず、元写真の情報を優先しています。",
    note: "標準生成では元写真ピクセルを優先",
  },
  {
    key: "aiArtifact",
    label: "AIっぽさチェック",
    status: "pending",
    description: "AIっぽさの自動判定は行っていません。",
    note: "未実装",
  },
  {
    key: "exposureShadow",
    label: "白飛び・影チェック",
    status: "pending",
    description: "白飛び・影の自動判定は行っていません。",
    note: "未実装",
  },
  {
    key: "backgroundNaturalness",
    label: "背景自然さチェック",
    status: "pending",
    description: "AI生成背景が自然に見えるかを確認します。",
    note: "AI生成背景は目視確認",
  },
];

type StatusState = {
  status: IeiPhotoJobStatus | "idle";
  progress: number;
  label: string;
};

const IDLE_STATUS: StatusState = { status: "idle", progress: 0, label: "" };

/** プレビュー再生成の debounce（ms） */
const PREVIEW_DEBOUNCE_MS = 200;

type AiImageRunOptions = {
  extraPrompt?: string;
  processingLabel?: string;
  doneLabel?: string;
};

const HANDS_DOWN_PROMPT =
  "顔や胸元の近くに上がっている手や腕がある場合は、顔の向き、体の向き、表情、髪型、本人らしさ、背景は保ったまま、手と腕だけを自然に下ろしてください。人物全体を小さくしたり、腕まで入れるために引きの構図にしたりしないでください。遺影写真として顔と上半身を大きめに保ち、頭から胸元までが画面の中心にしっかり入る構図にしてください。手や腕は体の横または画面下の目立たない低い位置にし、必要なら画面下で自然に切れてもかまいません。顔のサイズ、位置、視線は小さくしないでください。";

const HANDS_KEEP_PROMPT =
  "手や腕は元画像の位置、角度、見え方を維持してください。AI補正中に手や腕を下ろしたり、消したり、別の位置へ移動したりしないでください。";

const HANDS_DOWN_MIN_ZOOM = 118;

export default function IeiPhotoPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<IeiPhotoMode>(IEI_PHOTO_DEFAULT_MODE);
  const [adjustments, setAdjustments] = useState<IeiPhotoAdjustments>(
    IEI_PHOTO_DEFAULT_ADJUSTMENTS,
  );
  const [autoCorrect, setAutoCorrect] = useState<boolean>(false);
  // 事前登録(顧客/対象者)コンテキスト。/kanri/ai-portrait/new から渡される。
  const [portraitCtx, setPortraitCtx] = useState<{ customerId?: string; customerName?: string; deceased?: string; estimateId?: string }>({});
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setPortraitCtx({
      customerId: sp.get("customer_id") || undefined,
      customerName: sp.get("customer_name") || undefined,
      deceased: sp.get("deceased") || undefined,
      estimateId: sp.get("estimate_id") || undefined,
    });
  }, []);
  const [previewKind, setPreviewKind] = useState<IeiPhotoExportKind>("base");
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [background, setBackground] = useState<IeiPhotoBackgroundSettings>(
    IEI_PHOTO_DEFAULT_BACKGROUND,
  );
  const [statusState, setStatusState] = useState<StatusState>(IDLE_STATUS);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [hasBase, setHasBase] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  // AIモード（高度AI補正 / AI肖像生成 / AIに全てお任せ）の状態
  const [clothingStyle, setClothingStyle] =
    useState<IeiPhotoClothingStyle>("none");
  const [pose, setPose] = useState<IeiPhotoPose>("none");
  const [handsDown, setHandsDown] = useState<boolean>(false);
  const [aiResultMode, setAiResultMode] = useState<IeiPhotoAiResultMode>(null);
  const [allowPortrait, setAllowPortrait] = useState<boolean>(false);
  const [allowAuto, setAllowAuto] = useState<boolean>(false);
  const [aiProcessing, setAiProcessing] = useState<boolean>(false);
  const [aiEnhancedUrl, setAiEnhancedUrl] = useState<string | null>(null);
  const [wideMasterUrl, setWideMasterUrl] = useState<string | null>(null);
  // 脱AI処理（肌なじませ。AI生成後画像にのみ適用）
  const [deAiStrength, setDeAiStrength] =
    useState<IeiPhotoDeAiStrength>("standard");
  const [deAiResult, setDeAiResult] = useState<IeiPhotoDeAiStrength | null>(
    null,
  );
  const [deAiProcessing, setDeAiProcessing] = useState<boolean>(false);
  const [deAiUrl, setDeAiUrl] = useState<string | null>(null);

  // --- スタジオUI（メモリアルフォトサポート）専用の表示状態 ---
  // サイドバーのアクティブ項目
  const [activeNav, setActiveNav] = useState<StudioNavId>("adjust");
  // AI仕上げの詳細オプションの開閉
  const [showAiDetails, setShowAiDetails] = useState<boolean>(false);
  // 顔を中心に配置（ON時は横位置・縦位置を中央へ戻す表示トグル）
  const [faceCenter, setFaceCenter] = useState<boolean>(true);
  // 表情の調整（チェックON時のみAI生成時のプロンプトへ反映）
  const [expressionEnabled, setExpressionEnabled] = useState<boolean>(false);
  const [smileLevel, setSmileLevel] =
    useState<IeiPhotoSmileLevel>("natural");
  const [eyeBrightness, setEyeBrightness] = useState<boolean>(false);
  const [teethVisibility, setTeethVisibility] =
    useState<IeiPhotoTeethVisibility>("closed");

  // 読み込み済み元画像 / 基準写真（親データ）
  const imgRef = useRef<HTMLImageElement | null>(null);
  // AI結果画像 / 脱AI処理後画像（親データの優先: deAi → ai → 元画像）
  const aiEnhancedImgRef = useRef<HTMLImageElement | null>(null);
  const deAiImgRef = useRef<HTMLImageElement | null>(null);
  const wideMasterImgRef = useRef<HTMLImageElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // 「手動で微調整する」でスクロール移動する先
  const adjustmentRef = useRef<HTMLDivElement | null>(null);
  // 生成の完了時にプレビューへ移動する先
  const previewRef = useRef<HTMLDivElement | null>(null);

  // ObjectURL の最新値を保持し、アンマウント時に解放するための ref
  const previewUrlRef = useRef<string | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const aiEnhancedUrlRef = useRef<string | null>(null);
  const wideMasterUrlRef = useRef<string | null>(null);
  const deAiUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(() => {
    outputUrlRef.current = outputUrl;
  }, [outputUrl]);
  useEffect(() => {
    aiEnhancedUrlRef.current = aiEnhancedUrl;
  }, [aiEnhancedUrl]);
  useEffect(() => {
    wideMasterUrlRef.current = wideMasterUrl;
  }, [wideMasterUrl]);
  useEffect(() => {
    deAiUrlRef.current = deAiUrl;
  }, [deAiUrl]);

  // 進行中タイマーの管理
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // アンマウント時のみ ObjectURL とタイマーを解放（ref 経由で最新値を参照）
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }
      if (aiEnhancedUrlRef.current) {
        URL.revokeObjectURL(aiEnhancedUrlRef.current);
      }
      if (wideMasterUrlRef.current) {
        URL.revokeObjectURL(wideMasterUrlRef.current);
      }
      if (deAiUrlRef.current) {
        URL.revokeObjectURL(deAiUrlRef.current);
      }
    };
  }, []);

  const replaceOutputUrl = useCallback((next: string | null) => {
    setOutputUrl((prev) => {
      if (prev && prev !== next) {
        URL.revokeObjectURL(prev);
      }
      return next;
    });
  }, []);

  const getWideMasterSource = useCallback((): HTMLImageElement | null => {
    const deAi = deAiImgRef.current;
    if (deAi && deAi.naturalWidth > deAi.naturalHeight) {
      return deAi;
    }
    return wideMasterImgRef.current;
  }, []);

  /**
   * 補正値・選択中サイズで基準写真を作り直し、プレビュー画像を生成する。
   * 現在のMVPでは人物再生成は行わず、ブラウザ内 Canvas で基準写真を生成する
   * （AI標準生成の仮実装）。
   */
  const generatePreview = useCallback(
    async (
      adj: IeiPhotoAdjustments,
      kind: IeiPhotoExportKind,
      bg: IeiPhotoBackgroundSettings,
    ) => {
      // 親データの優先順位:
      //   1. 脱AI処理後画像
      //   2. AI結果画像（高度AI補正 / AI肖像生成 / AIお任せ）
      //   3. 元画像
      const source =
        deAiImgRef.current ?? aiEnhancedImgRef.current ?? imgRef.current;
      if (!source) {
        return;
      }
      try {
        const wideSource = getWideMasterSource();
        if (wideSource) {
          baseCanvasRef.current = renderWideMasterCanvas(wideSource, adj, "base");
          setHasBase(true);
          setError(null);
          const blob = await exportFromWideMasterByKind(wideSource, adj, kind);
          replaceOutputUrl(URL.createObjectURL(blob));
          return;
        }

        // 現行仕様では別背景画像を読み込まない。bgImage は旧互換の fallback。
        const bgImage = await resolveBackgroundImage(bg, "vertical");
        const canvas = renderBasePhotoCanvas(source, adj, bg, bgImage);
        baseCanvasRef.current = canvas;
        setHasBase(true);
        setError(null);
        const blob = await exportFromBaseByKind(canvas, kind);
        replaceOutputUrl(URL.createObjectURL(blob));
      } catch (e) {
        baseCanvasRef.current = null;
        setHasBase(false);
        setError(
          e instanceof Error ? e.message : "基準写真の生成に失敗しました。",
        );
      }
    },
    [getWideMasterSource, replaceOutputUrl],
  );

  const replaceAiEnhancedUrl = useCallback((next: string | null) => {
    setAiEnhancedUrl((prev) => {
      if (prev && prev !== next) {
        URL.revokeObjectURL(prev);
      }
      return next;
    });
  }, []);

  const replaceWideMasterUrl = useCallback((next: string | null) => {
    setWideMasterUrl((prev) => {
      if (prev && prev !== next) {
        URL.revokeObjectURL(prev);
      }
      return next;
    });
  }, []);

  const replaceDeAiUrl = useCallback((next: string | null) => {
    setDeAiUrl((prev) => {
      if (prev && prev !== next) {
        URL.revokeObjectURL(prev);
      }
      return next;
    });
  }, []);

  const resetResults = useCallback(() => {
    setStatusState(IDLE_STATUS);
    setError(null);
    setInfo(null);
    setHasBase(false);
    baseCanvasRef.current = null;
    // AI結果・脱AI結果も解除する（新しい写真・クリア時）。
    aiEnhancedImgRef.current = null;
    deAiImgRef.current = null;
    wideMasterImgRef.current = null;
    setAiResultMode(null);
    setAiProcessing(false);
    setDeAiResult(null);
    setDeAiProcessing(false);
    setAllowPortrait(false);
    setAllowAuto(false);
    setHandsDown(false);
    replaceOutputUrl(null);
    replaceAiEnhancedUrl(null);
    replaceWideMasterUrl(null);
    replaceDeAiUrl(null);
  }, [
    replaceOutputUrl,
    replaceAiEnhancedUrl,
    replaceWideMasterUrl,
    replaceDeAiUrl,
  ]);

  const handleSelectFile = useCallback(
    (file: File) => {
      clearTimers();
      resetResults();
      setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
      setAutoCorrect(false);
      setImgLoaded(false);
      imgRef.current = null;

      const url = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return url;
      });
      setFileName(file.name);

      loadImageElement(url)
        .then((img) => {
          imgRef.current = img;
          setImgLoaded(true);
          void generatePreview(
            IEI_PHOTO_DEFAULT_ADJUSTMENTS,
            previewKind,
            background,
          );
        })
        .catch(() => {
          setError("画像の読み込みに失敗しました。別の画像でお試しください。");
        });
    },
    [clearTimers, resetResults, generatePreview, previewKind, background],
  );

  const handleClear = useCallback(() => {
    clearTimers();
    resetResults();
    setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
    setFileName(null);
    setImgLoaded(false);
    imgRef.current = null;
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, [clearTimers, resetResults]);

  const isProcessing =
    statusState.status !== "idle" &&
    statusState.status !== "completed" &&
    statusState.status !== "failed";
  const isCompleted = statusState.status === "completed";
  // AI結果（高度AI補正/AI肖像生成/お任せ）があるか。AI生成後チェック・脱AIパネルの表示条件。
  const hasAiResult = aiResultMode !== null;

  const handleAdjustmentChange = useCallback(
    (key: IeiPhotoAdjustmentKey, value: number) => {
      setAdjustments((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "offsetX" || key === "offsetY") {
          setFaceCenter(next.offsetX === 0 && next.offsetY === 0);
        }
        return next;
      });
    },
    [],
  );

  // 自動補正 ON の場合は手動補正に自動補正を重ねた値を返す。
  const computeEffective = useCallback(
    (adj: IeiPhotoAdjustments): IeiPhotoAdjustments =>
      autoCorrect ? applyAutoCorrect(adj) : adj,
    [autoCorrect],
  );

  const handleResetAdjustments = useCallback(() => {
    setAdjustments(IEI_PHOTO_DEFAULT_ADJUSTMENTS);
    // リセット時は自動補正も解除する。
    setAutoCorrect(false);
  }, []);

  // 補正値・自動補正・プレビュー種類・背景の変更に応じてプレビューを再生成（debounce）。
  useEffect(() => {
    if (!imgLoaded) {
      return;
    }
    const handle = setTimeout(() => {
      void generatePreview(computeEffective(adjustments), previewKind, background);
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [
    adjustments,
    previewKind,
    background,
    imgLoaded,
    generatePreview,
    computeEffective,
  ]);

  // 生成が完了したら、結果プレビューへ自動スクロールする
  // （操作ボタンと結果プレビューが離れていても、見るための手動スクロールを不要にする）。
  useEffect(() => {
    if (isCompleted && hasBase) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isCompleted, hasBase]);

  const handleChangeClothing = useCallback((style: IeiPhotoClothingStyle) => {
    setClothingStyle(style);
  }, []);

  const handleChangePose = useCallback((next: IeiPhotoPose) => {
    setPose(next);
  }, []);

  /**
   * AI画像処理（高度AI補正 / AI肖像生成 / AIに全てお任せ）を実行する。
   * 現在の基準写真 Canvas を /api/iei-photo/ai-image へ送り、AI結果画像を
   * 新しい親データ（aiEnhancedImgRef）として反映する。以後の4種出力もこれから派生する。
   * 16:9 はここでは横長生成せず、Canvas 側で中央配置する（出力仕様は不変）。
   */
  const runAiImage = useCallback(
    async (
      aiMode: IeiPhotoAiImageMode,
      options: AiImageRunOptions = {},
    ) => {
      const base = baseCanvasRef.current;
      if (!base) {
        setError("先に写真をアップロードして基準写真を作成してください。");
        return;
      }
      if (aiMode === "portrait" && !allowPortrait) {
        setError("AI肖像生成を許可するにチェックしてください。");
        return;
      }
      if (aiMode === "auto" && !allowAuto) {
        setError("AIに全てお任せ生成を許可するにチェックしてください。");
        return;
      }
      const defaultProcessingLabel =
        aiMode === "advanced"
          ? "AI高度補正中…"
          : aiMode === "portrait"
            ? "AI肖像生成中…"
            : "AIにお任せ生成中…";
      const processingLabel = options.processingLabel ?? defaultProcessingLabel;
      setAiProcessing(true);
      setError(null);
      setInfo(processingLabel);
      setStatusState({
        status: "creating_base",
        progress: 60,
        label: processingLabel,
      });

      let pendingUrl: string | null = null;
      let pendingWideUrl: string | null = null;
      try {
        const handsPrompt = handsDown ? HANDS_DOWN_PROMPT : HANDS_KEEP_PROMPT;
        const aiPrompt = [handsPrompt, options.extraPrompt?.trim()]
          .filter(Boolean)
          .join("\n");
        const blob = await requestAiImage(
          base,
          aiMode,
          clothingStyle,
          pose,
          background.type,
          supportsBackgroundGradient(background.type) &&
            Boolean(background.gradient),
          {
            enabled: expressionEnabled,
            smile: smileLevel,
            eyeBrightness,
            teethVisibility,
          },
          aiPrompt,
        );
        const url = URL.createObjectURL(blob);
        pendingUrl = url;
        const img = await loadImageElement(url);
        aiEnhancedImgRef.current = img;
        replaceAiEnhancedUrl(url);
        pendingUrl = null;

        setInfo("16:9モニター用の背景をAI生成中…");
        setStatusState({
          status: "creating_base",
          progress: 82,
          label: "16:9背景生成中…",
        });
        const bgImage = await resolveBackgroundImage(background, "vertical");
        const effectiveAdjustments = computeEffective(adjustments);
        const wideBaseAdjustments = handsDown
          ? {
              ...effectiveAdjustments,
              zoom: Math.max(effectiveAdjustments.zoom, HANDS_DOWN_MIN_ZOOM),
            }
          : effectiveAdjustments;
        const verticalCanvas = renderBasePhotoCanvas(
          img,
          wideBaseAdjustments,
          background,
          bgImage,
        );
        baseCanvasRef.current = verticalCanvas;
        const wideBlob = await requestAiWideImage(
          verticalCanvas,
          aiMode,
          clothingStyle,
          pose,
          background.type,
          supportsBackgroundGradient(background.type) &&
            Boolean(background.gradient),
          {
            enabled: expressionEnabled,
            smile: smileLevel,
            eyeBrightness,
            teethVisibility,
          },
          aiPrompt,
        );
        const wideUrl = URL.createObjectURL(wideBlob);
        pendingWideUrl = wideUrl;
        const wideImg = await loadImageElement(wideUrl);
        wideMasterImgRef.current = wideImg;
        replaceWideMasterUrl(wideUrl);
        pendingWideUrl = null;

        // 新しいAI結果が出たら、古い脱AI結果は解除する（AI画像から派生し直す）。
        deAiImgRef.current = null;
        replaceDeAiUrl(null);
        setDeAiResult(null);
        setAiResultMode(aiMode);
        const defaultDoneLabel =
          aiMode === "advanced"
            ? "AI高度補正済み。出力に反映します。"
            : aiMode === "portrait"
              ? "AI肖像生成済み。出力に反映します。"
              : "AIお任せ生成済み。出力に反映します。";
        const doneLabel = options.doneLabel ?? defaultDoneLabel;
        setInfo(doneLabel);
        setStatusState({ status: "completed", progress: 100, label: "完了" });
        await generatePreview(
          computeEffective(adjustments),
          previewKind,
          background,
        );
        requestAnimationFrame(() => {
          previewRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      } catch (e) {
        if (pendingUrl) {
          URL.revokeObjectURL(pendingUrl);
        }
        if (pendingWideUrl) {
          URL.revokeObjectURL(pendingWideUrl);
        }
        setInfo(null);
        setStatusState({
          status: "failed",
          progress: 0,
          label: "AI生成に失敗しました",
        });
        setError(e instanceof Error ? e.message : "AI生成に失敗しました。");
      } finally {
        setAiProcessing(false);
      }
    },
    [
      allowPortrait,
      allowAuto,
      clothingStyle,
      pose,
      handsDown,
      expressionEnabled,
      smileLevel,
      eyeBrightness,
      teethVisibility,
      generatePreview,
      computeEffective,
      adjustments,
      previewKind,
      background,
      replaceAiEnhancedUrl,
      replaceWideMasterUrl,
      replaceDeAiUrl,
    ],
  );

  const handleAuto = useCallback(() => {
    void runAiImage("auto");
  }, [runAiImage]);

  /** AI結果を解除して通常生成（切り抜き or 元画像）に戻す。脱AI結果も解除する。 */
  const handleClearAiResult = useCallback(() => {
    aiEnhancedImgRef.current = null;
    deAiImgRef.current = null;
    wideMasterImgRef.current = null;
    replaceAiEnhancedUrl(null);
    replaceWideMasterUrl(null);
    replaceDeAiUrl(null);
    setAiResultMode(null);
    setDeAiResult(null);
    setInfo("AI結果を解除しました。通常生成に戻しました。");
    void generatePreview(
      computeEffective(adjustments),
      previewKind,
      background,
    );
  }, [
    replaceAiEnhancedUrl,
    replaceWideMasterUrl,
    replaceDeAiUrl,
    generatePreview,
    computeEffective,
    adjustments,
    previewKind,
    background,
  ]);

  /**
   * 脱AI処理（肌なじませ）。AI生成後画像にのみ適用する。
   * wide master があれば横長親画像から派生し、なければ従来のAI結果画像から派生する。
   * 強度変更で再実行しても累積しない。
   */
  const handleDeAi = useCallback(async () => {
    const aiImg = wideMasterImgRef.current ?? aiEnhancedImgRef.current;
    if (!aiImg) {
      setError("AI結果がありません。先にAI生成を行ってください。");
      return;
    }
    setDeAiProcessing(true);
    setError(null);
    setInfo("脱AI処理中…");
    let pendingUrl: string | null = null;
    try {
      const canvas = applyDeAiEffectToImage(aiImg, deAiStrength);
      const blob = await deAiCanvasToPngBlob(canvas);
      const url = URL.createObjectURL(blob);
      pendingUrl = url;
      const img = await loadImageElement(url);
      deAiImgRef.current = img;
      replaceDeAiUrl(url);
      pendingUrl = null;
      setDeAiResult(deAiStrength);
      setInfo("脱AI処理済み。出力に反映します。");
      await generatePreview(
        computeEffective(adjustments),
        previewKind,
        background,
      );
    } catch (e) {
      if (pendingUrl) {
        URL.revokeObjectURL(pendingUrl);
      }
      setInfo(null);
      setError(e instanceof Error ? e.message : "脱AI処理に失敗しました。");
    } finally {
      setDeAiProcessing(false);
    }
  }, [
    deAiStrength,
    replaceDeAiUrl,
    generatePreview,
    computeEffective,
    adjustments,
    previewKind,
    background,
  ]);

  /** 脱AI処理を解除して AI結果画像に戻す。 */
  const handleRevertDeAi = useCallback(() => {
    deAiImgRef.current = null;
    replaceDeAiUrl(null);
    setDeAiResult(null);
    setInfo("AI結果に戻しました。");
    void generatePreview(
      computeEffective(adjustments),
      previewKind,
      background,
    );
  }, [
    replaceDeAiUrl,
    generatePreview,
    computeEffective,
    adjustments,
    previewKind,
    background,
  ]);

  /**
   * 「AI遺影写真を生成する」。
   * - AI肖像生成モード: 許可チェック必須で /api/iei-photo/ai-image(mode=portrait) を実行。
   * - それ以外（AI標準 / 高度AI補正）: 進行表示 → Canvas で基準写真を生成（AI標準の仮実装）。
   *   高度AI補正の実AIは「高度AI補正を実行」ボタン（runAiImage("advanced")）で行う。
   */
  const handleStart = useCallback(async () => {
    if (!previewUrl) {
      setError("先に写真をアップロードしてください。");
      return;
    }
    if (isProcessing || aiProcessing) {
      return;
    }
    // AI肖像生成は人物を含めて生成するため、明示許可が必要。
    if (mode === "AI_PORTRAIT") {
      if (!allowPortrait) {
        setError("AI肖像生成を許可するにチェックしてください。");
        return;
      }
      void runAiImage("portrait");
      return;
    }
    clearTimers();
    setError(null);
    setInfo(null);

    // AI処理プロバイダー（現状 mock）に役割を問い合わせる。
    const role = IEI_PHOTO_MODE_TO_ROLE[mode];
    const provider = getAiGenerationProvider();
    const result = await provider.generate({ role });
    if (!result.handledByCanvas) {
      // 高度AI補正 / AI肖像生成は未接続。今回は AI標準生成（Canvas）で生成する。
      setInfo(`${result.message}（今回は AI標準生成（Canvas）で生成します）`);
    }

    let cumulativeDelay = 0;
    IEI_PHOTO_MOCK_STEPS.forEach((step) => {
      const timer = setTimeout(() => {
        setStatusState({
          status: step.status,
          progress: step.progress,
          label: step.label,
        });
      }, cumulativeDelay);
      timersRef.current.push(timer);
      cumulativeDelay += step.delayMs;
    });
  }, [
    previewUrl,
    isProcessing,
    aiProcessing,
    clearTimers,
    mode,
    allowPortrait,
    runAiImage,
  ]);

  /** 出力（調整後の基準写真を親データに各サイズを派生してダウンロード）。AI不使用・ガイド非焼き込み。 */
  const handleExport = useCallback(async (kind: keyof IeiPhotoExports) => {
    const wideSource = getWideMasterSource();
    const base = baseCanvasRef.current;
    if (!base && !wideSource) {
      setError("出力できる基準写真がありません。写真をアップロードしてください。");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const blob = wideSource
        ? await exportFromWideMasterByKind(
            wideSource,
            computeEffective(adjustments),
            kind,
          )
        : await exportFromBaseByKind(base as HTMLCanvasElement, kind);
      // モバイルは共有シート（写真アプリへ保存）、PCはダウンロード。
      const result = await saveImageToDevice(blob, filenameForKind(kind));
      setInfo(
        result === "shared"
          ? "共有メニューから「画像を保存」で端末に保存できます。"
          : result === "canceled"
            ? "保存をキャンセルしました。"
            : "画像をダウンロードしました。",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "出力に失敗しました。");
    } finally {
      setExporting(false);
    }
  }, [adjustments, computeEffective, getWideMasterSource]);

  /**
   * すべての出力サイズを1つの ZIP にまとめてダウンロードする。
   * 複数ファイルの連続ダウンロードはブラウザにブロックされやすいため、単一 ZIP にする。
   */
  const handleExportAll = useCallback(async () => {
    const wideSource = getWideMasterSource();
    const base = baseCanvasRef.current;
    if (!base && !wideSource) {
      setError("出力できる基準写真がありません。写真をアップロードしてください。");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const adj = computeEffective(adjustments);
      // 4サイズを個別に生成。モバイルは共有シートで一括保存、PCはZIPでダウンロード。
      const items: { blob: Blob; filename: string }[] = [];
      for (const kind of IEI_PHOTO_EXPORT_ORDER) {
        const blob = wideSource
          ? await exportFromWideMasterByKind(wideSource, adj, kind)
          : await exportFromBaseByKind(base as HTMLCanvasElement, kind);
        items.push({ blob, filename: filenameForKind(kind) });
      }
      const result = await saveImagesToDevice(items, async () => {
        const zip = wideSource
          ? await exportAllZipFromWideMaster(wideSource, adj)
          : await exportAllZipFromBase(base as HTMLCanvasElement);
        downloadBlob(zip, "iei-photos.zip");
      });
      setInfo(
        result === "shared"
          ? "共有メニューから4サイズをまとめて端末に保存できます。"
          : result === "canceled"
            ? "保存をキャンセルしました。"
            : "4サイズをZIP（iei-photos.zip）でダウンロードしました。",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "一括出力に失敗しました。");
    } finally {
      setExporting(false);
    }
  }, [adjustments, computeEffective, getWideMasterSource]);

  /** 作成した遺影を一覧(/kanri/ai-portrait)へ保存する。基準写真をサーバーへアップロードして登録。 */
  const handleSaveToList = useCallback(async () => {
    const wideSource = getWideMasterSource();
    const base = baseCanvasRef.current;
    if (!base && !wideSource) {
      setError("保存できる基準写真がありません。写真をアップロードしてください。");
      return;
    }
    // 対象者名は事前登録があればそれを使い、無ければ入力を促す（必須）。
    let name = (portraitCtx.deceased ?? "").trim();
    if (!name) {
      const input = typeof window !== "undefined" ? window.prompt("対象者（故人）名を入力してください（必須）", "") : "";
      if (input === null) return; // キャンセル
      name = input.trim();
      if (!name) { setError("対象者（故人）名を入力してください。"); return; }
    }
    setExporting(true);
    setError(null);
    try {
      const adj = computeEffective(adjustments);
      const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("画像の変換に失敗しました。"));
        r.readAsDataURL(blob);
      });
      // 基準写真＋手札(オンライン式場の祭壇遺影に使用)を書き出す
      const baseBlob = wideSource ? await exportFromWideMasterByKind(wideSource, adj, "base") : await exportFromBaseByKind(base as HTMLCanvasElement, "base");
      const tefudaBlob = wideSource ? await exportFromWideMasterByKind(wideSource, adj, "tesatsu") : await exportFromBaseByKind(base as HTMLCanvasElement, "tesatsu");
      const [baseDataUrl, tefudaDataUrl] = await Promise.all([toDataUrl(baseBlob), toDataUrl(tefudaBlob)]);
      // 1) サーバー(一覧)へ保存
      const res = await fetch("/api/iei-photo/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseDataUrl, tefudaDataUrl, deceasedName: name, customerId: portraitCtx.customerId, estimateId: portraitCtx.estimateId }),
      });
      const d = await res.json().catch(() => ({ ok: false, error: "応答が不正です" }));
      if (!d.ok) { setError(d.error || "保存に失敗しました。"); return; }
      // 2) 同時に端末(PC)へもダウンロード
      let downloaded = false;
      try { await saveImageToDevice(baseBlob, filenameForKind("base")); downloaded = true; } catch { /* DL失敗でも保存は成立 */ }
      setInfo(`${name} 様の遺影を一覧に保存しました${downloaded ? "（端末にもダウンロードしました）" : ""}。管理画面の「AI遺影写真」で確認できます。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setExporting(false);
    }
  }, [adjustments, computeEffective, getWideMasterSource, portraitCtx]);

  const handleAdvancedAi = useCallback(() => {
    void runAiImage("advanced");
  }, [runAiImage]);

  const handleBackgroundType = useCallback(
    (type: IeiPhotoBackgroundType) => {
      setBackground((prev) => ({
        type,
        gradient: supportsBackgroundGradient(type)
          ? Boolean(prev.gradient)
          : false,
      }));
      if (aiEnhancedImgRef.current || deAiImgRef.current) {
        setInfo("背景を変更しました。AI生成を再実行すると反映されます。");
      }
    },
    [],
  );

  const handleBackgroundGradient = useCallback((next: boolean) => {
    setBackground((prev) => {
      if (!supportsBackgroundGradient(prev.type)) {
        return { ...prev, gradient: false };
      }
      return { ...prev, gradient: next };
    });
    if (aiEnhancedImgRef.current || deAiImgRef.current) {
      setInfo(
        "背景のグラデーション設定を変更しました。AI生成を再実行すると反映されます。",
      );
    }
  }, []);

  const canExport = hasBase && !exporting;
  const controlsDisabled = !imgLoaded;

  // --- スタジオUI: ナビゲーション・スクロール ---
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);
  const backgroundSectionRef = useRef<HTMLDivElement | null>(null);
  const finishSectionRef = useRef<HTMLDivElement | null>(null);
  const exportSectionRef = useRef<HTMLDivElement | null>(null);

  const handleNavigate = useCallback(
    (id: StudioNavId) => {
      setActiveNav(id);
      const target =
        id === "upload"
          ? uploadSectionRef.current
          : id === "adjust"
            ? adjustmentRef.current
            : id === "background"
              ? backgroundSectionRef.current
              : id === "finish"
                ? finishSectionRef.current
                : id === "preview"
                  ? previewRef.current
                  : id === "export"
                    ? exportSectionRef.current
                    : null;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [],
  );

  // 顔を中心に配置: ON で横位置・縦位置を中央へ戻す
  const handleToggleFaceCenter = useCallback((next: boolean) => {
    setFaceCenter(next);
    if (next) {
      setAdjustments((prev) => ({ ...prev, offsetX: 0, offsetY: 0 }));
    }
  }, []);

  // レタッチの強さ(0-100) → 脱AI強度
  const retouchValue =
    deAiStrength === "light" ? 25 : deAiStrength === "standard" ? 60 : 90;
  const handleRetouchChange = useCallback((value: number) => {
    setDeAiStrength(value < 40 ? "light" : value < 75 ? "standard" : "strong");
  }, []);

  // 背景スウォッチ。選択値は AI 生成プロンプトへ渡す。
  const bgSwatchOptions: {
    value: IeiPhotoBackgroundType;
    label: string;
    css: string;
  }[] = IEI_PHOTO_BACKGROUND_OPTIONS.map((option) => ({
    value: option.type,
    label: compactBackgroundLabel(option.type),
    css: option.swatchCss,
  }));
  const canUseBackgroundGradient = supportsBackgroundGradient(background.type);

  // トリミング・構図ピル（実際の出力サイズに対応）
  const trimOptions = IEI_PHOTO_EXPORT_ORDER.map((kind) => ({
    value: kind,
    label: compactExportLabel(kind),
  }));

  const modeOptions = IEI_PHOTO_MODE_ORDER.map((m) => ({
    value: m,
    label: IEI_PHOTO_MODE_RULES[m].label.replace("AI", ""),
  }));

  const clothingOptions = IEI_PHOTO_CLOTHING_ORDER.map((style) => ({
    value: style,
    label: IEI_PHOTO_CLOTHING_LABELS[style],
  }));

  const poseOptions = IEI_PHOTO_POSE_ORDER.map((p) => ({
    value: p,
    label: IEI_PHOTO_POSE_LABELS[p],
  }));

  const smileOptions: { value: IeiPhotoSmileLevel; label: string }[] = [
    { value: "slight", label: "少し微笑み" },
    { value: "natural", label: "自然な微笑み" },
    { value: "broad", label: "満面の笑み" },
  ];

  const teethVisibilityOptions: {
    value: IeiPhotoTeethVisibility;
    label: string;
  }[] = [
    { value: "closed", label: "口を閉じる" },
    { value: "slight", label: "少し歯を出す" },
    { value: "clear", label: "歯をしっかり見せる" },
  ];

  // 仕上がりプレビュー枠の縦横比
  const previewSize = IEI_PHOTO_EXPORT_SIZES[previewKind];
  const previewAspect = `${previewSize.pixelGuide.width} / ${previewSize.pixelGuide.height}`;
  const guidesVisible = previewKind === "base" && showGuides;

  // 明るさ系は100基準の差分表示。ズームは100未満を縮小量として表示する。
  const signed = (v: number) => `${v - 100 > 0 ? "+" : ""}${v - 100}`;
  const zoomLabel = (v: number) => {
    if (v < 100) return `-${100 - v}%`;
    return `${v}%`;
  };
  const signedPosition = (v: number) => `${v > 0 ? "+" : ""}${v}`;

  // 仕上げ候補（ワンタップ・プリセット）
  const candidates: StudioCandidate[] = [
    {
      id: "auto-bright",
      label: "明るさ補正",
      thumbUrl: outputUrl,
      active: Boolean(outputUrl) && autoCorrect,
    },
    {
      id: "compose-close",
      label: "構図：クローズアップ",
      thumbUrl: outputUrl,
      active: Boolean(outputUrl) && adjustments.zoom >= 130,
    },
    {
      id: "center-face",
      label: "中央配置",
      thumbUrl: outputUrl,
      active:
        Boolean(outputUrl) &&
        faceCenter &&
        adjustments.offsetX === 0 &&
        adjustments.offsetY === 0,
    },
    ...IEI_PHOTO_BACKGROUND_OPTIONS.map((option) => ({
      id: `bg-${option.type}`,
      label: `背景：${compactBackgroundLabel(option.type)}`,
      thumbUrl: outputUrl,
      active: Boolean(outputUrl) && background.type === option.type,
    })),
  ];

  const handleToggleCandidate = useCallback(
    (id: string) => {
      switch (id) {
        case "auto-bright":
          setAutoCorrect((v) => !v);
          break;
        case "compose-close":
          setAdjustments((prev) => ({
            ...prev,
            zoom: prev.zoom >= 130 ? 100 : 130,
          }));
          break;
        case "center-face":
          handleToggleFaceCenter(true);
          break;
        default:
          if (id.startsWith("bg-")) {
            const type = id.slice(3) as IeiPhotoBackgroundType;
            const exists = IEI_PHOTO_BACKGROUND_OPTIONS.some(
              (option) => option.type === type,
            );
            if (exists) {
              handleBackgroundType(type);
            }
          }
          break;
      }
    },
    [handleBackgroundType, handleToggleFaceCenter],
  );

  return (
    <div className="flex min-h-screen w-full bg-stone-50">
      <StudioSidebar active={activeNav} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 basis-0 flex-col overflow-x-hidden w-[calc(100vw-3.5rem)] sm:w-auto">
        {/* 上部バー */}
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/kanri/ai-portrait"
              className="flex shrink-0 items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-stone-100"
            >
              <span aria-hidden>←</span>
              <span className="hidden sm:inline">管理画面に戻る</span>
              <span className="sm:hidden">戻る</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-800 sm:text-xl">
                メモリアルフォトサポート
              </h1>
              {(portraitCtx.deceased || portraitCtx.customerName) && (
                <p className="truncate text-xs text-slate-500">
                  {portraitCtx.deceased ? `${portraitCtx.deceased} 様の遺影を作成中` : ""}
                  {portraitCtx.customerName ? `（顧客：${portraitCtx.customerName}）` : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAdjustments}
              disabled={controlsDisabled}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-stone-100 disabled:opacity-40"
            >
              <IconUndo />
              <span className="hidden sm:inline">元に戻す</span>
            </button>
            <button
              type="button"
              onClick={handleExportAll}
              disabled={!canExport}
              className="hidden items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 disabled:opacity-40 sm:flex"
            >
              <IconSave />
              <span className="hidden sm:inline">4サイズDL</span>
            </button>
            <button
              type="button"
              onClick={() => void handleExport("base")}
              disabled={!canExport}
              className="hidden items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40 sm:flex"
            >
              <IconExport />
              基準写真DL
            </button>
            <button
              type="button"
              onClick={() => void handleSaveToList()}
              disabled={!canExport}
              className="hidden items-center gap-1.5 rounded-lg bg-[#2c8c6f] px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-[#256f59] disabled:opacity-40 sm:flex"
            >
              <IconSave />
              保存（PC＋一覧）
            </button>
          </div>
        </header>

        {/* メッセージ */}
        {(info || error) && (
          <div className="px-4 pt-3 sm:px-6">
            {info && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
                {info}
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700"
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* 本体: 左コントロール / 中央キャンバス */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 sm:p-6 lg:flex-row lg:items-start">
          {/* 左コントロールパネル */}
          <div className="w-full shrink-0 space-y-4 lg:w-80">
            {/* 読み込み（未選択時のみ目立たせる） */}
            <div ref={uploadSectionRef}>
              {!previewUrl ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white px-4 py-8 text-center shadow-sm transition hover:border-amber-500 hover:bg-amber-50/40">
                  <IconUpload className="mb-2 h-6 w-6 text-amber-600" />
                  <span className="text-sm font-semibold text-slate-700">
                    写真を読み込む
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    クリックして JPEG / PNG を選択
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSelectFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
                  <span className="truncate text-xs text-slate-600">
                    {fileName ?? "読み込み済みの写真"}
                  </span>
                  <div className="flex shrink-0 gap-1.5">
                    <label className="cursor-pointer rounded-md border border-stone-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-stone-100">
                      変更
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleSelectFile(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-stone-100"
                    >
                      取り消す
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 写真補正・構図 */}
            <section
              ref={adjustmentRef}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <StudioSectionHeading
                  icon={<IconSun className="h-4 w-4" />}
                  title="写真補正"
                />
                <button
                  type="button"
                  onClick={handleResetAdjustments}
                  disabled={controlsDisabled}
                  className="shrink-0 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-stone-100 disabled:opacity-50"
                >
                  リセット
                </button>
              </div>
              <StudioSlider
                label="明るさ"
                value={adjustments.brightness}
                min={IEI_PHOTO_ADJUSTMENT_RANGES.brightness.min}
                max={IEI_PHOTO_ADJUSTMENT_RANGES.brightness.max}
                valueLabel={signed(adjustments.brightness)}
                disabled={controlsDisabled}
                onChange={(v) => handleAdjustmentChange("brightness", v)}
              />
              <StudioSlider
                label="コントラスト"
                value={adjustments.contrast}
                min={IEI_PHOTO_ADJUSTMENT_RANGES.contrast.min}
                max={IEI_PHOTO_ADJUSTMENT_RANGES.contrast.max}
                valueLabel={signed(adjustments.contrast)}
                disabled={controlsDisabled}
                onChange={(v) => handleAdjustmentChange("contrast", v)}
              />
              <StudioSlider
                label="彩度"
                value={adjustments.saturation}
                min={IEI_PHOTO_ADJUSTMENT_RANGES.saturation.min}
                max={IEI_PHOTO_ADJUSTMENT_RANGES.saturation.max}
                valueLabel={signed(adjustments.saturation)}
                disabled={controlsDisabled}
                onChange={(v) => handleAdjustmentChange("saturation", v)}
              />
              <div className="mt-1 border-t border-stone-100 pt-1">
                <StudioToggle
                  label="自動補正を適用"
                  checked={autoCorrect}
                  disabled={controlsDisabled}
                  onChange={setAutoCorrect}
                />
              </div>

              <div className="mt-4 border-t border-stone-100 pt-4">
                <StudioSectionHeading
                  icon={<IconCrop className="h-4 w-4" />}
                  title="構図・サイズ"
                />
                <StudioPillGroup
                  options={trimOptions}
                  value={previewKind}
                  disabled={controlsDisabled}
                  onChange={setPreviewKind}
                />
                <div className="mt-3">
                  <StudioSlider
                    label="拡大率"
                    value={adjustments.zoom}
                    min={IEI_PHOTO_ADJUSTMENT_RANGES.zoom.min}
                    max={IEI_PHOTO_ADJUSTMENT_RANGES.zoom.max}
                    valueLabel={zoomLabel(adjustments.zoom)}
                    disabled={controlsDisabled}
                    onChange={(v) => handleAdjustmentChange("zoom", v)}
                  />
                  <StudioSlider
                    label="横位置"
                    value={adjustments.offsetX}
                    min={IEI_PHOTO_ADJUSTMENT_RANGES.offsetX.min}
                    max={IEI_PHOTO_ADJUSTMENT_RANGES.offsetX.max}
                    valueLabel={signedPosition(adjustments.offsetX)}
                    disabled={controlsDisabled}
                    onChange={(v) => handleAdjustmentChange("offsetX", v)}
                  />
                  <StudioSlider
                    label="縦位置"
                    value={adjustments.offsetY}
                    min={IEI_PHOTO_ADJUSTMENT_RANGES.offsetY.min}
                    max={IEI_PHOTO_ADJUSTMENT_RANGES.offsetY.max}
                    valueLabel={signedPosition(adjustments.offsetY)}
                    disabled={controlsDisabled}
                    onChange={(v) => handleAdjustmentChange("offsetY", v)}
                  />
                </div>
                <StudioToggle
                  label="顔を中心に配置"
                  checked={faceCenter}
                  disabled={controlsDisabled}
                  onChange={handleToggleFaceCenter}
                />
                <StudioToggle
                  label="ガイド線を表示"
                  checked={showGuides}
                  disabled={controlsDisabled}
                  onChange={setShowGuides}
                />
              </div>
            </section>

            {/* 背景 */}
            <section
              ref={backgroundSectionRef}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <StudioSectionHeading
                icon={<IconImage className="h-4 w-4" />}
                title="AI背景"
              />
              <StudioSwatchGroup
                options={bgSwatchOptions}
                value={background.type}
                disabled={controlsDisabled}
                onChange={handleBackgroundType}
              />
              {canUseBackgroundGradient && (
                <div className="mt-3 border-t border-stone-100 pt-2">
                  <StudioToggle
                    label="グラデーションにする"
                    checked={Boolean(background.gradient)}
                    disabled={controlsDisabled}
                    onChange={handleBackgroundGradient}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={handleAdvancedAi}
                disabled={controlsDisabled || aiProcessing || !hasBase}
                className="mt-3 w-full rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50"
              >
                {aiProcessing ? "AI生成中…" : "背景込みでAI生成"}
              </button>
            </section>

            {/* AI仕上げ */}
            <section
              ref={finishSectionRef}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <StudioSectionHeading
                icon={<IconShirt className="h-4 w-4" />}
                title="AI仕上げ"
              />
              <StudioPillGroup
                options={modeOptions}
                value={mode}
                disabled={controlsDisabled || isProcessing || aiProcessing}
                onChange={setMode}
              />
              <button
                type="button"
                onClick={handleStart}
                disabled={!previewUrl || isProcessing || aiProcessing}
                className="mt-3 w-full rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
              >
                {isProcessing || aiProcessing
                  ? "生成中…"
                  : mode === "AI_PORTRAIT"
                    ? "AI肖像生成を実行"
                    : "基準写真を作成"}
              </button>
              <button
                type="button"
                onClick={() => setShowAiDetails((v) => !v)}
                aria-expanded={showAiDetails}
                className="mt-2 flex w-full items-center justify-between rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-stone-100"
              >
                AI詳細・準備中項目
                <span className="text-slate-400">
                  {showAiDetails ? "−" : "＋"}
                </span>
              </button>

              {showAiDetails && (
                <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-600">
                      服装
                    </p>
                    <StudioPillGroup
                      options={clothingOptions}
                      value={clothingStyle}
                      disabled={controlsDisabled || isProcessing || aiProcessing}
                      onChange={handleChangeClothing}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-600">
                      体勢・向き
                    </p>
                    <StudioPillGroup
                      options={poseOptions}
                      value={pose}
                      disabled={controlsDisabled || isProcessing || aiProcessing}
                      onChange={handleChangePose}
                    />
                    <label className="mt-2 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-800">
                      <input
                        type="checkbox"
                        checked={handsDown}
                        onChange={(e) => setHandsDown(e.target.checked)}
                        disabled={controlsDisabled || isProcessing || aiProcessing}
                        className="mt-0.5 h-4 w-4 accent-sky-600"
                      />
                      手・腕を下ろす
                    </label>
                  </div>

                  {mode === "AI_PORTRAIT" && (
                    <label className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                      <input
                        type="checkbox"
                        checked={allowPortrait}
                        onChange={(e) => setAllowPortrait(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-rose-600"
                      />
                      AI肖像生成を許可する
                    </label>
                  )}

                  <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    <input
                      type="checkbox"
                      checked={allowAuto}
                      onChange={(e) => setAllowAuto(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-amber-600"
                    />
                    AIに全てお任せ生成を許可する
                  </label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleAdvancedAi}
                      disabled={controlsDisabled || aiProcessing || !hasBase}
                      className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50"
                    >
                      {aiProcessing ? "AI生成中…" : "背景込みAI補正"}
                    </button>
                    <button
                      type="button"
                      onClick={handleAuto}
                      disabled={
                        controlsDisabled || aiProcessing || !hasBase || !allowAuto
                      }
                      className="rounded-md border border-amber-400 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                    >
                      背景もお任せ
                    </button>
                  </div>

                  {hasAiResult && (
                    <>
                      <button
                        type="button"
                        onClick={handleClearAiResult}
                        disabled={aiProcessing || deAiProcessing}
                        className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-stone-100 disabled:opacity-50"
                      >
                        AI結果を解除
                      </button>
                      <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                        <StudioSlider
                          label="レタッチの強さ"
                          value={retouchValue}
                          min={0}
                          max={100}
                          valueLabel={`${retouchValue}`}
                          disabled={deAiProcessing}
                          onChange={handleRetouchChange}
                        />
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={handleDeAi}
                            disabled={deAiProcessing}
                            className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                          >
                            {deAiProcessing ? "処理中…" : "脱AI処理"}
                          </button>
                          <button
                            type="button"
                            onClick={handleRevertDeAi}
                            disabled={deAiProcessing || !deAiResult}
                            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-stone-100 disabled:opacity-50"
                          >
                            AI結果に戻す
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3">
                    <StudioSectionHeading
                      icon={<IconSmile className="h-4 w-4" />}
                      title="表情の調整"
                    />
                    <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={expressionEnabled}
                        disabled={controlsDisabled || isProcessing || aiProcessing}
                        onChange={(e) => setExpressionEnabled(e.target.checked)}
                        className="h-4 w-4 accent-slate-800 disabled:opacity-50"
                      />
                      表情を調整する
                    </label>
                    <div
                      className={
                        expressionEnabled
                          ? "space-y-3"
                          : "space-y-3 opacity-50"
                      }
                    >
                      <div>
                        <p className="mb-2 text-xs font-semibold text-slate-600">
                          微笑み
                        </p>
                        <StudioPillGroup
                          options={smileOptions}
                          value={smileLevel}
                          disabled={
                            !expressionEnabled ||
                            controlsDisabled ||
                            isProcessing ||
                            aiProcessing
                          }
                          onChange={setSmileLevel}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={eyeBrightness}
                          disabled={
                            !expressionEnabled ||
                            controlsDisabled ||
                            isProcessing ||
                            aiProcessing
                          }
                          onChange={(e) => setEyeBrightness(e.target.checked)}
                          className="h-4 w-4 accent-slate-800 disabled:opacity-50"
                        />
                        目元の明るさを自動調整
                      </label>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-slate-600">
                          歯の見え方
                        </p>
                        <StudioPillGroup
                          options={teethVisibilityOptions}
                          value={teethVisibility}
                          disabled={
                            !expressionEnabled ||
                            controlsDisabled ||
                            isProcessing ||
                            aiProcessing
                          }
                          onChange={setTeethVisibility}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hasAiResult && (
                <p className="mt-3 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                  AI結果を出力に反映中
                </p>
              )}
            </section>

            {/* 書き出し */}
            <section
              ref={exportSectionRef}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <StudioSectionHeading
                icon={<IconExport className="h-4 w-4" />}
                title="書き出し"
              />
              <div className="grid gap-2">
                {IEI_PHOTO_EXPORT_ORDER.map((kind) => {
                  const size = IEI_PHOTO_EXPORT_SIZES[kind];
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => void handleExport(kind)}
                      disabled={!canExport}
                      className="flex items-center justify-between gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-stone-100 disabled:opacity-50"
                    >
                      <span>{size.label}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-slate-500">
                        {size.aspectRatio}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleExportAll}
                disabled={!canExport}
                className="mt-3 w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                4サイズまとめて保存
              </button>
            </section>
          </div>

          {/* 中央: キャンバス + 仕上げ候補 */}
          <div ref={previewRef} className="min-w-0 flex-1 space-y-4">
            <StudioCanvas
              beforeUrl={previewUrl}
              outputUrl={outputUrl}
              aspect={previewAspect}
              showGuides={guidesVisible}
            />
            <StudioCandidates
              items={candidates}
              disabled={controlsDisabled}
              onToggle={handleToggleCandidate}
            />
            <div className="grid gap-4 xl:grid-cols-2">
              <IeiPhotoStatus
                status={statusState.status}
                progress={statusState.progress}
                label={statusState.label}
              />
              {hasAiResult && <IeiPhotoAiQualityCheck />}
              <IeiPhotoQualityCheck
                items={hasBase ? READY_QUALITY_CHECKS : INITIAL_QUALITY_CHECKS}
              />
            </div>
          </div>
        </div>

        {/* モバイル用の固定保存バー（PCは非表示。ヘッダーの保存ボタンが担う） */}
        <div className="sticky bottom-0 z-20 flex items-center gap-2 border-t border-stone-200 bg-white/95 px-3 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => void handleExport("base")}
            disabled={!canExport}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40"
          >
            <IconExport />
            {exporting ? "処理中…" : "端末にDL"}
          </button>
          <button
            type="button"
            onClick={() => void handleSaveToList()}
            disabled={!canExport}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2c8c6f] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#256f59] disabled:opacity-40"
          >
            <IconSave />
            保存（PC＋一覧）
          </button>
          <button
            type="button"
            onClick={handleExportAll}
            disabled={!canExport}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 disabled:opacity-40"
          >
            <IconSave />
            4サイズ
          </button>
        </div>
      </div>
    </div>
  );
}

function compactBackgroundLabel(type: IeiPhotoBackgroundType): string {
  switch (type) {
    case "sky":
      return "空";
    case "light_gray":
      return "グレー";
    case "warm_beige":
      return "ベージュ";
    case "pale_blue":
      return "ブルー";
    case "pale_pink":
      return "ピンク";
    case "auto":
      return "お任せ";
    case "white":
      return "白";
    case "gradient":
      return "グラデ";
    case "photo":
      return "写真";
    default:
      return type;
  }
}

function compactExportLabel(kind: IeiPhotoExportKind): string {
  switch (kind) {
    case "base":
      return "基準";
    case "tesatsu":
      return "手札";
    case "yotsugiri":
      return "四切";
    case "monitor169":
      return "16:9";
    default:
      return kind;
  }
}
