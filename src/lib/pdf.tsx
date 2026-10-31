/* eslint-disable jsx-a11y/alt-text -- Image di react-pdf, non un <img> HTML */
// PDF A4 dell'Export Profile, generato sul server. Pagina 1 come da canvas (schermata 4),
// poi aree, scenario e passo successivo nella stessa impostazione.
import "server-only";
import path from "node:path";
import fs from "node:fs";
import {
  Document,
  Font,
  Image,
  Line,
  Link,
  Page,
  Polygon,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { fmt } from "@/lib/engine";
import { t } from "@/lib/spec";
import { radarPoints, scalePct, type ProfileView } from "@/lib/view";

const A = path.join(process.cwd(), "assets");
const font = (f: string) => path.join(A, "fonts", f);
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Lato",
    fonts: [
      { src: font("Lato-Regular.ttf") },
      { src: font("Lato-Italic.ttf"), fontStyle: "italic" },
      { src: font("Lato-Bold.ttf"), fontWeight: 700 },
      { src: font("Lato-Black.ttf"), fontWeight: 900 },
    ],
  });
  Font.register({
    family: "Barlow",
    fonts: [
      { src: font("BarlowSemiCondensed-Medium.ttf"), fontWeight: 500 },
      { src: font("BarlowSemiCondensed-SemiBold.ttf"), fontWeight: 600 },
      { src: font("BarlowSemiCondensed-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  fontsReady = true;
}
const png = (f: string) => `data:image/png;base64,${fs.readFileSync(path.join(A, f)).toString("base64")}`;

// Il canvas è a 794 px per 595 pt: fattore 0,75.
const k = 0.75;
const C = {
  blue: "#1F232F", gold: "#AD9677", goldText: "#7A6747", goldDark: "#8A7556", goldLight: "#F3EEE6",
  purple: "#A3195B", purpleLight: "#F7E8EF", purpleBar: "#E7C3D4", purpleOnBlue: "#E7A9C6",
  muted: "#4A5063", line: "#C8CBD3", lineSoft: "#E4E6EB", track: "#EEF0F3",
  bad: "#9E2F2F", badBg: "#F8E4E4", warn: "#8A5A12", warnBg: "#FBF0DD", good: "#2E6B50", goodBg: "#E3F1EA",
};
const TONES = { top: [C.goodBg, C.good], ok: [C.goodBg, C.good], warn: [C.warnBg, C.warn], bad: [C.badBg, C.bad] } as const;

const s = StyleSheet.create({
  page: { paddingTop: 56 * k, paddingHorizontal: 60 * k, paddingBottom: 62 * k, fontFamily: "Lato", fontSize: 11, color: C.blue },
  cond: { fontFamily: "Barlow" },
  kicker: { fontFamily: "Barlow", fontWeight: 700, fontSize: 9.5, letterSpacing: 1.5, textTransform: "uppercase", color: C.goldText },
  h2: { fontSize: 18, fontWeight: 900, marginTop: 4, marginBottom: 6 },
  p: { fontSize: 10.5, lineHeight: 1.5, color: C.muted },
  footer: {
    position: "absolute", left: 60 * k, right: 60 * k, bottom: 32 * k, paddingTop: 10 * k, borderTopWidth: 1, borderTopColor: C.line,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footText: { fontSize: 9, color: C.muted },
  th: { fontFamily: "Barlow", fontWeight: 600, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: C.muted },
});

function Footer({ v }: { v: ProfileView }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footText}>Export Profile · {v.company} · IAGAIN S.r.l. · www.iagain.it</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Image src={png("wifo-marchio-viola.png")} style={{ height: 18 * k, width: (18 * k * 280) / 90 }} />
        <Text style={[s.cond, { fontSize: 10, color: C.muted }]} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </View>
  );
}

function RunningHead({ v }: { v: ProfileView }) {
  return (
    <View fixed style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 8, marginBottom: 14, borderBottomWidth: 1.5, borderBottomColor: C.gold }}>
      <Text style={[s.kicker, { color: C.blue }]}>Export Profile · {v.company}</Text>
      <Text style={{ fontSize: 9, color: C.muted }}>{v.date}</Text>
    </View>
  );
}

function Scale({ v }: { v: ProfileView }) {
  const W = 595 - 120 * k;
  const bands = ["#EDE9E3", "#E4DDD2", "#D8CDBB", "#C9B99F", "#AD9677"];
  const dot = (val: number, color: string) => (
    <View style={{ position: "absolute", left: (scalePct(val) / 100) * W - 8.25, top: 5 * k, width: 16.5, height: 16.5, borderRadius: 8.25, backgroundColor: color, borderWidth: 2.25, borderColor: "#FFFFFF" }} />
  );
  return (
    <View style={{ gap: 6 }}>
      <View style={{ position: "relative", height: 32 * k }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 11 * k, height: 10 * k, borderRadius: 4, flexDirection: "row", overflow: "hidden" }}>
          {bands.map((b) => <View key={b} style={{ flex: 1, backgroundColor: b }} />)}
        </View>
        <View style={{ position: "absolute", left: (scalePct(v.threshold) / 100) * W - 0.75, top: 1, width: 1.5, height: 30 * k, backgroundColor: C.blue }} />
        {dot(v.scenarioTotal, C.purple)}
        {dot(v.total, C.blue)}
      </View>
      <View style={{ flexDirection: "row" }}>
        {v.levels.map((l) => (
          <Text key={l} style={[s.cond, { flex: 1, textAlign: "center", fontSize: 9.75, letterSpacing: 0.6, textTransform: "uppercase", color: l === v.level ? C.blue : C.muted, fontWeight: l === v.level ? 700 : 500 }]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Radar({ v }: { v: ProfileView }) {
  const grid = [1, 2, 4, 5].map((n) => radarPoints([n, n, n, n]));
  const lab = { fontFamily: "Lato", fontWeight: 700, fontSize: 19 } as const;
  return (
    <Svg viewBox="0 0 500 350" style={{ width: 330 * k, height: (330 * k * 350) / 500 }}>
      {grid.map((p, i) => <Polygon key={i} points={p} fill="none" stroke={C.line} strokeWidth={1} />)}
      <Line x1={250} y1={60} x2={250} y2={300} stroke={C.line} strokeWidth={1} />
      <Line x1={130} y1={180} x2={370} y2={180} stroke={C.line} strokeWidth={1} />
      <Polygon points={radarPoints([3, 3, 3, 3])} fill="none" stroke={C.blue} strokeWidth={1.5} strokeDasharray="5 4" />
      <Polygon points={radarPoints(v.areas.map((a) => a.scenario))} fill={C.purple} fillOpacity={0.12} stroke={C.purple} strokeWidth={2} />
      <Polygon points={radarPoints(v.areas.map((a) => a.value))} fill={C.gold} fillOpacity={0.35} stroke={C.goldDark} strokeWidth={2.5} />
      <Text x={250} y={44} textAnchor="middle" style={lab}>Comunicazione</Text>
      <Text x={380} y={176} style={lab}>Organizz.</Text>
      <Text x={380} y={198} style={lab}>interna</Text>
      <Text x={250} y={330} textAnchor="middle" style={lab}>Offerta commerciale</Text>
      <Text x={120} y={176} textAnchor="end" style={lab}>Esperienza</Text>
      <Text x={120} y={198} textAnchor="end" style={lab}>internaz.</Text>
    </Svg>
  );
}

function PageOne({ v }: { v: ProfileView }) {
  const cell = { paddingVertical: 9 * k, paddingHorizontal: 3, borderBottomWidth: 1, borderBottomColor: C.lineSoft, fontSize: 11.25 } as const;
  return (
    <Page size="A4" style={s.page}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 18 * k, borderBottomWidth: 1.5, borderBottomColor: C.gold }}>
        <Image src={png("iagain-logo-colore.png")} style={{ height: 76 * k, width: (76 * k * 356) / 300 }} />
        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <Text style={[s.cond, { fontWeight: 700, fontSize: 16.5, letterSpacing: 3, textTransform: "uppercase" }]}>Export Profile</Text>
          <Text style={{ fontSize: 10.5, color: C.muted }}>{v.date}{v.sample ? " · esempio" : ""}</Text>
        </View>
      </View>

      <View style={{ marginTop: 18, gap: 4 }}>
        <Text style={{ fontSize: 28.5, fontWeight: 900, lineHeight: 1.1 }}>{v.company}</Text>
        {v.meta.length > 0 && <Text style={{ fontSize: 12, color: C.muted }}>{v.meta.join(" · ")}</Text>}
      </View>

      <View style={{ marginTop: 18, backgroundColor: C.blue, borderRadius: 6, paddingVertical: 26 * k, paddingHorizontal: 28 * k, flexDirection: "row", gap: 28 * k, alignItems: "center" }}>
        <View style={{ gap: 3 }}>
          <Text style={[s.kicker, { fontWeight: 600, color: C.gold }]}>Grado di maturità export</Text>
          <Text style={[s.cond, { fontWeight: 700, fontSize: 54, lineHeight: 1.05, color: "#FFFFFF" }]}>
            {v.totalFmt}
            <Text style={{ fontSize: 18, color: C.line }}> / 5</Text>
          </Text>
          <Text style={[s.cond, { fontWeight: 700, fontSize: 16.5, letterSpacing: 1.3, textTransform: "uppercase", color: C.gold }]}>{v.level}</Text>
        </View>
        <View style={{ flex: 1, gap: 9 }}>
          <Text style={{ fontSize: 12, lineHeight: 1.55, color: "#E4E6EB" }}>{v.levelText}</Text>
          <Text style={{ fontSize: 12, color: "#FFFFFF" }}>
            {v.scenarioLabel}:{" "}
            <Text style={[s.cond, { fontWeight: 700, fontSize: 15, color: C.purpleOnBlue }]}>
              {v.scenarioTotalFmt} {v.scenarioLevel}
            </Text>
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 18 }}>
        <Scale v={v} />
      </View>

      {v.blockers.length > 0 && (
        <View style={{ marginTop: 14, borderLeftWidth: 3, borderLeftColor: C.bad, backgroundColor: "#FDF5F5", padding: 10, borderRadius: 4, gap: 4 }}>
          <Text style={[s.kicker, { color: C.bad }]}>{t("blockers_kicker")}</Text>
          <Text style={{ fontSize: 11, fontWeight: 900 }}>{v.blockersTitle}</Text>
          {v.blockers.map((b) => (
            <Text key={b.id} style={[s.p, { fontSize: 9.5 }]}>
              <Text style={{ fontWeight: 700, color: C.blue }}>{b.title}. </Text>
              {b.text}
            </Text>
          ))}
        </View>
      )}

      <View style={{ marginTop: 18, flexDirection: "row", gap: 15, alignItems: "center" }}>
        <Radar v={v} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 4 }}>
            <Text style={[s.th, { flex: 1 }]}>Area</Text>
            <Text style={[s.th, { width: 44, textAlign: "right" }]}>Oggi</Text>
            <Text style={[s.th, { width: 54, textAlign: "right", color: C.purple }]}>Con {v.serviceShort}</Text>
          </View>
          {v.areas.map((a) => (
            <View key={a.id} style={{ flexDirection: "row" }}>
              <Text style={[cell, { flex: 1 }]}>{a.name}</Text>
              <Text style={[cell, { width: 44, textAlign: "right", fontWeight: 700 }]}>{fmt(a.value)}</Text>
              <Text style={[cell, { width: 54, textAlign: "right", fontWeight: 700, color: C.purple }]}>{fmt(a.scenario)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row" }}>
            <Text style={[cell, { flex: 1, fontWeight: 900, borderBottomWidth: 0 }]}>Grado di maturità</Text>
            <Text style={[cell, { width: 44, textAlign: "right", fontWeight: 900, borderBottomWidth: 0 }]}>{v.totalFmt}</Text>
            <Text style={[cell, { width: 54, textAlign: "right", fontWeight: 900, color: C.purple, borderBottomWidth: 0 }]}>{v.scenarioTotalFmt}</Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {[
          [{ width: 10.5, height: 7.5, backgroundColor: "#D8CDBB", borderWidth: 1.1, borderColor: C.goldDark }, "Oggi"],
          [{ width: 10.5, height: 7.5, backgroundColor: C.purpleLight, borderWidth: 1.1, borderColor: C.purple }, v.scenarioLabel],
          [{ width: 12, borderTopWidth: 1.1, borderTopColor: C.blue, borderStyle: "dashed" as const }, `Soglia minima export (${v.threshold})`],
        ].map(([st, label]) => (
          <View key={label as string} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={st as Style} />
            <Text style={{ fontSize: 9.75, color: C.muted }}>{label as string}</Text>
          </View>
        ))}
      </View>
      <Footer v={v} />
    </Page>
  );
}

function AreaBlock({ a, v }: { a: ProfileView["areas"][number]; v: ProfileView }) {
  const [bg, fg] = TONES[a.tone];
  const col = (title: string, color: string, items: string[], empty: string) => (
    <View style={{ flex: 1, gap: 5 }}>
      <Text style={[s.cond, { fontWeight: 700, fontSize: 9.5, letterSpacing: 1.1, textTransform: "uppercase", color, paddingBottom: 4, borderBottomWidth: 1.5, borderBottomColor: color }]}>{title}</Text>
      {items.length ? (
        items.map((x) => (
          <View key={x} style={{ flexDirection: "row", gap: 4 }}>
            <Text style={[s.p, { fontSize: 8.75 }]}>•</Text>
            <Text style={[s.p, { fontSize: 8.75, flex: 1, lineHeight: 1.32 }]}>{x}</Text>
          </View>
        ))
      ) : (
        <Text style={[s.p, { fontSize: 9.5, fontStyle: "italic" }]}>{empty}</Text>
      )}
    </View>
  );
  return (
    <View style={{ borderWidth: 1, borderColor: "#DDE0E6", borderRadius: 6, padding: 12, gap: 8, marginBottom: 10 }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={s.kicker}>Area</Text>
          <Text style={{ fontSize: 16, fontWeight: 900 }}>{a.name}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: fg, backgroundColor: bg, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8 }}>{a.status}</Text>
          <Text style={[s.cond, { fontWeight: 700, fontSize: 24 }]}>{fmt(a.value)}</Text>
        </View>
      </View>
      <View style={{ gap: 3.5 }}>
        {a.indicators.map((i) => (
          <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ width: 150, fontSize: 9.5, color: C.muted }}>
              {i.label}
              {i.overridden ? " · WEM" : ""}
            </Text>
            <View style={{ flex: 1, height: 7, borderRadius: 3.5, backgroundColor: C.track, position: "relative" }}>
              <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(i.scenario / 5) * 100}%`, borderRadius: 3.5, backgroundColor: C.purpleBar }} />
              <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(i.value / 5) * 100}%`, borderRadius: 3.5, backgroundColor: C.blue }} />
              <View style={{ position: "absolute", left: `${(v.threshold / 5) * 100}%`, top: -2, bottom: -2, width: 1.5, backgroundColor: "#A5A7AC" }} />
            </View>
            <Text style={{ width: 56, textAlign: "right", fontSize: 9.5, fontWeight: 700 }}>
              {fmt(i.value)}
              {i.scenario > i.value ? <Text style={{ color: C.purple }}> → {fmt(i.scenario)}</Text> : ""}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {col("Punti di forza", C.good, a.strengths, t("empty_strengths"))}
        {col("Punti di debolezza", C.bad, a.weaknesses, t("empty_weaknesses"))}
        {col("Suggerimenti", C.goldText, a.suggestions, t("empty_suggestions"))}
      </View>
      {a.note ? (
        <View style={{ backgroundColor: C.goldLight, borderRadius: 4, padding: 8 }}>
          <Text style={[s.p, { fontSize: 9.5 }]}>
            <Text style={{ fontWeight: 700, color: C.blue }}>{t("wem_note_label")} </Text>
            {a.note}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Righe compatte a tutta larghezza: indicatore, punteggio, testo. */
function Rows({ title, color, rows, empty }: { title: string; color: string; rows: { label: string; score: string; text: string }[]; empty: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={[s.cond, { fontWeight: 700, fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", color, marginBottom: 3 }]} minPresenceAhead={36}>{title}</Text>
      {rows.length ? (
        rows.map((x) => (
          <View key={x.label} style={{ flexDirection: "row", gap: 8, paddingVertical: 3, borderTopWidth: 0.75, borderTopColor: "#E9D3DE" }} wrap={false}>
            <Text style={{ width: 118, fontSize: 9, fontWeight: 700 }}>{x.label}</Text>
            <Text style={{ width: 48, fontSize: 9, fontWeight: 700, color }}>{x.score}</Text>
            <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.35, color: C.muted }}>{x.text}</Text>
          </View>
        ))
      ) : (
        <Text style={[s.p, { fontStyle: "italic", fontSize: 9.5 }]}>{empty}</Text>
      )}
    </View>
  );
}

function ProfilePdf({ v }: { v: ProfileView }) {
  return (
    <Document title={`Export Profile – ${v.company}`} author="IAGAIN S.r.l." subject="Export Profile" language="it">
      <PageOne v={v} />

      {/* Pagine 2-4: aree, scenario e passo successivo in un flusso unico, senza spezzare i blocchi */}
      <Page size="A4" style={s.page}>
        <RunningHead v={v} />
        <Text style={s.kicker}>02 · Le 4 aree</Text>
        <Text style={s.h2}>Dove sei forte e dove perdi punti</Text>
        <Text style={[s.p, { marginBottom: 12 }]}>{v.areasLead}</Text>
        {v.areas.map((a) => <AreaBlock key={a.id} a={a} v={v} />)}
        <View style={{ backgroundColor: C.purpleLight, borderRadius: 6, padding: 14, gap: 7 }} minPresenceAhead={200}>
          <Text style={[s.kicker, { color: C.purple }]}>03 · {v.scenarioLabel}</Text>
          <Text style={[s.cond, { fontWeight: 700, fontSize: 24 }]}>
            {v.totalFmt} {v.level}
            <Text style={{ fontFamily: "Lato", color: C.purple }}>  →  </Text>
            <Text style={{ color: C.purple }}>{v.scenarioTotalFmt} {v.scenarioLevel}</Text>
          </Text>
          <Text style={s.p}>
            {v.scenarioLead}
            {v.scenarioNote ? ` ${v.scenarioNote}` : ""}
          </Text>
          <Rows title="Cosa facciamo noi" color={C.purple} rows={v.lifted.map((x) => ({ label: x.label, score: `${x.from} → ${x.to}`, text: x.text }))} empty={t("lifted_empty")} />
          <Rows title="Cosa resta a te" color={C.blue} rows={v.yours.map((x) => ({ label: x.label, score: x.value, text: x.text }))} empty={t("yours_empty")} />
        </View>

        <View style={{ marginTop: 12, backgroundColor: C.blue, borderRadius: 6, padding: 14, gap: 6 }}>
          <Text style={[s.kicker, { color: C.gold }]}>04 · {v.service.tag}</Text>
          <Text style={{ fontSize: 19, fontWeight: 900, color: "#FFFFFF" }}>{v.service.name}</Text>
          {v.blockersBeforeService ? <Text style={{ fontSize: 10, lineHeight: 1.5, color: "#E4E6EB", borderLeftWidth: 2, borderLeftColor: C.gold, paddingLeft: 8 }}>{v.blockersBeforeService}</Text> : null}
          <Text style={{ fontSize: 10, lineHeight: 1.45, color: "#D9DBE1" }}>{v.service.desc}</Text>
          {v.service.why.map((w) => (
            <View key={w} style={{ flexDirection: "row", gap: 4 }}>
              <Text style={{ fontSize: 10, color: "#D9DBE1" }}>•</Text>
              <Text style={{ fontSize: 9.5, lineHeight: 1.4, color: "#D9DBE1", flex: 1 }}>{w}</Text>
            </View>
          ))}
          <Link src={v.service.ctaUrl} style={{ marginTop: 6, backgroundColor: C.purple, color: "#FFFFFF", borderRadius: 4, paddingVertical: 8, textAlign: "center", fontSize: 11.5, fontWeight: 700, textDecoration: "none" }}>
            {v.service.cta}
          </Link>
          <Text style={{ fontSize: 9.5, color: C.line, textAlign: "center" }}>{v.service.ctaUrl}</Text>
          <Text style={{ fontSize: 9.5, color: C.line }}>{v.service.altLong}</Text>
          {v.marketsLine ? <Text style={{ fontSize: 9.5, color: C.line }}>{v.marketsLine}</Text> : null}
        </View>

        <View style={{ marginTop: 12, gap: 4 }}>
            <Text style={s.kicker}>Come leggere questo profilo</Text>
            {v.method.map((p, i) => (
              <Text key={i} style={[s.p, { fontSize: 8.5, lineHeight: 1.4 }]}>
                {p}
                {i === v.method.length - 1 ? ` ${v.methodTail}` : ""}
              </Text>
            ))}
          </View>
        <Footer v={v} />
      </Page>
    </Document>
  );
}

export async function renderProfilePdf(v: ProfileView): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<ProfilePdf v={v} />);
}

/** Nome del file senza spazi né parentesi. */
export function pdfFileName(company: string) {
  const slug = company
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
  return `Export_Profile_${slug || "azienda"}.pdf`;
}
