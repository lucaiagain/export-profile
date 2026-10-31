import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/Chrome";
import { config } from "@/lib/config";
import { DEV_COOKIE, isStaffEmail, staffEmail, supabaseAuth } from "@/lib/staff-auth";
import st from "../staff.module.css";

export const metadata: Metadata = { title: "Area IAGAIN · Export Profile", robots: { index: false } };
export const dynamic = "force-dynamic";

async function sendLink(form: FormData) {
  "use server";
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!isStaffEmail(email)) redirect("/staff/accedi?e=dominio");
  if (config.useDevStore) {
    (await cookies()).set(DEV_COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    redirect("/staff");
  }
  const origin = config.siteUrl || `https://${(await headers()).get("host")}`;
  const sb = await supabaseAuth();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/staff/auth/callback`, shouldCreateUser: true },
  });
  if (error) redirect("/staff/accedi?e=invio");
  redirect("/staff/accedi?ok=1");
}

export default async function Accedi({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (await staffEmail()) redirect("/staff");
  const sp = await searchParams;
  return (
    <>
      <SiteHeader>
        <span className="tagline">Area IAGAIN</span>
      </SiteHeader>
      <main className={st.loginMain}>
        <h1 className={st.h1}>Accesso staff</h1>
        {sp.ok ? (
          <p className={st.ok} role="status">Ti abbiamo inviato un link di accesso: aprilo da questo dispositivo.</p>
        ) : (
          <form action={sendLink} className={st.loginForm}>
            <div className="field">
              <label htmlFor="email">Email @{config.staffDomain}</label>
              <input id="email" name="email" type="email" className="input" required autoComplete="email" />
            </div>
            {sp.e === "dominio" && <p className="field-error">L&apos;accesso è riservato agli indirizzi @{config.staffDomain}.</p>}
            {sp.e === "invio" && <p className="field-error">Invio non riuscito, riprova tra qualche minuto.</p>}
            {sp.e === "link" && <p className="field-error">Link scaduto o non valido: richiedine uno nuovo.</p>}
            <button className="btn btn-primary" type="submit">
              {config.useDevStore ? "Entra (accesso di sviluppo)" : "Inviami il link di accesso"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
