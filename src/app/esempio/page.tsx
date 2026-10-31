import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/Chrome";
import { Profile, ProfileHeader } from "@/components/Profile";
import { computeProfile } from "@/lib/engine";
import { SAMPLE_ANSWERS, SAMPLE_CONTACT, SAMPLE_MARKETS } from "@/lib/sample";
import { spec, t } from "@/lib/spec";
import { buildView } from "@/lib/view";

export const metadata: Metadata = { title: "Profilo d'esempio · Export Profile IAGAIN" };
export const revalidate = 86400; // data del profilo d'esempio aggiornata ogni giorno

export default function Esempio() {
  const r = computeProfile(spec, SAMPLE_ANSWERS);
  const v = buildView(r, { ...SAMPLE_CONTACT, company_name: SAMPLE_CONTACT.company_name, markets: SAMPLE_MARKETS, date: new Date(), sample: true });
  return (
    <>
      <ProfileHeader>
        <Link className="btn btn-gold" href="/questionario">
          Compila il tuo questionario
        </Link>
      </ProfileHeader>
      <div style={{ background: "var(--gold-light)", borderBottom: "1px solid var(--line)" }}>
        <p style={{ maxWidth: 1160, margin: "0 auto", padding: "12px 24px", fontSize: 15, color: "var(--muted)" }}>
          <b style={{ color: "var(--blue)" }}>{t("sample_flag")}.</b> Ti mostra cosa riceverai alla fine del questionario.{" "}
          <Link href="/questionario">Compila il tuo</Link>.
        </p>
      </div>
      <Profile v={v} />
      <SiteFooter text="Export Profile è uno strumento IAGAIN S.r.l. · www.iagain.it" />
    </>
  );
}
