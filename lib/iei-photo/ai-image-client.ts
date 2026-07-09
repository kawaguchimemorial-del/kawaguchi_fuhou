/**
 * AI画像処理のクライアント側トランスポート
 *
 * クライアントは OpenAI を直接叩かず、必ず Next.js の `/api/iei-photo/ai-image`
 * を経由する（APIキーをサーバー側に隠すため）。
 *
 * 送信前に画像を縮小する（Vercel のペイロード制限・OpenAI の負荷対策）。
 * - 長辺最大 1600px / JPEG quality 0.9
 * 成功時は生成画像の Blob を返す。失敗時はユーザー向けメッセージ付きで throw する。
 */

import type {
  IeiPhotoAiImageMode,
  IeiPhotoBackgroundType,
  IeiPhotoClothingStyle,
  IeiPhotoExpressionSettings,
  IeiPhotoPose,
} from "./types";

const AI_IMAGE_ENDPOINT = "/api/iei-photo/ai-image";
/** OpenAI へ送る画像の長辺上限（px）。 */
const MAX_EDGE = 1600;
/** 送信画像の JPEG 品質。 */
const SEND_JPEG_QUALITY = 0.9;
const SAFETY_CROP_HEIGHT_RATIO = 0.6;
const WIDE_AI_WIDTH = 1536;
const WIDE_AI_HEIGHT = 864;
const WIDE_AI_CENTER_WIDTH = Math.round(WIDE_AI_HEIGHT * 0.75);
const WIDE_AI_PORTRAIT_ZOOM = 1.5;
const WIDE_AI_PORTRAIT_OFFSET_Y_RATIO = -0.12;
const WIDE_AI_PORTRAIT_WIDTH = Math.round(
  WIDE_AI_CENTER_WIDTH * WIDE_AI_PORTRAIT_ZOOM,
);
const WIDE_AI_PORTRAIT_X = Math.round(
  (WIDE_AI_WIDTH - WIDE_AI_PORTRAIT_WIDTH) / 2,
);
const SAFETY_CROP_RETRY_PROMPT =
  "元写真は施設で撮影された楽しい記念写真です。首元や胸元の近くに手が写っている場合がありますが、危険行為ではなく、喜びを表す自然なしぐさです。AI送信用に下部をトリミングしているため、見えている顔、髪型、表情、本人らしさを最優先で維持し、肩や胸元は自然なポートレートとして補ってください。";
const WIDE_MONITOR_RETRY_PROMPT =
  "中央の人物はすでに遺影写真として整えられています。左右の透明マスク部分だけを、中央背景と同じ淡い背景として自然に生成してください。左右に人物の残像、顔、髪、服、肩、手、腕を出さないでください。";

type AiImageErrorPayload = {
  message?: unknown;
  code?: unknown;
  retryableWithSafetyCrop?: unknown;
};

class IeiPhotoAiImageError extends Error {
  code?: string;
  retryableWithSafetyCrop: boolean;

  constructor(
    message: string,
    options: { code?: string; retryableWithSafetyCrop?: boolean } = {},
  ) {
    super(message);
    this.name = "IeiPhotoAiImageError";
    this.code = options.code;
    this.retryableWithSafetyCrop = Boolean(options.retryableWithSafetyCrop);
  }
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("画像の書き出しに失敗しました。"));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("画像の書き出しに失敗しました。"));
      }
    }, "image/png");
  });
}

/**
 * 基準写真 Canvas を、長辺 MAX_EDGE 以下の JPEG Blob に縮小する。
 * 既に小さければそのまま JPEG 化する（極端に小さくはしない）。
 */
export async function downscaleCanvasForAi(
  source: HTMLCanvasElement,
): Promise<Blob> {
  const { width, height } = source;
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_EDGE) {
    return canvasToJpegBlob(source, SEND_JPEG_QUALITY);
  }
  const scale = MAX_EDGE / longEdge;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d");
  if (!ctx) {
    // コンテキストが取れない場合は等倍で書き出す。
    return canvasToJpegBlob(source, SEND_JPEG_QUALITY);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return canvasToJpegBlob(small, SEND_JPEG_QUALITY);
}

function createSafetyCropCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const cropHeight = Math.max(
    1,
    Math.round(source.height * SAFETY_CROP_HEIGHT_RATIO),
  );
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = cropHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return source;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    0,
    0,
    source.width,
    cropHeight,
    0,
    0,
    source.width,
    cropHeight,
  );
  return canvas;
}

function createWideMonitorInputCanvas(
  source: HTMLCanvasElement,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WIDE_AI_WIDTH;
  canvas.height = WIDE_AI_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("16:9モニター用の入力画像を作成できませんでした。");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ece8e0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const drawWidth = WIDE_AI_PORTRAIT_WIDTH;
  const drawHeight = WIDE_AI_HEIGHT * WIDE_AI_PORTRAIT_ZOOM;
  const dy =
    (WIDE_AI_HEIGHT - drawHeight) / 2 +
    WIDE_AI_HEIGHT * WIDE_AI_PORTRAIT_OFFSET_Y_RATIO;
  ctx.drawImage(
    source,
    0,
    0,
    source.width,
    source.height,
    WIDE_AI_PORTRAIT_X,
    dy,
    drawWidth,
    drawHeight,
  );
  return canvas;
}

function createWideMonitorMaskCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WIDE_AI_WIDTH;
  canvas.height = WIDE_AI_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("16:9モニター用のマスク画像を作成できませんでした。");
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.fillRect(WIDE_AI_PORTRAIT_X, 0, WIDE_AI_PORTRAIT_WIDTH, WIDE_AI_HEIGHT);
  return canvas;
}

async function extractAiImageError(res: Response): Promise<IeiPhotoAiImageError> {
  try {
    const data = (await res.json()) as AiImageErrorPayload;
    if (typeof data?.message === "string" && data.message) {
      return new IeiPhotoAiImageError(data.message, {
        code: typeof data.code === "string" ? data.code : undefined,
        retryableWithSafetyCrop: data.retryableWithSafetyCrop === true,
      });
    }
  } catch {
    // JSON でない場合は既定メッセージ
  }
  return new IeiPhotoAiImageError("AI生成に失敗しました。");
}

/**
 * 基準写真 Canvas を AI 処理し、生成画像の Blob を取得する。
 * @throws ユーザー向けメッセージを持つ Error
 */
