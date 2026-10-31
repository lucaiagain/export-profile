import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/Chrome";
import { ResumeNote } from "@/components/ResumeNote";
import { fmt } from "@/lib/engine";
import { spec } from "@/lib/spec";
import styles from "./landing.module.css";

const levelShort = spec.texts.level_short as Record<string, string>;
const areaShort = spec.texts.area_short as Record<string, string>;
const n = (x: number) => (Number.isInteger(x) ? String(x) : fmt(x));

export default function Home() {
  const levels = spec.levels.map((l, i) => ({ ...l, max: spec.levels[i + 1]?.min ?? spec.scale.max }));
  const thrLevel = levels.find((l) => spec.threshold >= l.min && spec.threshold < l.max);
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>Gratuito · risultato immediato</span>
            <h1 className={styles.title}>Quanto è pronta la tua azienda per l&apos;estero?</h1>
            <p className={styles.lead}>
              Rispondi a {spec.questions.length} domande sulla tua azienda. Ricevi subito il tuo grado di maturità export,
              i punti di forza e di debolezza nelle {spec.areas.length} aree che contano per un buyer estero, e fin dove
              puoi arrivare con IAGAIN.
            </p>
            <div className={styles.stats}>
              <div><span className={styles.statN}>{spec.questions.length}</span><span>domande a scelta</span></div>
              <div><span className={styles.statN}>8 min</span><span>circa</span></div>
              <div><span className={styles.statN}>{spec.areas.length}</span><span>aree valutate</span></div>
            </div>
            <div className={styles.ctas}>
              <Link className="btn btn-primary" href="/questionario">Inizia il questionario</Link>
              <Link className="btn btn-outline" href="/esempio">Guarda un profilo d&apos;esempio</Link>
            </div>
            <ResumeNote />
          </div>

          <aside className={styles.ladder} aria-label="I 5 gradi di maturità export">
            <span className={styles.ladderTitle}>I {levels.length} gradi di maturità export</span>
            {[...levels].reverse().map((l) => (
              <div key={l.name} className={`${styles.rung} ${l === thrLevel ? styles.thr : ""}`}>
                <span className={styles.range}>{n(l.min)} – {n(l.max)}</span>
                <span className={styles.rungName}>
                  {l.name}
                  <span className={styles.rungDesc}>{levelShort[l.name]}</span>
                </span>
                {l === thrLevel && <span className={styles.thrTag}>soglia export · {spec.threshold}</span>}
              </div>
            ))}
          </aside>
        </section>

        <section className={styles.areas}>
          {spec.areas.map((a) => (
            <div key={a.id} className={styles.area}>
              <h2>{a.name}</h2>
              <p>{areaShort[a.id]}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
