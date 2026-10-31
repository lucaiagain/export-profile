import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { computeProfile, missingQuestions, visibleQuestions, type Answers } from "@/lib/engine";
import { spec } from "@/lib/spec";
import { SAMPLE_ANSWERS } from "@/lib/sample";

/* Carica il motore del prototipo (riferimenti/export_profile_prototipo.html) per il confronto. */
function loadPrototype() {
  const html = fs.readFileSync(path.join(__dirname, "../riferimenti/export_profile_prototipo.html"), "utf8");
  const start = html.indexOf("<script>") + "<script>".length;
  const end = html.indexOf("/* =========================================================\n   QUESTIONARIO");
  const code = html.slice(start, end) + ";({compute, SAMPLE, QUESTIONS, INDICATORS});";
  return vm.runInNewContext(code, { location: { hash: "" }, document: {}, localStorage: {} });
}
const proto = loadPrototype();

/** Risposte in chiavi della spec → risposte del prototipo (punteggi). */
function toProto(a: Answers) {
  const out: Record<string, unknown> = { categoria: a.categoria, nosito: a.nosito };
  for (const q of spec.questions) {
    const v = a[q.id];
    if (q.type === "multi") out[q.id] = v;
    else if (q.skip_if && a[q.skip_if.field] === q.skip_if.equals) out[q.id] = q.skip_if.then_score;
    else out[q.id] = q.options.find((o) => o.key === v)!.score;
  }
  return out;
}

function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

function randomAnswers(r: () => number): Answers {
  const a: Answers = {
    categoria: spec.categories[Math.floor(r() * spec.categories.length)].label,
    nosito: r() < 0.2,
  };
  for (const q of spec.questions) {
    if (q.type === "single") a[q.id] = q.options[Math.floor(r() * q.options.length)].key;
    else {
      const keys = q.options.filter(() => r() < 0.35).map((o) => o.key);
      a[q.id] = keys.length ? keys : [q.options[Math.floor(r() * q.options.length)].key];
    }
  }
  return a;
}

describe("collaudo minimo (sezione 11)", () => {
  it("risposte d'esempio: 2,53 Apprendista, aree, Road to World, scenario 3,21", () => {
    const r = computeProfile(spec, SAMPLE_ANSWERS);
    expect(r.total).toBeCloseTo(2.53, 2);
    expect(r.level).toBe("Apprendista");
    const areas = Object.fromEntries(r.areas.map((x) => [x.id, x.value]));
    expect(areas.com).toBeCloseTo(2.43, 2);
    expect(areas.org).toBeCloseTo(2.4, 2);
    expect(areas.off).toBeCloseTo(2.7, 2);
    expect(areas.esp).toBeCloseTo(2.58, 2);
    expect(r.recommended_service).toBe("rtw");
    expect(r.scenario_total).toBeCloseTo(3.21, 2);
    expect(r.scenario_level).toBe("Specialista");
    expect(r.blockers).toEqual([]);
  });

  it("capacità produttiva = 1 e budget = 1: 2 fattori bloccanti", () => {
    const r = computeProfile(spec, { ...SAMPLE_ANSWERS, org4: "1", esp6b: "1" });
    expect(r.blockers).toEqual(["org4", "esp6b"]);
  });

  it("'Non abbiamo un sito': la domanda 2 non compare e vale 1", () => {
    const a = { ...SAMPLE_ANSWERS, nosito: true, com2: undefined };
    expect(visibleQuestions(spec, a).map((q) => q.id)).not.toContain("com2");
    expect(visibleQuestions(spec, a)).toHaveLength(22);
    expect(missingQuestions(spec, a)).toEqual([]);
    expect(computeProfile(spec, a).indicators.com2.value).toBe(1);
  });

  it("'Nessuna' nelle certificazioni vale 1 anche con altre scelte", () => {
    const r = computeProfile(spec, { ...SAMPLE_ANSWERS, off4: ["bio", "ifs", "none"] });
    expect(r.indicators.off4.value).toBe(1);
  });

  it("le certificazioni non superano 5", () => {
    const r = computeProfile(spec, { ...SAMPLE_ANSWERS, off4: ["bio", "dop", "ifs", "hal", "lab", "fda"] });
    expect(r.indicators.off4.value).toBe(5);
  });

  it("gli override cambiano il punteggio senza toccare il calcolato", () => {
    const r = computeProfile(spec, SAMPLE_ANSWERS, { com1: 4.5 });
    expect(r.indicators.com1.value).toBe(4.5);
    expect(r.indicators.com1.computed).toBe(2);
    expect(r.indicators.com1.overridden).toBe(true);
  });

  it("risposta mancante: errore esplicito", () => {
    expect(() => computeProfile(spec, { ...SAMPLE_ANSWERS, com1: undefined })).toThrow(/com1/);
  });
});

