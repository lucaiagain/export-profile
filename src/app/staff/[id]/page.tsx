import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Profile, ProfileHeader } from "@/components/Profile";
import { sendMail } from "@/lib/brevo";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { pdfEmail } from "@/lib/emails";
import { fmt } from "@/lib/engine";
import { recomputeProfile } from "@/lib/lead";
import { pdfFileName, renderProfilePdf } from "@/lib/pdf";
import { viewForRow } from "@/lib/profile-view";
import { spec } from "@/lib/spec";
import { decryptToken } from "@/lib/security";
import { requireStaff } from "@/lib/staff-auth";
import st from "../staff.module.css";

export const metadata: Metadata = { title: "Profilo · Area IAGAIN", robots: { index: false } };
export const dynamic = "force-dynamic";

const STEPS = Array.from({ length: (spec.scale.max - spec.scale.min) * 2 + 1 }, (_, i) => spec.scale.min + i / 2);

async function saveWem(form: FormData) {
  "use server";
  await requireStaff();
  const id = String(form.get("id"));
  const p = await db().getProfile(id);
  if (!p || !p.result) notFound();
  const overrides: Record<string, number> = {};
  for (const d of spec.indicators) {
    const raw = String(form.get(`ov_${d.id}`) ?? "");
    const n = Number(raw);
    // vuoto = punteggio calcolato; si salva solo se diverso dal calcolato
    if (raw && STEPS.includes(n) && Math.abs(n - p.result.indicators[d.id].computed) > 1e-9) overrides[d.id] = n;
  }
  const notes: Record<string, string> = {};
  for (const a of spec.areas) {
    const t = String(form.get(`note_${a.id}`) ?? "").trim().slice(0, 2000);
    if (t) notes[a.id] = t;
  }
  const wem = String(form.get("wem_name") ?? "").trim().slice(0, 120) || null;
  const row = await db().updateProfile(id, { overrides, wem_notes: notes, wem_name: wem });
  await recomputeProfile(row);
  redirect(`/staff/${id}?salvato=1`);
}

async function sendPdf(form: FormData) {
  "use server";
  await requireStaff();
  const id = String(form.get("id"));
  const p = await db().getProfile(id);
  if (!p || !p.result) notFound();
  const pdf = await renderProfilePdf(viewForRow(p));
  const mail = pdfEmail(p, `${config.siteUrl}/profilo/${decryptToken(p.token_enc)}`);
  const ok = await sendMail({ to: { email: p.email, name: p.contact_name }, subject: mail.subject, html: mail.html, attachment: { name: pdfFileName(p.company_name), content: pdf } });
  if (ok) await db().updateProfile(id, { pdf_sent_at: new Date().toISOString() });
  redirect(`/staff/${id}?${ok ? "inviato=1" : "invio=off"}`);
}

export default async function StaffProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const p = await db().getProfile(id);
  if (!p) notFound();

  if (!p.result) {
    return (
      <>
        <ProfileHeader><Link className="btn btn-on-blue" href="/staff">← Profili</Link></ProfileHeader>
        <main className={st.main}>
          <h1 className={st.h1}>{p.company_name}</h1>
          <p>Questionario in corso: {Object.keys(p.answers).length} risposte su {spec.questions.length}. Ultima attività {new Date(p.last_activity_at).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}.</p>
          <p>{p.contact_name} · {p.email} · {p.phone}</p>
        </main>
      </>
    );
  }

  const v = viewForRow(p);
  const r = p.result;

  return (
    <>
      <ProfileHeader>
        <Link className="btn btn-on-blue" href="/staff">← Profili</Link>
        <a className="btn btn-on-blue" href={`/staff/${id}/pdf`}>Scarica PDF</a>
        <form action={sendPdf}>
          <input type="hidden" name="id" value={id} />
          <button className="btn btn-gold" type="submit">Invia PDF al lead</button>
        </form>
      </ProfileHeader>

      <div className={st.wemBar}>
        <div className={st.wemInner}>
          <span className={st.wemBadge}>Modalità WEM</span>
          <span>{p.contact_name} · <a href={`mailto:${p.email}`}>{p.email}</a> · {p.phone}{p.website ? ` · ${p.website}` : ""}</span>
          {sp.salvato && <span className={st.ok} role="status">Correzioni salvate e profilo ricalcolato.</span>}
          {sp.inviato && <span className={st.ok} role="status">PDF inviato a {p.email}.</span>}
          {sp.invio === "off" && <span className="field-error" role="status">Invio email non attivo (Brevo): usa “Scarica PDF”.</span>}
        </div>
        <form id="wem" action={saveWem} className={st.wemForm}>
          <input type="hidden" name="id" value={id} />
          <div className="field">
            <label htmlFor="wem_name">Profilo verificato dal WEM</label>
            <input id="wem_name" name="wem_name" className="input" defaultValue={p.wem_name ?? ""} placeholder="Nome e cognome" />
          </div>
          <button className="btn btn-primary" type="submit">Salva e ricalcola</button>
          <span className={st.sub}>Le correzioni si salvano come override: le risposte originali restano invariate. Spec {p.spec_version}.</span>
        </form>
      </div>

      <Profile
        v={v}
        areaExtra={(areaId) => (
          <div className={st.wemArea}>
            <span className="kicker">Correzioni del WEM</span>
            <div className={st.ovGrid}>
              {spec.indicators.filter((d) => d.area === areaId).map((d) => {
                const ind = r.indicators[d.id];
                return (
                  <label key={d.id} className={st.ovRow} htmlFor={`ov_${d.id}`}>
                    <span>{d.label} <span className={st.sub}>(calcolato {fmt(ind.computed)})</span></span>
                    <select id={`ov_${d.id}`} name={`ov_${d.id}`} form="wem" className="select" defaultValue={ind.overridden ? String(ind.value) : ""}>
                      <option value="">{fmt(ind.computed)} · calcolato</option>
                      {STEPS.map((n) => <option key={n} value={String(n)}>{fmt(n)}</option>)}
                    </select>
                  </label>
                );
              })}
            </div>
            <div className="field">
              <label htmlFor={`note_${areaId}`}>Nota per l&apos;area (compare nel profilo e nel PDF)</label>
              <textarea id={`note_${areaId}`} name={`note_${areaId}`} form="wem" className="input" rows={3} defaultValue={p.wem_notes[areaId] ?? ""} />
            </div>
          </div>
        )}
      />
    </>
  );
}
