/**
 * POST /api/funeral-script/generate-narration
 *
 * 固定テンプレートで生成済みの台本のうち、ai_placeholder セクション（ナレーション）だけを
 * OpenAI（Responses API）で生成して返す中継。進行順・セクションの増減は一切行わない。
 *
 * プライバシー/セキュリティ:
 * - 故人名・喪主名・家族構成・エピソード等の入力本文、OpenAI レスポンス全文、APIキーはログに出さない。
 * - OpenAI 呼び出しはこの Route Handler 内のみ（APIキーはクライアントへ渡さない）。
 */

import { generateNarrations } from "@/lib/funeral-script/ai";
import { buildFuneralNarrationPrompt } from "@/lib/funeral-script/prompt";
import { applyNgRewrite, NG_SUGGESTIONS } from "@/lib/funeral-script/ng-words";
import type {
  FuneralScriptFormData,
  FuneralScriptSection,
  GenerateNarrationError,
  GenerateNarrationResponse,
} from "@/lib/funeral-script/types";

export const runtime = "nodejs";
// 推論モデル（gpt-5 系）は本文生成に時間がかかるため、関数の上限を延長する。
export const maxDuration = 120;

const DEFAULT_TEXT_MODEL = "claude-opus-4-8";
const MAX_BODY_CHARS = 1200;
const GENERIC_FAIL =
  "AI生成に失敗しました。固定テンプレートの台本はそのまま利用できます。";

function errorResponse(
  error: string,
  status: number,
  detail?: string,
): Response {
  const body: GenerateNarrationError = detail ? { error, detail } : { error };
  return Response.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "ANTHROPIC_API_KEY が未設定です。サーバーの環境変数に Claude APIキーを設定してください。固定テンプレートの台本はそのまま利用できます。",
      503,
    );
  }
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_TEXT_MODEL;

  // ---- リクエスト解析 ----
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("リクエストの解析に失敗しました。", 400);
  }

  const form = (payload as { form?: unknown }).form as
    | FuneralScriptFormData
    | undefined;
  const sections = (payload as { sections?: unknown }).sections as
    | FuneralScriptSection[]
    | undefined;
  const targetSectionIds = (payload as { targetSectionIds?: unknown })
    .targetSectionIds as string[] | undefined;

  if (
    !form ||
    typeof form !== "object" ||
    !Array.isArray(sections) ||
    !Array.isArray(targetSectionIds)
  ) {
    return errorResponse("リクエスト内容が不正です。", 400);
  }

  // ---- 生成対象を ai_placeholder のみに限定 ----
  const idSet = new Set(targetSectionIds);
  const targetSections = sections.filter(
    (s) => s && s.kind === "ai_placeholder" && idSet.has(s.id),
  );

  if (targetSections.length === 0) {
    const empty: GenerateNarrationResponse = {
      sections: [],
      warnings: ["生成対象のナレーションセクションがありません。"],
    };
    return Response.json(empty);
  }

  // ---- プロンプト構築 → OpenAI 呼び出し ----
  const prompt = buildFuneralNarrationPrompt({ form, targetSections });
  const result = await generateNarrations({ apiKey, model, prompt });

  if (!result.ok) {
    // ログは状態のみ（本文・キー・個人情報は出さない）
    console.log(
      `[funeral-script/generate-narration] fail status=${result.status} reason=${result.reason}`,
    );
    if (result.status === 401) {
      return errorResponse(
        "Claude の認証に失敗しました。ANTHROPIC_API_KEY を確認してください。",
        502,
        GENERIC_FAIL,
      );
    }
    if (result.status === 429) {
      return errorResponse(
        "Claude の利用上限またはレート制限に達しました。時間をおいて再試行してください。",
        502,
        GENERIC_FAIL,
      );
    }
    if (result.status === 404 || result.status === 400) {
      return errorResponse(
        `テキストモデルの呼び出しに失敗しました（HTTP ${result.status}）。ANTHROPIC_MODEL（現在: ${/^sk-ant/.test(model) ? "※不正な値（APIキーが設定されています）" : model}）が正しいかご確認ください。`,
        502,
        GENERIC_FAIL,
      );
    }
    if (result.reason === "timeout") {
      return errorResponse(
        "AI生成に時間がかかり、タイムアウトしました。もう一度お試しください（長さを下げると速くなります）。",
        504,
        GENERIC_FAIL,
      );
    }
    if (
      result.reason === "empty" ||
      result.reason === "bad_json" ||
      result.reason === "parse"
    ) {
      return errorResponse(
        "AIの応答を取得できませんでした（応答が空、または形式が不正）。もう一度お試しください。",
        502,
        GENERIC_FAIL,
      );
    }
    return errorResponse(GENERIC_FAIL, 502);
  }

  // ---- 生成結果の検証・忌み言葉チェック ----
  const validIds = new Map(targetSections.map((s) => [s.id, s.title]));
  const out: GenerateNarrationResponse["sections"] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const draft of result.drafts) {
    const title = validIds.get(draft.id);
    if (!title) continue; // 生成対象外の id は無視
    if (seen.has(draft.id)) continue;
    const raw = draft.body.trim();
    if (!raw) continue; // 空本文は採用しない
    seen.add(draft.id);

    const { text, remaining } = applyNgRewrite(raw);
    for (const word of remaining) {
      const suggestion = NG_SUGGESTIONS[word];
      warnings.push(
        `「${word}」が含まれています（${title}）。${suggestion ? `「${suggestion}」への言い換えをご確認ください。` : "表現をご確認ください。"}`,
      );
    }
    if (text.length > MAX_BODY_CHARS) {
      warnings.push(
        `「${title}」のナレーションがやや長めです。読み上げ時間をご確認ください。`,
      );
    }

    out.push({ id: draft.id, title, body: text, aiGenerated: true });
  }

  // 生成されなかった対象があれば通知
  const missing = targetSections.filter((s) => !seen.has(s.id));
  if (missing.length > 0) {
    warnings.push(
      `一部のナレーション（${missing.map((s) => s.title).join("、")}）は生成されませんでした。再試行するか、手動で編集してください。`,
    );
  }

  if (out.length === 0) {
    return errorResponse(GENERIC_FAIL, 502);
  }

  console.log(
    `[funeral-script/generate-narration] ok targets=${targetSections.length} generated=${out.length} warnings=${warnings.length}`,
  );

  const response: GenerateNarrationResponse = { sections: out, warnings };
  return Response.json(response);
}
