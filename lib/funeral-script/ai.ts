/**
 * Claude(Anthropic) 呼び出し（テキスト生成）。
 *
 * - SDK を足さず fetch で Messages API（/v1/messages）を叩く（既存の他API呼び出しと同方針）。
 * - モデルは Claude Opus 4.8（既定）。adaptive思考で品質を確保。
 * - APIキー・リクエスト本文・レスポンス全文はログに出さない（呼び出し側で状態のみ記録）。
 */

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// 思考＋本文（高effort×複数セクション）で時間がかかるため余裕を持たせる。
const ANTHROPIC_FETCH_TIMEOUT_MS = 150_000;
// 思考トークン＋本文で枠を使い切らないよう十分に確保。
const MAX_OUTPUT_TOKENS = 8000;

const SYSTEM_INSTRUCTIONS =
  "あなたは日本の葬儀司会者向けの台本ナレーションを作成する専門家です。指示された文体・構成ルールに従い、出力は指定のJSONオブジェクトのみとします。";

export type NarrationDraft = { id: string; body: string };

export type GenerateResult =
  | { ok: true; drafts: NarrationDraft[] }
  | { ok: false; status: number; reason: string };

/** Messages API のレスポンスから本文テキストを取り出す（thinkingブロックは除外）。 */
function extractOutputText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const c of content) {
    if (!c || typeof c !== "object") continue;
    const type = (c as { type?: unknown }).type;
    const text = (c as { text?: unknown }).text;
    if (type === "text" && typeof text === "string") {
      parts.push(text);
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

  // Claude Messages API を fetch で呼ぶ。adaptive思考で品質を確保しつつ、
  // effort=medium で遅延・コストのバランスを取る。
  const body: Record<string, unknown> = {
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: instructions ?? SYSTEM_INSTRUCTIONS,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    messages: [{ role: "user", content: prompt }],
  };

  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ANTHROPIC_FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return { ok: false, status: 504, reason: "timeout" };
    }
    return { ok: false, status: 502, reason: "network" };
  }

  if (!upstream.ok) {
    return { ok: false, status: upstream.status, reason: "anthropic_http" };
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
