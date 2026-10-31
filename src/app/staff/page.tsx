import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/Chrome";
import { fmt } from "@/lib/engine";
import { spec } from "@/lib/spec";
import { requireStaff } from "@/lib/staff-auth";
import { filtersFrom, listProfiles } from "@/lib/staff-list";
import st from "./staff.module.css";

export const metadata: Metadata = { title: "Profili · Area IAGAIN", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function StaffHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const email = await requireStaff();
  const sp = await searchParams;
  const f = filtersFrom(sp);
  const rows = await listProfiles(f);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v)).toString();

  return (
    <>
      <SiteHeader>
        <form action="/staff/esci" method="post" className={st.who}>
          <span>{email}</span>
          <button className="btn btn-on-blue" type="submit">Esci</button>
        </form>
      </SiteHeader>
      <main className={st.main}>
        <div className={st.titleRow}>
          <h1 className={st.h1}>Profili</h1>
          <a className="btn btn-ghost" href={`/staff/export${qs ? "?" + qs : ""}`}>Esporta CSV</a>
        </div>

        <form className={st.filters} method="get">
          <div className="field"><label htmlFor="dal">Dal</label><input id="dal" name="dal" type="date" className="input" defaultValue={f.from} /></div>
          <div className="field"><label htmlFor="al">Al</label><input id="al" name="al" type="date" className="input" defaultValue={f.to} /></div>
          <div className="field">
            <label htmlFor="grado">Grado</label>
            <select id="grado" name="grado" className="select" defaultValue={f.level ?? ""}>
              <option value="">Tutti</option>
              {spec.levels.map((l) => <option key={l.name}>{l.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="servizio">Servizio</label>
            <select id="servizio" name="servizio" className="select" defaultValue={f.service ?? ""}>
              <option value="">Tutti</option>
              {Object.entries(spec.services).map(([id, s]) => <option key={id} value={id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="categoria">Categoria</label>
            <select id="categoria" name="categoria" className="select" defaultValue={f.category ?? ""}>
              <option value="">Tutte</option>
              {spec.categories.map((c) => <option key={c.label}>{c.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="stato">Stato</label>
            <select id="stato" name="stato" className="select" defaultValue={f.status ?? ""}>
              <option value="">Tutti</option>
              <option value="completato">Completato</option>
              <option value="in_corso">In corso</option>
            </select>
          </div>
          <div className={st.filterBtns}>
            <button className="btn btn-primary" type="submit">Filtra</button>
            <Link className="btn btn-ghost" href="/staff">Azzera</Link>
          </div>
        </form>

        <p className={st.count}>{rows.length} profili</p>
        <div className={st.tableWrap}>
          <table className={st.table}>
            <thead>
              <tr>
                <th>Data</th><th>Azienda</th><th>Referente</th><th>Categoria</th>
                <th className={st.num}>Grado</th><th>Livello</th><th>Servizio</th><th>Bloccanti</th><th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.created_at).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}</td>
                  <td><Link href={`/staff/${p.id}`}>{p.company_name}</Link></td>
                  <td>{p.contact_name}<br /><span className={st.sub}>{p.email}</span></td>
                  <td>{p.category}</td>
                  <td className={st.num}>{p.result ? fmt(p.result.total) : "–"}</td>
                  <td>{p.result?.level ?? "–"}</td>
                  <td>{p.result ? spec.services[p.result.recommended_service].name : "–"}</td>
                  <td>{p.result?.blockers.length || ""}</td>
                  <td>
                    {p.status === "completato" ? "Completato" : "In corso"}
                    {p.wem_name && <span className={st.sub}><br />WEM: {p.wem_name}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
