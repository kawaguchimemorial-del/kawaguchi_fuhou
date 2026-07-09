/**
 * 遺影写真作成機能の共通型定義（MVP）
 *
 * 注意:
 * - ここはあくまで「土台」であり、実際の画像処理はまだ実装していません。
 * - 画像処理の実行は将来 lib/iei-photo/mock-job.ts の差し替え（外部GPUサーバー等）で行います。
 */

/**
 * AI生成モード。
 * 各モードで「何をして良いか／何をしてはいけないか」は image-rules.ts に明示しています。
 * 標準は本人らしさを守り、人物を勝手に別人化させない設計です。
 */
export type IeiPhotoMode =
  | "AI_STANDARD" // AI標準生成（本人らしさ保持。背景・明るさ・色味・構図を整える）
  | "AI_ADVANCED" // 高度AI補正（白飛び・強い影・背景境界・服まわりなどをAI補正）
  | "AI_PORTRAIT"; // AI肖像生成（元写真の状態が悪い場合の最終手段）

/**
 * ジョブの進行状態。
 */
export type IeiPhotoJobStatus =
  | "queued" // 受付済み
  | "analyzing" // 写真を解析中
  | "configuring" // AI生成設定を確認中
  | "creating_base" // 基準写真を生成中
  | "checking_quality" // 品質を確認中
  | "completed" // 完了
  | "failed"; // 失敗

/**
 * 出力サイズの種類。
 * - base:      基準写真（まずこの1枚を作り、他はここから切り出す）
 * - tesatsu:   手札サイズ
 * - yotsugiri: 四つ切りサイズ
 * - monitor169:16:9 モニター用
 */
export type IeiPhotoExportKind = "base" | "tesatsu" | "yotsugiri" | "monitor169";

/**
 * /api/iei-photo/analyze のレスポンス内の診断結果。
 */
export type IeiPhotoDiagnosis = {
  overexposed: boolean; // 白飛びしているか
  blurred: boolean; // ブレ・ボケがあるか
  faceDetected: boolean; // 顔が検出できたか
  recommendedMode: IeiPhotoMode; // 推奨する加工モード
};

export type IeiPhotoAnalyzeResponse = {
  ok: boolean;
  diagnosis: IeiPhotoDiagnosis;
};

/**
 * /api/iei-photo/create-job のレスポンス。
 */
export type IeiPhotoCreateJobResponse = {
  ok: boolean;
  jobId: string;
  status: IeiPhotoJobStatus;
};

/**
 * /api/iei-photo/status のレスポンス。
 */
export type IeiPhotoStatusResponse = {
  ok: boolean;
  jobId: string;
  status: IeiPhotoJobStatus;
  progress: number; // 0-100
};

/**
 * 出力結果。値が null の場合は「まだ生成されていない」ことを表す。
 * MVP では実画像が無いため、すべて null を返します。
 */
export type IeiPhotoExports = {
  base: string | null;
  tesatsu: string | null;
  yotsugiri: string | null;
  monitor169: string | null;
};

export type IeiPhotoExportResponse = {
  ok: boolean;
  exports: IeiPhotoExports;
};

/**
 * 手動補正の調整値（すべてブラウザ内 Canvas で適用。AI は不使用）。
 * - brightness / contrast / saturation: パーセント（100 = 無補正）
 * - zoom: パーセント（100 = 現在の中央 cover と同じ。100未満で縮小）
 * - offsetX / offsetY: 基準写真キャンバスに対する移動量（パーセント, 0 = 中央）
 */
export type IeiPhotoAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

/**
 * 服装選択（AIモードのみ有効）。
 * 通常生成（AI標準生成 / rembg+Canvas）では服装変更は行わない。
 */
export type IeiPhotoClothingStyle =
  | "none" // 服装はそのまま
  | "mourning_japanese" // 喪服（和装）
  | "mourning_western" // 喪服（洋装）
  | "suit" // スーツ
  | "casual"; // カジュアル

/**
 * 体勢・向き（AIモードのみ）。AI生成プロンプトに反映する。
 * 通常生成（AI標準 / rembg+Canvas）では使用しない。
 */
export type IeiPhotoPose =
  | "none" // 指定なし
  | "front" // 正面を向く
  | "slight_right" // やや右向き
  | "slight_left" // やや左向き
  | "upright"; // 姿勢を正す

/**
 * AI画像処理のモード（/api/iei-photo/ai-image に渡す）。
 * - advanced: 高度AI補正
 * - portrait: AI肖像生成
 * - auto: AIに全てお任せ
 */
export type IeiPhotoAiImageMode = "advanced" | "portrait" | "auto";

/** 直近のAI結果の種別（無ければ null）。 */
export type IeiPhotoAiResultMode = IeiPhotoAiImageMode | null;

/** 脱AI処理（肌なじませ）の強度。 */
export type IeiPhotoDeAiStrength = "light" | "standard" | "strong";

export type IeiPhotoSmileLevel = "slight" | "natural" | "broad";

export type IeiPhotoTeethVisibility = "closed" | "slight" | "clear";

/**
 * AI生成時に使う表情の微調整設定。
 * enabled=false の場合は表情指示を追加せず、元写真の表情維持を優先する。
 */
export type IeiPhotoExpressionSettings = {
  enabled: boolean;
  smile: IeiPhotoSmileLevel;
  eyeBrightness: boolean;
  teethVisibility: IeiPhotoTeethVisibility;
};

/**
 * AI生成後チェック項目（目視確認用）。
 * 現状は自動判定せず「要確認」を表示するだけ。将来、自動判定で status を更新できる設計。
 */
export type IeiPhotoAiCheckItem = {
  label: string;
  status: "needs_review" | "ok" | "warning";
  note: string;
};

/**
 * 背景設定。
 * 現行UIでは、選択した背景テーマを AI 画像生成プロンプトに渡す。
 * 別背景画像の切り抜き合成は行わない。
 *
 * white / gradient / photo は旧UI互換の内部値。新しい画面には表示しない。
 */
export type IeiPhotoBackgroundType =
  | "sky" // 空
  | "light_gray" // 薄いグレー
  | "warm_beige" // 淡いベージュ
  | "pale_blue" // 淡いブルー
  | "pale_pink" // 淡いピンク
  | "auto" // AIにお任せ
  | "white" // 旧UI互換: 白
  | "gradient" // グラデーション
  | "photo"; // 旧UI互換: 写真背景

export type IeiPhotoBackgroundSettings = {
  type: IeiPhotoBackgroundType;
  /** グレー/ベージュ/ブルー/ピンクのみ。背景を同系色のグラデーションにする。 */
  gradient?: boolean;
};

/**
 * 品質チェック項目。UI 表示用（MVP ではモック値）。
 */
export type IeiPhotoQualityCheckItem = {
  key:
    | "identityLikeness" // 本人らしさ
    | "featureRetention" // 顔・髪・服の保持
    | "aiArtifact" // AIっぽさ
    | "exposureShadow" // 白飛び・影
    | "backgroundNaturalness"; // 背景自然さ
  label: string;
  /** pending: 未判定 / pass: 合格 / warn: 要確認 / fail: 不合格 */
  status: "pending" | "pass" | "warn" | "fail";
  description: string;
  /** 補足表示（例: 「元写真ピクセル使用」「AI未使用」「未実装」） */
  note?: string;
};
