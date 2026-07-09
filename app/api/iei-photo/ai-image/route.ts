/**
 * POST /api/iei-photo/ai-image
 *
 * ブラウザ → この Route Handler → OpenAI Images（edits）→ 生成画像、という中継。
 * OpenAI APIキーはサーバー側のみで使用し、クライアントへ露出しない／ログに出さない。
 *
 * 入力: multipart/form-data
 *  - image:        加工対象画像（基準写真など。クライアント側で長辺1600pxに縮小済み想定）
 *  - mode:         advanced | portrait | auto
 *  - clothingStyle: none | mourning_japanese | mourning_western | suit | casual
 *  - backgroundType: sky | light_gray | warm_beige | pale_blue | pale_pink | auto
 *  - backgroundGradient: true | false
 *  - expressionEnabled: true | false
 *  - smileLevel:   slight | natural | broad
 *  - eyeBrightness: true | false
 *  - teethVisibility: closed | slight | clear
 *  - target:       portrait | wide（省略時 portrait）
 *  - prompt:       任意の追加指示
 *  - mask:         target=wide の場合のみ。透明部分が左右のAI生成対象。
 *
 * 成功: image/png（生成画像バイナリ）
 * 失敗: JSON `{ ok:false, message:"..." }`
 *
 * 方針:
 * - 人物のAI生成は「高度AI補正 / AI肖像生成 / AIに全てお任せ」の明示操作時のみ（mode で判定）。
 * - AI生成後の16:9は、マスク付き編集で左右背景もAI生成する。
 * - APIキー・Authorization・画像base64本体は絶対にログへ出さない。
 */

import {
  buildAiPrompt,
  buildWideMonitorPrompt,
} from "@/lib/iei-photo/ai-prompts";
import type {
  IeiPhotoAiImageMode,
  IeiPhotoBackgroundType,
  IeiPhotoClothingStyle,
  IeiPhotoExpressionSettings,
  IeiPhotoPose,
  IeiPhotoSmileLevel,
  IeiPhotoTeethVisibility,
} from "@/lib/iei-photo/types";

// 画像生成は時間がかかるため、関数の上限を最大（300秒）にする。
export const maxDuration = 300;

const OPENAI_EDITS_URL = "https://api.openai.com/v1/images/edits";
const DEFAULT_MODEL = "gpt-image-2";
// OpenAI 呼び出しのタイムアウト（ミリ秒）。maxDuration 内に収める。
const OPENAI_FETCH_TIMEOUT_MS = 240_000;

const VALID_MODES: IeiPhotoAiImageMode[] = ["advanced", "portrait", "auto"];
const VALID_BACKGROUND_TYPES: IeiPhotoBackgroundType[] = [
  "sky",
  "light_gray",
  "warm_beige",
  "pale_blue",
  "pale_pink",
  "auto",
];
const GRADIENT_BACKGROUND_TYPES: IeiPhotoBackgroundType[] = [
  "light_gray",
  "warm_beige",
  "pale_blue",
  "pale_pink",
];
const VALID_CLOTHING: IeiPhotoClothingStyle[] = [
  "none",
  "mourning_japanese",
  "mourning_western",
  "suit",
  "casual",
];
const VALID_POSE: IeiPhotoPose[] = [
  "none",
  "front",
  "slight_right",
  "slight_left",
  "upright",
];
const VALID_SMILE_LEVELS: IeiPhotoSmileLevel[] = [
  "slight",
  "natural",
  "broad",
];
const VALID_TEETH_VISIBILITY: IeiPhotoTeethVisibility[] = [
  "closed",
  "slight",
  "clear",
];
const VALID_TARGETS = ["portrait", "wide"] as const;
type IeiPhotoAiTarget = (typeof VALID_TARGETS)[number];

type JsonErrorOptions = {
  code?: string;
  retryableWithSafetyCrop?: boolean;
};

