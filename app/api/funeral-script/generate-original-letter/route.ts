/**
 * POST /api/funeral-script/generate-original-letter
 *
 * オリジナル会葬礼状の本文だけを OpenAI で再生成する。
 * 司会台本セクションには触れず、喪主・ご家族からの修正指示を反映した礼状本文を返す。
 */

import { generateNarrations } from "@/lib/funeral-script/ai";
import {
  buildOriginalLetterPrompt,
  ORIGINAL_LETTER_SYSTEM_INSTRUCTIONS,
} from "@/lib/funeral-script/letter-prompt";
import {
  buildOriginalCondolenceLetter,
  detectOriginalLetterWarnings,
  normalizeOriginalLetterBody,
  ORIGINAL_LETTER_ID,
} from "@/lib/funeral-script/original-letter";
import type {
  FuneralScriptFormData,
  FuneralScriptOriginalLetter,
  GenerateNarrationError,
  GenerateOriginalLetterResponse,
} from "@/lib/funeral-script/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_TEXT_MODEL = "claude-opus-4-8";
const GENERIC_FAIL =
  "オリジナル会葬礼状のAI再生成に失敗しました。現在の本文はそのまま編集・利用できます。";

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
      "ANTHROPIC_API_KEY が未設定です。サーバーの環境変数に Claude APIキーを設定してください。現在の礼状本文はそのまま編集・利用できます。",
      503,
    );
  }
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_TEXT_MODEL;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("リクエストの解析に失敗しました。", 400);
  }

  const form = (payload as { form?: unknown }).form as
    | FuneralScriptFormData
    | undefined;
  const currentLetter = (payload as { currentLetter?: unknown })
    .currentLetter as FuneralScriptOriginalLetter | null | undefined;

  if (!form || typeof form !== "object") {
    return errorResponse("リクエスト内容が不正です。", 400);
  }
  if (!form.hasOriginalCondolenceLetter) {
    return errorResponse("オリジナル会葬礼状の作成が選択されていません。", 400);
  }

  const fallback = buildOriginalCondolenceLetter(form);
  const prompt = buildOriginalLetterPrompt({
    form,
    currentLetter: currentLetter ?? fallback,
  });
  const result = await generateNarrations({
    apiKey,
    model,
    prompt,
    instructions: ORIGINAL_LETTER_SYSTEM_INSTRUCTIONS,
  });

  if (!result.ok) {
    console.log(
      `[funeral-script/generate-original-letter] fail status=${result.status} reason=${result.reason}`,
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
    return errorResponse(GENERIC_FAIL, result.status === 504 ? 504 : 502);
  }

  const generated = result.drafts.find((d) => d.id === ORIGINAL_LETTER_ID);
  if (!generated?.body.trim()) {
    return errorResponse(GENERIC_FAIL, 502);
  }

  const body = normalizeOriginalLetterBody(generated.body);
  const letter: FuneralScriptOriginalLetter = {
    id: ORIGINAL_LETTER_ID,
    title: "オリジナル会葬礼状",
    body,
    aiGenerated: true,
    updatedAt: new Date().toISOString(),
  };
  const warnings = detectOriginalLetterWarnings(body);

  console.log(
    `[funeral-script/generate-original-letter] ok warnings=${warnings.length}`,
  );

  const response: GenerateOriginalLetterResponse = { letter, warnings };
  return Response.json(response);
}
