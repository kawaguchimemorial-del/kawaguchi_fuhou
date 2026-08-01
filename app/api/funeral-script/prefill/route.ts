import { getEstimate, listEstimatesByCustomer } from "@/lib/kanri/estimates";
import { prefillFromEstimate } from "@/lib/funeral-script/prefill";

export const dynamic = "force-dynamic";

/**
 * 司会台本フォームの初期値を、登録済みの施行（見積）から返す。
 *
 * - estimate_id 指定: その施行から取り込む。
 * - customer_id のみ: その顧客の施行が1件だけのときに限り、それを使う。
 *   複数ある場合は取り違えると別人の生年月日を読み上げることになるため、何も返さない。
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const estimateId = url.searchParams.get("estimate_id")?.trim();
  const customerId = url.searchParams.get("customer_id")?.trim();

  if (estimateId) {
    const e = await getEstimate(estimateId);
    if (!e) return Response.json({ ok: false, error: "施行が見つかりません。" }, { status: 404 });
    return Response.json({ ok: true, source: "estimate", prefill: prefillFromEstimate(e) });
  }

  if (customerId) {
    const list = await listEstimatesByCustomer(customerId);
    if (list.length !== 1) {
      // 0件＝取り込む情報が無い / 複数＝どの施行か決められない
      return Response.json({ ok: true, source: "none", prefill: null, candidates: list.length });
    }
    return Response.json({ ok: true, source: "estimate", prefill: prefillFromEstimate(list[0]) });
  }

  return Response.json({ ok: false, error: "estimate_id または customer_id が必要です。" }, { status: 400 });
}