describe("coincidenza con il prototipo", () => {
  it("SAMPLE del prototipo coincide con SAMPLE_ANSWERS", () => {
    const p = proto.compute(proto.SAMPLE);
    const r = computeProfile(spec, SAMPLE_ANSWERS);
    expect(r.total).toBeCloseTo(p.total, 10);
  });

  it("2000 combinazioni casuali: indicatori, aree, servizio, scenario, bloccanti, testi", () => {
    const r = rng(42);
    for (let n = 0; n < 2000; n++) {
      const a = randomAnswers(r);
      const overrides: Record<string, number> = {};
      if (n % 5 === 0) {
        const d = spec.indicators[Math.floor(r() * spec.indicators.length)];
        overrides[d.id] = 1 + Math.floor(r() * 9) / 2;
      }
      const mine = computeProfile(spec, a, overrides);
      const p = proto.compute(toProto(a), overrides);

      expect(mine.recommended_service).toBe(p.svc);
      expect(mine.total).toBeCloseTo(p.total, 10);
      expect(mine.scenario_total).toBeCloseTo(p.totalW, 10);
      expect(mine.level).toBe(p.level.name);
      expect(mine.scenario_level).toBe(p.levelW.name);
      for (const d of spec.indicators) {
        expect(mine.indicators[d.id].value).toBeCloseTo(p.ind[d.id].v, 10);
        expect(mine.indicators[d.id].scenario).toBeCloseTo(p.ind[d.id].w, 10);
      }
      expect(mine.blockers).toEqual(p.blockers.map((b: { id: string }) => b.id));

      // testi di area con le stesse regole del prototipo (areaHTML)
      for (const ar of p.areas) {
        const m = mine.areas.find((x) => x.id === ar.id)!;
        expect(m.value).toBeCloseTo(ar.v, 10);
        type PI = { v: number; def: { id: string } };
        expect(m.strengths).toEqual(ar.list.filter((x: PI) => x.v >= 4).map((x: PI) => x.def.id));
        expect(m.weaknesses).toEqual(ar.list.filter((x: PI) => x.v <= 2.5).map((x: PI) => x.def.id));
        expect(m.suggestions).toEqual(
          ar.list.filter((x: PI) => x.v < 3).sort((a: PI, b: PI) => a.v - b.v).slice(0, 4).map((x: PI) => x.def.id),
        );
      }
      // "cosa facciamo noi" / "cosa resta a te" (renderProfile)
      type PX = { v: number; w: number; svcTarget: number | null; def: { id: string } };
      const pind = proto.INDICATORS.map((d: { id: string }) => p.ind[d.id]) as PX[];
      expect(mine.lifted).toEqual(pind.filter((x) => x.w > x.v).map((x) => x.def.id));
      expect(mine.yours).toEqual(
        pind.filter((x) => !x.svcTarget && x.v < 3).sort((a, b) => a.v - b.v).map((x) => x.def.id),
      );
    }
  });

  it("testi della spec uguali a quelli del prototipo", () => {
    for (const d of proto.INDICATORS) {
      const s = spec.indicators.find((x) => x.id === d.id)!;
      expect(s.texts.strength).toBe(d.strong);
      expect(s.texts.weakness).toBe(d.weak);
      expect(s.texts.suggestion).toBe(d.sugg);
    }
  });
});
