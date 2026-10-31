/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { fmt } from "@/lib/engine";
import { t } from "@/lib/spec";
import { radarPoints, scalePct, type ProfileView } from "@/lib/view";
import s from "./profile.module.css";

const LIST_PREVIEW = { lifted: 4, yours: 3 };

export function ProfileHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <Link href="/" aria-label="Export Profile, pagina iniziale">
          <img className={s.logo} src="/loghi/iagain-logo-negativo.svg" alt="IAGAIN" width={62} height={52} />
        </Link>
        <div className={s.actions}>{children}</div>
      </div>
    </header>
  );
}

export function Profile({ v, areaExtra }: { v: ProfileView; areaExtra?: (areaId: string) => React.ReactNode }) {
  return (
    <>
      <section className={s.cover}>
        <div className={s.coverInner}>
          <span className={s.coverKicker}>
            Export Profile · {v.date}
            {v.sample ? " · esempio" : ""}
          </span>
          <h1 className={s.company}>{v.company}</h1>
          {v.meta.length > 0 && <span className={s.meta}>{v.meta.join(" · ")}</span>}
        </div>
      </section>

      <main className={s.main}>
        {/* 01 · Grado */}
        <section className={s.card}>
          <div className={s.gradeRow}>
            <div className={s.grade}>
              <span className="kicker">01 · Grado di maturità export</span>
              <span className={s.bigScore}>
                {v.totalFmt}
                <span className={s.outOf}> / 5</span>
              </span>
              <span className={s.levelName}>{v.level}</span>
            </div>
            <p className={s.levelText}>{v.levelText}</p>
          </div>
          <Scale v={v} />
          {v.blockers.length > 0 && (
            <div className={s.blockers} role="note">
              <span className={s.blockersKicker}>{t("blockers_kicker")}</span>
              <h2 className={s.blockersTitle}>{v.blockersTitle}</h2>
              <ul>
                {v.blockers.map((b) => (
                  <li key={b.id}>
                    <b>{b.title}.</b> {b.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 02 · Aree */}
        <section className={`${s.card} ${s.areasCard}`}>
          <div className={s.radarCol}>
            <span className="kicker">02 · Le 4 aree</span>
            <h2 className={s.h2}>Dove sei forte e dove perdi punti</h2>
            <Radar v={v} />
          </div>
          <div className={s.tableCol}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Area</th>
                  <th className={s.num}>Oggi</th>
                  <th className={`${s.num} ${s.purple}`}>Con {v.serviceShort}</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {v.areas.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td className={`${s.num} ${s.b}`}>{fmt(a.value)}</td>
                    <td className={`${s.num} ${s.b} ${s.purple}`}>{fmt(a.scenario)}</td>
                    <td>
                      <span className={`pill pill-${a.tone}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
                <tr className={s.totRow}>
                  <td>Grado di maturità</td>
                  <td className={s.num}>{v.totalFmt}</td>
                  <td className={`${s.num} ${s.purple}`}>{v.scenarioTotalFmt}</td>
                  <td />
                </tr>
              </tbody>
            </table>
            <div className={s.legend}>
              <span><i className={s.legToday} />Oggi</span>
              <span><i className={s.legScen} />{v.scenarioLabel}</span>
              <span><i className={s.legThr} />Soglia minima export ({v.threshold})</span>
            </div>
            <p className={s.areasLead}>{v.areasLead}</p>
          </div>
        </section>

        {/* Aree a fisarmonica: la prima aperta */}
        {v.areas.map((a, i) => (
          <details key={a.id} className={s.area} open={i === 0}>
            <summary className={s.areaHead}>
              <span className={s.areaTitle}>
                <span className="kicker">Area</span>
                <span className={s.h3}>{a.name}</span>
              </span>
              <span className={s.areaRight}>
                <span className={`pill pill-${a.tone}`}>{a.status}</span>
                <span className={s.areaScore}>{fmt(a.value)}</span>
                <svg className={s.chev} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </summary>
            <div className={s.areaBody}>
              <p className={s.desc}>{a.desc}</p>
              <div className={s.bars}>
                {a.indicators.map((ind) => (
                  <div key={ind.id} className={s.barRow}>
                    <span className={s.barLabel}>
                      {ind.label}
                      {ind.overridden && <span className={s.wemMark} title="Punteggio verificato dal WEM"> · WEM</span>}
                    </span>
                    <div className={s.track} role="img" aria-label={`${ind.label}: ${fmt(ind.value)} su 5${ind.scenario > ind.value ? `, ${v.scenarioLabel.toLowerCase()} ${fmt(ind.scenario)}` : ""}`}>
                      <div className={s.fillScen} style={{ width: `${(ind.scenario / 5) * 100}%` }} />
                      <div className={s.fillNow} style={{ width: `${(ind.value / 5) * 100}%` }} />
                      <div className={s.thrMark} style={{ left: `${(v.threshold / 5) * 100}%` }} />
                    </div>
                    <span className={s.barVal}>
                      {fmt(ind.value)}
                      {ind.scenario > ind.value && <span className={s.purple}> → {fmt(ind.scenario)}</span>}
                    </span>
                  </div>
                ))}
              </div>
              <div className={s.swot}>
                <Column cls={s.colStrong} title="Punti di forza" items={a.strengths} empty={t("empty_strengths")} />
                <Column cls={s.colWeak} title="Punti di debolezza" items={a.weaknesses} empty={t("empty_weaknesses")} />
                <Column cls={s.colSugg} title="Suggerimenti" items={a.suggestions} empty={t("empty_suggestions")} />
              </div>
              {a.note && (
                <div className={s.wemNote}>
                  <b>{t("wem_note_label")}</b> {a.note}
                </div>
              )}
              {areaExtra?.(a.id)}
            </div>
          </details>
        ))}

        {/* 03 · Scenario */}
        <section className={s.scenario}>
          <span className={s.scenKicker}>03 · {v.scenarioLabel}</span>
          <div className={s.jump}>
            <span>
              {v.totalFmt} {v.level}
            </span>
            <svg width="36" height="20" viewBox="0 0 36 20" fill="none" stroke="#A3195B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label="passa a">
              <path d="M2 10h30" />
              <path d="M24 3l8 7-8 7" />
            </svg>
            <span className={s.purple}>
              {v.scenarioTotalFmt} {v.scenarioLevel}
            </span>
          </div>
          <p className={s.scenLead}>
            {v.scenarioLead}
            {v.scenarioNote ? ` ${v.scenarioNote}` : ""}
          </p>
          <div className={s.cols2}>
            <div>
              <h3 className={s.h4Purple}>Cosa facciamo noi</h3>
              {v.lifted.length ? (
                <ExpandableList
                  items={v.lifted.map((x) => (
                    <>
                      <b>{x.label}</b> ({x.from} → {x.to}). {x.text}
                    </>
                  ))}
                  preview={LIST_PREVIEW.lifted}
                  moreCls={s.morePurple}
                />
              ) : (
                <p className={s.empty}>{t("lifted_empty")}</p>
              )}
            </div>
            <div>
              <h3 className={s.h4}>Cosa resta a te</h3>
              {v.yours.length ? (
                <ExpandableList
                  items={v.yours.map((x) => (
                    <>
                      <b>{x.label}</b> ({x.value}). {x.text}
                    </>
                  ))}
                  preview={LIST_PREVIEW.yours}
                  moreCls={s.moreBlue}
                />
              ) : (
                <p className={s.empty}>{t("yours_empty")}</p>
              )}
            </div>
          </div>
        </section>

        {/* 04 · Servizio consigliato */}
        <section className={s.service}>
          <div className={s.svcCopy}>
            <span className={s.svcKicker}>04 · {v.service.tag}</span>
            <h2 className={s.svcName}>{v.service.name}</h2>
            {v.blockersBeforeService && <p className={s.svcPre}>{v.blockersBeforeService}</p>}
            <p className={s.svcDesc}>{v.service.desc}</p>
            <ul className={s.svcWhy}>
              {v.service.why.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            {v.marketsLine && <p className={s.svcMarkets}>{v.marketsLine}</p>}
          </div>
          <div className={s.svcActions}>
            <a className={`btn btn-primary ${s.svcCta}`} href={v.service.ctaUrl} target="_blank" rel="noopener noreferrer">
              {v.service.cta}
            </a>
            <a className={`btn btn-on-blue ${s.svcMore}`} href={v.service.moreUrl} target="_blank" rel="noopener noreferrer">
              {v.service.more}
            </a>
            <span className={s.svcAlt}>{v.service.altLine}</span>
          </div>
        </section>

        <p className={s.method}>
          {v.methodShort}
          {v.wemName ? ` ${v.methodTail}` : ""}
        </p>
      </main>
    </>
  );
}

function Column({ cls, title, items, empty }: { cls: string; title: string; items: string[]; empty: string }) {
  return (
    <div className={cls}>
      <h4>{title}</h4>
      {items.length ? (
        <ul>
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className={s.empty}>{empty}</p>
      )}
    </div>
  );
}

function ExpandableList({ items, preview, moreCls }: { items: React.ReactNode[]; preview: number; moreCls: string }) {
  const head = items.slice(0, preview);
  const rest = items.slice(preview);
  return (
    <>
      <ul className={s.list}>
        {head.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
      {rest.length > 0 && (
        <details className={s.more}>
          <summary className={moreCls}>e altri {rest.length} indicatori</summary>
          <ul className={s.list}>
            {rest.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function Scale({ v }: { v: ProfileView }) {
  const li = v.levels.indexOf(v.level);
  return (
    <div className={s.scale}>
      <div className={s.scaleTrack}>
        <div className={s.scaleBands} aria-hidden="true">
          {v.levels.map((l) => (
            <span key={l} />
          ))}
        </div>
        <div className={s.scaleThr} style={{ left: `${scalePct(v.threshold)}%` }} aria-hidden="true" />
        <div className={s.dotScen} style={{ left: `${scalePct(v.scenarioTotal)}%` }} aria-hidden="true" />
        <div className={s.dotNow} style={{ left: `${scalePct(v.total)}%` }} aria-hidden="true" />
      </div>
      <div className={s.scaleLabels}>
        {v.levels.map((l, i) => (
          <span key={l} className={i === li ? s.scaleOn : undefined}>
            {l}
          </span>
        ))}
      </div>
      <div className={s.scaleLegend}>
        <span><i className={s.legDotNow} />Oggi: {v.totalFmt}</span>
        <span><i className={s.legDotScen} />{v.scenarioLabel}: {v.scenarioTotalFmt}</span>
        <span><i className={s.legLine} />Soglia minima export: {v.threshold}</span>
      </div>
    </div>
  );
}

export function Radar({ v, pdf = false }: { v: ProfileView; pdf?: boolean }) {
  const grid = [1, 2, 4, 5].map((k) => radarPoints([k, k, k, k]));
  const labels: [string, string?][] = pdf
    ? [["Comunicazione"], ["Organizz.", "interna"], ["Offerta commerciale"], ["Esperienza", "internaz."]]
    : [["Comunicazione"], ["Organizzazione", "interna"], ["Offerta commerciale"], ["Esperienza", "internazionale"]];
  const fs = pdf ? 19 : 15;
  return (
    <svg
      viewBox="0 0 500 350"
      role="img"
      aria-label={`Radar dei punteggi: oggi, ${v.scenarioLabel.toLowerCase()} e soglia minima. ${v.areas.map((a) => `${a.name} ${fmt(a.value)}`).join(", ")}.`}
      className={s.radar}
    >
      {grid.map((p, i) => (
        <polygon key={i} points={p} fill="none" stroke="#DDE0E6" />
      ))}
      <line x1="250" y1="60" x2="250" y2="300" stroke="#DDE0E6" />
      <line x1="130" y1="180" x2="370" y2="180" stroke="#DDE0E6" />
      <polygon points={radarPoints([3, 3, 3, 3])} fill="none" stroke="#1F232F" strokeWidth="1.5" strokeDasharray="5 4" />
      <polygon points={radarPoints(v.areas.map((a) => a.scenario))} fill="#A3195B" fillOpacity="0.12" stroke="#A3195B" strokeWidth="2" />
      <polygon points={radarPoints(v.areas.map((a) => a.value))} fill="#AD9677" fillOpacity="0.35" stroke="#8A7556" strokeWidth="2.5" />
      <g fontFamily="Lato, sans-serif" fontSize={fs} fontWeight="700" fill="#1F232F">
        <text x="250" y="44" textAnchor="middle">{labels[0][0]}</text>
        <text x="384" y="176">{labels[1][0]}</text>
        <text x="384" y={176 + fs + 3}>{labels[1][1]}</text>
        <text x="250" y="326" textAnchor="middle">{labels[2][0]}</text>
        <text x="116" y="176" textAnchor="end">{labels[3][0]}</text>
        <text x="116" y={176 + fs + 3} textAnchor="end">{labels[3][1]}</text>
      </g>
    </svg>
  );
}
