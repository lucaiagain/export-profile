// Motore di calcolo dell'Export Profile: funzione pura, tutto si legge dalla spec.
import type {
  Answers,
  AreaResult,
  Condition,
  Indicator,
  IndicatorResult,
  Overrides,
  ProfileResult,
  Question,
  Spec,
} from "./types";

export * from "./types";

const EPS = 1e-9;
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Una domanda è da mostrare se la sua regola skip_if non scatta. */
export function isSkipped(q: Question, answers: Answers): boolean {
  return !!q.skip_if && answers[q.skip_if.field] === q.skip_if.equals;
}

/** Domande visibili, nell'ordine del questionario. */
export function visibleQuestions(spec: Spec, answers: Answers): Question[] {
  return [...spec.questions].sort((a, b) => a.order - b.order).filter((q) => !isSkipped(q, answers));
}

/** Domande visibili ancora senza risposta valida. */
export function missingQuestions(spec: Spec, answers: Answers): string[] {
  return visibleQuestions(spec, answers)
    .filter((q) => questionScore(q, answers) === undefined)
    .map((q) => q.id);
}

/** Punteggio di una domanda a scelta singola, o undefined se manca la risposta. */
function questionScore(q: Question, answers: Answers): number | undefined {
  if (isSkipped(q, answers)) return q.skip_if!.then_score;
  const a = answers[q.id];
  if (q.type === "single") {
    return q.options.find((o) => o.key === a)?.score;
  }
  return Array.isArray(a) && a.length > 0 ? 0 : undefined; // le multiple si valutano nell'indicatore
}

function questionById(spec: Spec, id: string): Question {
  const q = spec.questions.find((x) => x.id === id);
  if (!q) throw new Error(`Domanda sconosciuta nella spec: ${id}`);
  return q;
}

function indicatorScore(spec: Spec, ind: Indicator, answers: Answers): number {
  const src = ind.source;
  switch (src.type) {
    case "question": {
      const v = questionScore(questionById(spec, src.question), answers);
      if (v === undefined) throw new Error(`Risposta mancante: ${src.question}`);
      return v;
    }
    case "average":
      return avg(
        src.questions.map((id) => {
          const v = questionScore(questionById(spec, id), answers);
          if (v === undefined) throw new Error(`Risposta mancante: ${id}`);
          return v;
        }),
      );
    case "weighted_multi": {
      const q = questionById(spec, src.question);
      if (q.type !== "multi") throw new Error(`${src.question} non è una domanda multipla`);
      const sel = answers[src.question];
      const keys = Array.isArray(sel) ? sel : [];
      if (keys.length === 0 || keys.includes(src.none_key)) return src.base;
      const sum = q.options.filter((o) => keys.includes(o.key)).reduce((t, o) => t + o.weight, 0);
      return Math.min(src.max, src.base + sum);
    }
    case "category": {
      const cat = spec.categories.find((c) => c.label === answers.categoria);
      if (!cat) throw new Error(`Categoria mancante o sconosciuta: ${String(answers.categoria)}`);
      return cat.score;
    }
  }
}

export function levelOf(spec: Spec, score: number) {
  let level = spec.levels[0];
  for (const l of spec.levels) if (score >= l.min - EPS) level = l;
  return level;
}

export function areaStatus(spec: Spec, score: number): string {
  const sorted = [...spec.rules.area_status].sort((a, b) => b.min - a.min);
  return (sorted.find((s) => score >= s.min - EPS) ?? sorted[sorted.length - 1]).label;
}

/** Valuta una condizione della spec sui punteggi correnti. */
export function evalCondition(c: Condition, indicators: Record<string, number>, total: number): boolean {
  const v = "total" in c ? total : indicators[c.indicator];
  if (v === undefined) return false;
  if (c.lte !== undefined && !(v <= c.lte + EPS)) return false;
  if (c.lt !== undefined && !(v < c.lt - EPS)) return false;
  if (c.gte !== undefined && !(v >= c.gte - EPS)) return false;
  if (c.gt !== undefined && !(v > c.gt + EPS)) return false;
  return true;
}

