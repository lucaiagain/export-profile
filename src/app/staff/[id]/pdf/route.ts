import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pdfFileName, renderProfilePdf } from "@/lib/pdf";
import { viewForRow } from "@/lib/profile-view";
import { staffEmail } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await staffEmail())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { id } = await params;
  const p = await db().getProfile(id);
  if (!p?.result) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
  const pdf = await renderProfilePdf(viewForRow(p));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${pdfFileName(p.company_name)}"`,
      "cache-control": "no-store",
    },
  });
}
