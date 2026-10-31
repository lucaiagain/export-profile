import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { DEV_COOKIE, supabaseAuth } from "@/lib/staff-auth";

export async function POST(req: Request) {
  if (config.useDevStore) (await cookies()).delete(DEV_COOKIE);
  else await (await supabaseAuth()).auth.signOut();
  return NextResponse.redirect(new URL("/staff/accedi", req.url), 303);
}