function areaAverages(spec: Spec, values: Record<string, number>) {
  return spec.areas.map((ar) => avg(spec.indicators.filter((d) => d.area === ar.id).map((d) => values[d.id])));
}

/**
 * Calcola l'Export Profile.
 * @param spec      la spec del metodo
 * @param answers   risposte (chiavi delle opzioni) più `categoria` e `nosito`
 * @param overrides correzioni del WEM per indicatore; non toccano le risposte
 * @param service   servizio da usare per lo scenario; di norma quello raccomandato
 */
export function computeProfile(
  spec: Spec,
  answers: Answers,
  overrides: Overrides = {},
  service?: string,
): ProfileResult {
  const missing = missingQuestions(spec, answers);
  if (missing.length) throw new Error(`Risposte mancanti: ${missing.join(", ")}`);

  const computed: Record<string, number> = {};
  const value: Record<string, number> = {};
  for (const d of spec.indicators) {
    computed[d.id] = indicatorScore(spec, d, answers);
    value[d.id] = overrides[d.id] ?? computed[d.id];
  }

  const total = avg(areaAverages(spec, value));
  const rule = spec.rules.recommend;
  const svc =
    service ?? (rule.when.any.some((c) => evalCondition(c, value, total)) ? rule.when.service : rule.otherwise);
  const scenario = spec.scenarios[svc];
  if (!scenario) throw new Error(`Servizio sconosciuto: ${svc}`);

  const target: Record<string, number> = {};
  for (const it of scenario.items) target[it.indicator] = it.target;
  const scen: Record<string, number> = {};
  for (const d of spec.indicators) scen[d.id] = d.id in target ? Math.max(value[d.id], target[d.id]) : value[d.id];

  const indicators: Record<string, IndicatorResult> = {};
  for (const d of spec.indicators) {
    indicators[d.id] = {
      id: d.id,
      area: d.area,
      value: value[d.id],
      computed: computed[d.id],
      overridden: overrides[d.id] !== undefined,
      scenario: scen[d.id],
      target: target[d.id] ?? null,
    };
  }

  const r = spec.rules;
  const areaVals = areaAverages(spec, value);
  const areaScen = areaAverages(spec, scen);
  const areas: AreaResult[] = spec.areas.map((ar, i) => {
    const list = spec.indicators.filter((d) => d.area === ar.id);
    return {
      id: ar.id,
      value: areaVals[i],
      scenario: areaScen[i],
      status: areaStatus(spec, areaVals[i]),
      strengths: list.filter((d) => value[d.id] >= r.strength_if_gte - EPS).map((d) => d.id),
      weaknesses: list.filter((d) => value[d.id] <= r.weakness_if_lte + EPS).map((d) => d.id),
      suggestions: list
        .filter((d) => value[d.id] < r.suggestion_if_lt - EPS)
        .sort((a, b) => value[a.id] - value[b.id])
        .slice(0, r.max_suggestions_per_area)
        .map((d) => d.id),
    };
  });

  const scenarioTotal = avg(areaScen);

  const blockers = spec.blockers
    .filter((b) => {
      const v =
        b.source === "indicator"
          ? value[b.id]
          : questionScore(questionById(spec, b.id), answers);
      return v !== undefined && v <= b.if_lte + EPS;
    })
    .map((b) => b.id);

  return {
    spec_version: spec.version,
    indicators,
    areas,
    total,
    level: levelOf(spec, total).name,
    recommended_service: svc,
    scenario_total: scenarioTotal,
    scenario_level: levelOf(spec, scenarioTotal).name,
    lifted: spec.indicators.filter((d) => scen[d.id] > value[d.id] + EPS).map((d) => d.id),
    yours: spec.indicators
      .filter((d) => !(d.id in target) && value[d.id] < spec.threshold - EPS)
      .sort((a, b) => value[a.id] - value[b.id])
      .map((d) => d.id),
    blockers,
  };
}

/** Formato di visualizzazione: una cifra decimale, virgola come separatore. */
export const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");

/** Arrotondamento a 2 decimali per salvataggi e integrazioni. */
export const round2 = (n: number) => Math.round(n * 100) / 100;
