/**
 * OpenAI 呼び出し（テキスト生成）。
 *
 * - 既存の app/api/iei-photo/ai-image/route.ts と同じく、SDK を足さず fetch で REST を叩く。
 * - Responses API（/v1/responses）を使用。
 * - APIキー・リクエスト本文・レスポンス全文はログに出さない（呼び出し側で状態のみ記録）。
 */

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
// 推論モデル（gpt-5 系）は本文生成に時間がかかるため余裕を持たせる。
const OPENAI_FETCH_TIMEOUT_MS = 110_000;
// 推論トークン＋本文（最丁寧×複数セクション）で枠を使い切らないよう十分に確保。
const MAX_OUTPUT_TOKENS = 8000;

const SYSTEM_INSTRUCTIONS =
  "あなたは日本の葬儀司会者向けの台本ナレーションを作成する専門家です。指示された文体・構成ルールに従い、出力は指定のJSONオブジェクトのみとします。";

export type NarrationDraft = { id: string; body: string };

export type GenerateResult =
  | { ok: true; drafts: NarrationDraft[] }
  | { ok: false; status: number; reason: string };

/** Responses API のレスポンスから本文テキストを取り出す。 */
function extractOutputText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const obj = data as Record<string, unknown>;

  // SDK 互換の集約フィールドがあれば優先
  if (typeof obj.output_text === "string" && obj.output_text) {
    return obj.output_text;
  }

  const output = obj.output;
  if (!Array.isArray(output)) return "";

  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (!c || typeof c !== "object") continue;
      const type = (c as { type?: unknown }).type;
      const text = (c as { text?: unknown }).text;
      if (
        (type === "output_text" || type === "text") &&
        typeof text === "string"
      ) {
        parts.push(text);
      }
    }
  }
  return parts.join("");
}

/** モデルの出力テキストから JSON を取り出し、drafts 配列へ変換する。 */
function parseDrafts(text: string): NarrationDraft[] | null {
  if (!text) return null;
  // コードフェンスを除去し、最初の { 〜 最後の } を取り出す
  const stripped = text.replace(/```json/gi, "").replace(/```/g, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const sections = (parsed as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return null;

  const drafts: NarrationDraft[] = [];
  for (const s of sections) {
    if (!s || typeof s !== "object") continue;
    const id = (s as { id?: unknown }).id;
    const body = (s as { body?: unknown }).body;
    if (typeof id === "string" && typeof body === "string") {
      drafts.push({ id, body });
    }
  }
  return drafts;
}

/**
 * ナレーションを生成する。
 * 成功: { ok:true, drafts }。失敗: { ok:false, status, reason }（reason は安全な短い識別子）。
 */
export async function generateNarrations(params: {
  apiKey: string;
  model: string;
  prompt: string;
  instructions?: string;
}): Promise<GenerateResult> {
  const { apiKey, model, prompt, instructions } = params;

  // reasoning を付けて呼ぶ（推論モデルの推論トークン・遅延を抑える）。
  // 非推論モデルは reasoning 非対応で 400 になり得るため、その場合は reasoning 無しで再試行。
  const callOnce = (includeReasoning: boolean): Promise<Response> => {
    const body: Record<string, unknown> = {
      model,
      instructions: instructions ?? SYSTEM_INSTRUCTIONS,
      input: prompt,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    };
    if (includeReasoning) body.reasoning = { effort: "low" };
    return fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(OPENAI_FETCH_TIMEOUT_MS),
    });
  };

  let upstream: Response;
  try {
    upstream = await callOnce(true);
    // reasoning 非対応モデル等で 400 のときは reasoning を外して一度だけ再試行
    if (upstream.status === 400) {
      upstream = await callOnce(false);
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return { ok: false, status: 504, reason: "timeout" };
    }
    return { ok: false, status: 502, reason: "network" };
  }

  if (!upstream.ok) {
    return { ok: false, status: upstream.status, reason: "openai_http" };
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return { ok: false, status: 502, reason: "bad_json" };
  }

  const text = extractOutputText(data);
  const drafts = parseDrafts(text);
  if (!drafts || drafts.length === 0) {
    return { ok: false, status: 502, reason: "empty" };
  }
  return { ok: true, drafts };
}
