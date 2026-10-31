import { NextResponse } from "next/server";
import { runCleanup } from "@/lib/jobs";
import { isCron } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCron(req)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  return NextResponse.json(await runCleanup());
}
