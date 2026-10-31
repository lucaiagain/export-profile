import { NextResponse } from "next/server";
import { staffEmail } from "@/lib/staff-auth";
import { csv, filtersFrom, listProfiles } from "@/lib/staff-list";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await staffEmail())) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const rows = await listProfiles(filtersFrom(sp));
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="Export_Profile_${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