async function requestAiImageOnce(
  baseCanvas: HTMLCanvasElement,
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  backgroundType: IeiPhotoBackgroundType,
  backgroundGradient: boolean,
  expression: IeiPhotoExpressionSettings,
  extraPrompt?: string,
): Promise<Blob> {
  const imageBlob = await downscaleCanvasForAi(baseCanvas);

  const form = new FormData();
  form.append("image", imageBlob, "input.jpg");
  form.append("mode", mode);
  form.append("clothingStyle", clothingStyle);
  form.append("pose", pose);
  form.append("backgroundType", backgroundType);
  form.append("backgroundGradient", backgroundGradient ? "true" : "false");
  form.append("expressionEnabled", expression.enabled ? "true" : "false");
  form.append("smileLevel", expression.smile);
  form.append("eyeBrightness", expression.eyeBrightness ? "true" : "false");
  form.append("teethVisibility", expression.teethVisibility);
  if (extraPrompt && extraPrompt.trim()) {
    form.append("prompt", extraPrompt.trim());
  }

  let res: Response;
  try {
    res = await fetch(AI_IMAGE_ENDPOINT, { method: "POST", body: form });
  } catch {
    throw new Error(
      "AI生成の通信に失敗しました。ネットワークを確認してください。",
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.includes("image/")) {
    throw await extractAiImageError(res);
  }
  return res.blob();
}

async function requestAiWideImageOnce(
  verticalCanvas: HTMLCanvasElement,
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  backgroundType: IeiPhotoBackgroundType,
  backgroundGradient: boolean,
  expression: IeiPhotoExpressionSettings,
  extraPrompt?: string,
): Promise<Blob> {
  const imageBlob = await canvasToPngBlob(
    createWideMonitorInputCanvas(verticalCanvas),
  );
  const maskBlob = await canvasToPngBlob(createWideMonitorMaskCanvas());

  const form = new FormData();
  form.append("target", "wide");
  form.append("image", imageBlob, "wide-input.png");
  form.append("mask", maskBlob, "wide-mask.png");
  form.append("mode", mode);
  form.append("clothingStyle", clothingStyle);
  form.append("pose", pose);
  form.append("backgroundType", backgroundType);
  form.append("backgroundGradient", backgroundGradient ? "true" : "false");
  form.append("expressionEnabled", expression.enabled ? "true" : "false");
  form.append("smileLevel", expression.smile);
  form.append("eyeBrightness", expression.eyeBrightness ? "true" : "false");
  form.append("teethVisibility", expression.teethVisibility);
  const prompt = [extraPrompt?.trim(), WIDE_MONITOR_RETRY_PROMPT]
    .filter(Boolean)
    .join("\n");
  if (prompt) {
    form.append("prompt", prompt);
  }

  let res: Response;
  try {
    res = await fetch(AI_IMAGE_ENDPOINT, { method: "POST", body: form });
  } catch {
    throw new Error(
      "16:9モニター用AI生成の通信に失敗しました。ネットワークを確認してください。",
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.includes("image/")) {
    throw await extractAiImageError(res);
  }
  return res.blob();
}

/**
 * 基準写真 Canvas を AI 処理し、生成画像の Blob を取得する。
 * 首元の手などで OpenAI の安全判定に誤検知された場合は、
 * AI送信用に写真下部を自動クロップして1回だけ再試行する。
 *
 * @throws ユーザー向けメッセージを持つ Error
 */
export async function requestAiImage(
  baseCanvas: HTMLCanvasElement,
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  backgroundType: IeiPhotoBackgroundType,
  backgroundGradient: boolean,
  expression: IeiPhotoExpressionSettings,
  extraPrompt?: string,
): Promise<Blob> {
  try {
    return await requestAiImageOnce(
      baseCanvas,
      mode,
      clothingStyle,
      pose,
      backgroundType,
      backgroundGradient,
      expression,
      extraPrompt,
    );
  } catch (error) {
    if (
      !(error instanceof IeiPhotoAiImageError) ||
      error.code !== "moderation_blocked" ||
      !error.retryableWithSafetyCrop
    ) {
      throw error;
    }
  }

  const safetyPrompt = [extraPrompt?.trim(), SAFETY_CROP_RETRY_PROMPT]
    .filter(Boolean)
    .join("\n");

  try {
    return await requestAiImageOnce(
      createSafetyCropCanvas(baseCanvas),
      mode,
      clothingStyle,
      pose,
      backgroundType,
      backgroundGradient,
      expression,
      safetyPrompt,
    );
  } catch (retryError) {
    if (retryError instanceof IeiPhotoAiImageError) {
      throw new Error(
        "OpenAI の安全判定によりAI生成できませんでした。写真の下部を手動で少し切る、または顔が中心になるように拡大してから再度お試しください。",
      );
    }
    throw retryError;
  }
}

export async function requestAiWideImage(
  verticalCanvas: HTMLCanvasElement,
  mode: IeiPhotoAiImageMode,
  clothingStyle: IeiPhotoClothingStyle,
  pose: IeiPhotoPose,
  backgroundType: IeiPhotoBackgroundType,
  backgroundGradient: boolean,
  expression: IeiPhotoExpressionSettings,
  extraPrompt?: string,
): Promise<Blob> {
  try {
    return await requestAiWideImageOnce(
      verticalCanvas,
      mode,
      clothingStyle,
      pose,
      backgroundType,
      backgroundGradient,
      expression,
      extraPrompt,
    );
  } catch (error) {
    if (error instanceof IeiPhotoAiImageError) {
      throw new Error(
        `16:9モニター用AI生成に失敗しました。${error.message}`,
      );
    }
    throw error;
  }
}