function jsonError(
  message: string,
  status: number,
  options: JsonErrorOptions = {},
): Response {
  return Response.json({ ok: false, message, ...options }, { status });
}

type OpenAiErrorSummary = {
  code?: string;
  type?: string;
  moderationStage?: string;
  categories?: string[];
};

function summarizeOpenAiError(data: unknown): OpenAiErrorSummary {
  if (!data || typeof data !== "object") return {};

  const error = (data as { error?: unknown }).error;
  if (!error || typeof error !== "object") return {};

  const record = error as {
    code?: unknown;
    type?: unknown;
    moderation_details?: unknown;
  };
  const details =
    record.moderation_details && typeof record.moderation_details === "object"
      ? (record.moderation_details as {
          moderation_stage?: unknown;
          categories?: unknown;
        })
      : null;

  return {
    code: typeof record.code === "string" ? record.code : undefined,
    type: typeof record.type === "string" ? record.type : undefined,
    moderationStage:
      typeof details?.moderation_stage === "string"
        ? details.moderation_stage
        : undefined,
    categories: Array.isArray(details?.categories)
      ? details.categories.filter(
          (category): category is string => typeof category === "string",
        )
      : undefined,
  };
}

function readOption<T extends string>(
  form: FormData,
  fieldName: string,
  validValues: readonly T[],
  defaultValue: T,
): T {
  const raw = form.get(fieldName);
  return typeof raw === "string" && validValues.includes(raw as T)
    ? (raw as T)
    : defaultValue;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError(
      "OPENAI_API_KEY が未設定です。サーバーの環境変数に OpenAI APIキーを設定してください。",
      503,
    );
  }
  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("フォームデータの解析に失敗しました。", 400);
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return jsonError("画像ファイル（image）が見つかりません。", 400);
  }

  const targetRaw = String(form.get("target") ?? "portrait");
  const target = VALID_TARGETS.includes(targetRaw as IeiPhotoAiTarget)
    ? (targetRaw as IeiPhotoAiTarget)
    : "portrait";
  const mask = form.get("mask");
  if (target === "wide" && !(mask instanceof File)) {
    return jsonError("16:9生成用のマスク画像（mask）が見つかりません。", 400);
  }

  const modeRaw = String(form.get("mode") ?? "");
  const mode = VALID_MODES.includes(modeRaw as IeiPhotoAiImageMode)
    ? (modeRaw as IeiPhotoAiImageMode)
    : null;
  if (!mode) {
    return jsonError("AIモード（mode）が不正です。", 400);
  }

  const clothingRaw = String(form.get("clothingStyle") ?? "none");
  const clothingStyle = VALID_CLOTHING.includes(
    clothingRaw as IeiPhotoClothingStyle,
  )
    ? (clothingRaw as IeiPhotoClothingStyle)
    : "none";

  const poseRaw = String(form.get("pose") ?? "none");
  const pose = VALID_POSE.includes(poseRaw as IeiPhotoPose)
    ? (poseRaw as IeiPhotoPose)
    : "none";

  const backgroundRaw = String(form.get("backgroundType") ?? "auto");
  const backgroundType = VALID_BACKGROUND_TYPES.includes(
    backgroundRaw as IeiPhotoBackgroundType,
  )
    ? (backgroundRaw as IeiPhotoBackgroundType)
    : "auto";
  const backgroundGradient =
    String(form.get("backgroundGradient") ?? "false") === "true" &&
    GRADIENT_BACKGROUND_TYPES.includes(backgroundType);
  const expression: IeiPhotoExpressionSettings = {
    enabled: String(form.get("expressionEnabled") ?? "false") === "true",
    smile: readOption(form, "smileLevel", VALID_SMILE_LEVELS, "natural"),
    eyeBrightness: String(form.get("eyeBrightness") ?? "false") === "true",
    teethVisibility: readOption(
      form,
      "teethVisibility",
      VALID_TEETH_VISIBILITY,
      "closed",
    ),
  };
  const extraPromptRaw = form.get("prompt");
  const extraPrompt =
    typeof extraPromptRaw === "string" ? extraPromptRaw : undefined;

  const prompt =
    target === "wide"
      ? buildWideMonitorPrompt(backgroundType, backgroundGradient, extraPrompt)
      : buildAiPrompt(
          mode,
          clothingStyle,
          pose,
          backgroundType,
          backgroundGradient,
          expression,
          extraPrompt,
        );

  // OpenAI Images edit へ転送する multipart を組み立てる。
  const upstreamForm = new FormData();
  upstreamForm.append("model", model);
  upstreamForm.append("image", image, image.name || "input.jpg");
  if (target === "wide" && mask instanceof File) {
    upstreamForm.append("mask", mask, mask.name || "mask.png");
  }
  upstreamForm.append("prompt", prompt);
  upstreamForm.append("n", "1");
  upstreamForm.append("output_format", "png");
  upstreamForm.append("quality", "high");
  upstreamForm.append("size", target === "wide" ? "1536x864" : "1024x1536");

  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_EDITS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
      signal: AbortSignal.timeout(OPENAI_FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return jsonError(
        "AI処理がタイムアウトしました。少し待って再試行するか、画像サイズを小さくしてお試しください。",
        504,
      );
    }
    return jsonError(
      "OpenAI への接続に失敗しました。時間をおいて再試行してください。",
      502,
    );
  }

  if (!upstream.ok) {
    const status = upstream.status;
    let openAiError: OpenAiErrorSummary = {};
    try {
      openAiError = summarizeOpenAiError(await upstream.json());
    } catch {
      openAiError = {};
    }
    // 秘密情報は載せない。状態コードから分かりやすいメッセージに変換する。
    let message: string;
    if (status === 401) {
      message =
        "OpenAI の認証に失敗しました。OPENAI_API_KEY を確認してください。";
    } else if (status === 429) {
      message =
        "OpenAI の利用上限またはレート制限に達しました。時間をおいて再試行してください。";
    } else if (status === 413) {
      message =
        "画像サイズが大きすぎます。画像を小さくして再試行してください。";
    } else if (status === 400 && openAiError.code === "moderation_blocked") {
      message =
        "OpenAI の安全判定により、このままの構図ではAI生成できませんでした。写真の下部をAI送信用に調整して再試行します。";
    } else if (status === 400) {
      message =
        "AI生成リクエストが受け付けられませんでした。別の画像でお試しください。";
    } else {
      message = `OpenAI がエラーを返しました（HTTP ${status}）。時間をおいて再試行してください。`;
    }
    // ログは状態コードのみ（本文・キー・base64 は出さない）。
    console.log(
      `[iei-photo/ai-image] openai error status=${status} mode=${mode} target=${target} code=${openAiError.code ?? "unknown"} stage=${openAiError.moderationStage ?? "unknown"} categories=${openAiError.categories?.join(",") ?? "none"}`,
    );
    return jsonError(
      message,
      502,
      openAiError.code === "moderation_blocked"
        ? { code: "moderation_blocked", retryableWithSafetyCrop: true }
        : {},
    );
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return jsonError("OpenAI から不正な応答が返りました。", 502);
  }

  const b64 = extractB64(data);
  if (!b64) {
    return jsonError("AI生成に失敗しました（画像が返りませんでした）。", 502);
  }

  let pngBuffer: Buffer;
  try {
    pngBuffer = Buffer.from(b64, "base64");
  } catch {
    return jsonError("AI生成画像のデコードに失敗しました。", 502);
  }

  console.log(`[iei-photo/ai-image] success mode=${mode} target=${target}`);
  return new Response(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}

/** OpenAI Images のレスポンスから b64_json を取り出す。 */
function extractB64(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const arr = (data as { data?: unknown }).data;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const first = arr[0] as { b64_json?: unknown };
  return typeof first?.b64_json === "string" && first.b64_json
    ? first.b64_json
    : null;
}
