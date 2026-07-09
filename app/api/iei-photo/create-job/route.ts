/**
 * POST /api/iei-photo/create-job
 *
 * 加工ジョブを受け付け、jobId を払い出す（MVP ではモック）。
 * 実際の処理キュー連携は将来 lib/iei-photo/mock-job.ts 経由で差し替える。
 */

import type { IeiPhotoCreateJobResponse } from "@/lib/iei-photo/types";
import { createMockJobId } from "@/lib/iei-photo/mock-job";

export async function POST(): Promise<Response> {
  const body: IeiPhotoCreateJobResponse = {
    ok: true,
    jobId: createMockJobId(),
    status: "queued",
  };

  return Response.json(body);
}
