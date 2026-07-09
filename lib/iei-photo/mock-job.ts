/**
 * モックジョブ（MVP）＝ 将来の画像処理連携の「入口」
 *
 * ここは実画像処理を行いません。代わりに、将来の連携ポイントを1か所に集約しています。
 *
 * 将来の置き換え想定:
 * - runIeiPhotoJob() の中身を、外部GPUサーバー / RunPod / ComfyUI / Python画像処理API
 *   への HTTP リクエストに差し替える。
 * - Vercel Functions 上で重い画像処理は行わない前提（タイムアウト・コスト対策）。
 *   Vercel 側はジョブの受付・状態管理・結果の受け渡しに専念する。
 *
 * 秘密鍵・APIキーはここに直接書かない。将来は環境変数（process.env）経由で参照する。
 */

import type {
  IeiPhotoDiagnosis,
  IeiPhotoExports,
  IeiPhotoJobStatus,
  IeiPhotoMode,
} from "./types";

/** モックの jobId を生成する（衝突回避のため index ベースのサフィックスを付与）。 */
export function createMockJobId(seed?: string | number): string {
  const suffix =
    seed !== undefined ? String(seed) : Math.floor(performance.now()).toString(36);
  return `mock-job-${suffix}`;
}

/** モックの解析結果を返す。実際の解析は将来この関数を差し替える。 */
export function mockAnalyze(): IeiPhotoDiagnosis {
  return {
    overexposed: false,
    blurred: false,
    faceDetected: true,
    recommendedMode: "AI_STANDARD",
  };
}

/** モックの空の出力結果。実画像が無いため、すべて null。 */
export function mockEmptyExports(): IeiPhotoExports {
  return {
    base: null,
    tesatsu: null,
    yotsugiri: null,
    monitor169: null,
  };
}

/**
 * UI のモック進行表示で使うステップ定義。
 * 実処理に置き換える際は、外部処理側から進捗を受け取って更新する。
 */
export type IeiPhotoMockStep = {
  status: IeiPhotoJobStatus;
  label: string;
  progress: number;
  /** UI が次のステップへ進むまでの待機時間（ms） */
  delayMs: number;
};

export const IEI_PHOTO_MOCK_STEPS: IeiPhotoMockStep[] = [
  { status: "analyzing", label: "写真を解析中", progress: 15, delayMs: 1000 },
  {
    status: "configuring",
    label: "AI生成設定を確認中",
    progress: 35,
    delayMs: 1000,
  },
  {
    status: "creating_base",
    label: "基準写真を生成中",
    progress: 60,
    delayMs: 1400,
  },
  {
    status: "checking_quality",
    label: "品質を確認中",
    progress: 85,
    delayMs: 1100,
  },
  { status: "completed", label: "完了", progress: 100, delayMs: 0 },
];

/**
 * 将来の本処理連携用シグネチャ（現状は未実装の入口）。
 *
 * @param _input 元画像や選択モードなどの入力（将来定義）
 * @returns 出力結果
 *
 * TODO(画像処理連携):
 *   ここで外部の画像処理サービスへジョブを投げ、結果（実画像のURL等）を受け取る。
 *   例) const res = await fetch(process.env.IEI_PHOTO_WORKER_URL!, { ... })
 */
export async function runIeiPhotoJob(input: {
  mode: IeiPhotoMode;
  /** 将来: 元画像の参照（Blob URL / ストレージキー等） */
  sourceRef?: string;
}): Promise<IeiPhotoExports> {
  // MVP: 実処理は未実装。入力は将来の外部連携でそのまま使用する。
  void input;
  return mockEmptyExports();
}
