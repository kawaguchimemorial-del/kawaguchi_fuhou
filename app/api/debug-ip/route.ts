import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const keys = ["x-forwarded-for", "x-real-ip", "x-vercel-forwarded-for", "x-vercel-ip-city", "cf-connecting-ip"];
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = h.get(k);
  let cryptoOk = false;
  try {
    const { createHash } = await import("crypto");
    createHash("sha256").update("x").digest("hex");
    cryptoOk = true;
  } catch {}
  return NextResponse.json({ headers: out, cryptoOk });
}
