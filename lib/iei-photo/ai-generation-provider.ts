/**
 * AI遺影写真生成プロバイダー設計（入口）
 *
 * 将来、AI遺影写真生成を「外部サービスへ差し替え可能」にするための抽象です。
 * 現時点では mock のみ実装し、実際の外部API呼び出し・APIキー・環境変数・fetch先URLは
 * 一切追加しません（次の開発ステップで接続予定）。
 *
 * 重要方針:
 * - AI標準生成（ai_standard）は本人らしさを守り、人物を勝手に別人化させない。
 *   現状の MVP では、人物再生成は行わず、ブラウザ内 Canvas（lib/iei-photo/client-export.ts）で
 *   基準写真を生成する「AI標準生成の仮実装」として扱う。
 * - 高度AI補正 / AI肖像生成は、外部画像処理API接続後に有効化する。
 */

import type { IeiPhotoMode } from "./types";

/** 将来差し替え可能なプロバイダー種別。 */
export type IeiPhotoAiProviderId =
  | "mock" // 現状のダミー（外部接続なし）
  | "openai_image" // 将来: 画像生成API
  | "external_background_api" // 将来: 背景差し替え等の外部API
  | "self_hosted_worker"; // 将来: 自前GPUワーカー / RunPod / ComfyUI 等

/** プロバイダーが担う生成の役割（モードに対応）。 */
export type IeiPhotoGenerationRole =
  | "ai_standard" // AI標準生成
  | "ai_advanced" // 高度AI補正
  | "ai_portrait"; // AI肖像生成

/** モード → 役割の対応。 */
export const IEI_PHOTO_MODE_TO_ROLE: Record<IeiPhotoMode, IeiPhotoGenerationRole> =
  {
    AI_STANDARD: "ai_standard",
    AI_ADVANCED: "ai_advanced",
    AI_PORTRAIT: "ai_portrait",
  };

/** 生成リクエスト（実データの受け渡しは将来拡張）。 */
export type IeiPhotoGenerationRequest = {
  role: IeiPhotoGenerationRole;
  /** 将来: 元画像の参照（Blob URL / ストレージキー等）。現状は未使用。 */
  sourceRef?: string;
  /** 手動補正など、将来プロバイダーに渡す設定。現状は未使用。 */
  options?: Record<string, unknown>;
};

/**
 * 生成結果。
 * - handledByCanvas: true の場合、実生成はクライアントの Canvas 側で行う（現状の AI標準生成）。
 * - resultRef: 将来、外部生成結果（画像URL等）を受け取るための枠。現状は null。
 */
export type IeiPhotoGenerationResult = {
  ok: boolean;
  provider: IeiPhotoAiProviderId;
  role: IeiPhotoGenerationRole;
  handledByCanvas: boolean;
  resultRef: string | null;
  /** UI / ログ用の補足メッセージ。 */
  message: string;
};

/** プロバイダー共通インターフェース。 */
export type IeiPhotoAiGenerationProvider = {
  id: IeiPhotoAiProviderId;
  /** その役割をこのプロバイダーが（将来含め）担えるか。 */
  supports: (role: IeiPhotoGenerationRole) => boolean;
  /** 生成を実行（mock は外部接続せず、Canvas 委譲のマーカーを返す）。 */
  generate: (
    request: IeiPhotoGenerationRequest,
  ) => Promise<IeiPhotoGenerationResult>;
};

/**
 * mock プロバイダー。
 * 外部API・APIキー・環境変数・fetch を一切使わない。
 * - ai_standard: Canvas 側の基準写真生成に委譲（handledByCanvas: true）。
 * - ai_advanced / ai_portrait: 未接続。次の開発ステップで外部API接続予定。
 */
export const mockAiGenerationProvider: IeiPhotoAiGenerationProvider = {
  id: "mock",
  supports: () => true,
  async generate({ role }) {
    if (role === "ai_standard") {
      return {
        ok: true,
        provider: "mock",
        role,
        handledByCanvas: true,
        resultRef: null,
        message:
          "現在のMVPでは、人物再生成は行わず、ブラウザ内Canvasで基準写真を生成しています。外部AI処理は次の開発ステップで接続します。",
      };
    }
    return {
      ok: false,
      provider: "mock",
      role,
      handledByCanvas: false,
      resultRef: null,
      message:
        role === "ai_advanced"
          ? "高度AI補正は次の開発ステップで外部画像処理APIと接続します。"
          : "AI肖像生成は次の開発ステップで外部画像処理APIと接続します。",
    };
  },
};

const PROVIDERS: Partial<
  Record<IeiPhotoAiProviderId, IeiPhotoAiGenerationProvider>
> = {
  mock: mockAiGenerationProvider,
  // openai_image / external_background_api / self_hosted_worker は将来実装。
};

/** 現在有効なプロバイダー（現状は mock 固定）。 */
export const ACTIVE_AI_PROVIDER_ID: IeiPhotoAiProviderId = "mock";

/**
 * プロバイダーを取得する。未実装IDを指定された場合は mock にフォールバックする。
 * 実API接続は将来この関数の戻り値を差し替えて行う（ここではまだ接続しない）。
 */
export function getAiGenerationProvider(
  id: IeiPhotoAiProviderId = ACTIVE_AI_PROVIDER_ID,
): IeiPhotoAiGenerationProvider {
  return PROVIDERS[id] ?? mockAiGenerationProvider;
}
