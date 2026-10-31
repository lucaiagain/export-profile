import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/Chrome";
import { db } from "@/lib/db";
import { profileFromToken } from "@/lib/lead-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Promemoria · Export Profile IAGAIN", robots: { index: false } };

async function unsubscribe(form: FormData) {
  "use server";
  const token = String(form.get("token"));
  const p = await profileFromToken(token);
  if (!p) notFound();
  await db().updateProfile(p.id, { unsubscribed_at: new Date().toISOString() });
  redirect(`/disiscriviti/${token}?ok=1`);
}

// Conferma con un bottone: i link nelle email vengono a volte aperti in automatico dai filtri antispam.
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { token } = await params;
  const p = await profileFromToken(token);
  if (!p) notFound();
  const done = (await searchParams).ok || p.unsubscribed_at;
  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "56px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>Promemoria</h1>
        {done ? (
          <p role="status">Fatto: non riceverai altri promemoria per il questionario di {p.company_name}.</p>
        ) : (
          <form action={unsubscribe} style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
            <input type="hidden" name="token" value={token} />
            <p style={{ margin: 0 }}>Non vuoi ricevere altri promemoria per completare l&apos;Export Profile di {p.company_name}?</p>
            <button className="btn btn-primary" type="submit">Non inviarmi altri promemoria</button>
          </form>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
