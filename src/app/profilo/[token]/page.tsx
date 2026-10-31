import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/Chrome";
import { PdfButton } from "@/components/PdfButton";
import { Profile, ProfileHeader } from "@/components/Profile";
import { profileFromToken } from "@/lib/lead-access";
import { buildView } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Il tuo Export Profile · IAGAIN", robots: { index: false, follow: false } };

export default async function ProfiloPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await profileFromToken(token);
  if (!p) notFound();
  if (p.status !== "completato" || !p.result) redirect(`/questionario?k=${token}`);

  const v = buildView(p.result, {
    company_name: p.company_name,
    contact_name: p.contact_name,
    role: p.role,
    region: p.region,
    category: p.category,
    markets: p.markets,
    wem_notes: p.wem_notes,
    wem_name: p.wem_name,
    date: new Date(p.completed_at ?? p.created_at),
  });

  return (
    <>
      <ProfileHeader>
        <Link className="btn btn-on-blue" href={`/questionario?k=${token}&modifica=1`}>
          Modifica le risposte
        </Link>
        <PdfButton token={token} email={p.email} />
      </ProfileHeader>
      <Profile v={v} />
      <SiteFooter text="Export Profile è uno strumento IAGAIN S.r.l. · www.iagain.it" />
    </>
  );
}
