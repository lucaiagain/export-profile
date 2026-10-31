import { NextResponse } from "next/server";
import { isStaffEmail, supabaseAuth } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const sb = await supabaseAuth();
  if (code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error && isStaffEmail(data.user?.email)) return NextResponse.redirect(new URL("/staff", url));
    await sb.auth.signOut();
  }
  return NextResponse.redirect(new URL("/staff/accedi?e=link", url));
}
