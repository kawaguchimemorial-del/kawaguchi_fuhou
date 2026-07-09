/**
 * POST /api/iei-photo/analyze
 *
 * 元写真を解析して、白飛び・ブレ・顔検出・推奨モードを返す（MVP ではモック）。
 * 実際の解析は将来 lib/iei-photo/mock-job.ts 経由で外部処理に差し替える。
 */

import type { IeiPhotoAnalyzeResponse } from "@/lib/iei-photo/types";
import { mockAnalyze } from "@/lib/iei-photo/mock-job";

export async function POST(): Promise<Response> {
  const body: IeiPhotoAnalyzeResponse = {
    ok: true,
    diagnosis: mockAnalyze(),
  };

  return Response.json(body);
}
