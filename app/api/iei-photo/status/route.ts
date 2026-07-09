/**
 * GET /api/iei-photo/status?jobId=...
 *
 * ジョブの進行状況を返す（MVP ではモックで常に completed を返す）。
 * 実際の進捗取得は将来 lib/iei-photo/mock-job.ts 経由で外部処理に差し替える。
 */

import type { NextRequest } from "next/server";
import type { IeiPhotoStatusResponse } from "@/lib/iei-photo/types";

export async function GET(request: NextRequest): Promise<Response> {
  const jobId = request.nextUrl.searchParams.get("jobId") ?? "";

  const body: IeiPhotoStatusResponse = {
    ok: true,
    jobId,
    status: "completed",
    progress: 100,
  };

  return Response.json(body);
}
