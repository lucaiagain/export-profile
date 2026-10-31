// Tipi della spec del metodo (export_profile_spec_vX.json) e del risultato del motore.
// Nessuna dipendenza da UI o database: questo modulo diventerà un pacchetto condiviso con M.IA.

export type AreaId = string;
export type ServiceId = string;

export interface Level {
  min: number;
  name: string;
  text: string;
}

export interface Area {
  id: AreaId;
  name: string;
  desc: string;
}

export interface SingleOption {
  key: string;
  label: string;
  score: number;
}

export interface MultiOption {
  key: string;
  label: string;
  weight: number;
  exclusive: boolean;
}

export interface SkipIf {
  field: string;
  equals: unknown;
  then_score: number;
}

interface QuestionBase {
  id: string;
  order: number;
  area: AreaId;
  text: string;
  hint: string | null;
  why: string;
  skip_if: SkipIf | null;
}

export interface SingleQuestion extends QuestionBase {
  type: "single";
  options: SingleOption[];
}

export interface MultiQuestion extends QuestionBase {
  type: "multi";
  options: MultiOption[];
}

export type Question = SingleQuestion | MultiQuestion;

export type IndicatorSource =
  | { type: "question"; question: string }
  | { type: "average"; questions: string[] }
  | { type: "weighted_multi"; question: string; base: number; max: number; none_key: string }
  | { type: "category" };

export interface Indicator {
  id: string;
  area: AreaId;
  label: string;
  source: IndicatorSource;
  texts: { strength: string; weakness: string; suggestion: string };
}

export interface ScenarioItem {
  indicator: string;
  target: number;
  text: string;
}

export interface Scenario {
  name: string;
  label: string;
  items: ScenarioItem[];
}

export interface Blocker {
  source: "indicator" | "question";
  id: string;
  if_lte: number;
  title: string;
  text: string;
}

/** Condizione elementare della regola di raccomandazione. */
export type Condition =
  | { indicator: string; lte?: number; lt?: number; gte?: number; gt?: number }
  | { total: true; lte?: number; lt?: number; gte?: number; gt?: number };

export interface Spec {
  name: string;
  version: string;
  scale: { min: number; max: number };
  threshold: number;
  rules: {
    strength_if_gte: number;
    weakness_if_lte: number;
    suggestion_if_lt: number;
    max_suggestions_per_area: number;
    area_status: { min: number; label: string }[];
    recommend: {
      rtw_if?: string;
      otherwise: ServiceId;
      when: { service: ServiceId; any: Condition[] };
    };
  };
  levels: Level[];
  areas: Area[];
  steps: { id: string; title: string; intro: string }[];
  questions: Question[];
  indicators: Indicator[];
  categories: { label: string; score: number }[];
  scenarios: Record<ServiceId, Scenario>;
  blockers: Blocker[];
  markets_of_interest: string[];
  links: Record<string, string>;
  services: Record<ServiceId, ServiceCopy>;
  texts: Record<string, unknown>;
}

export interface ServiceCopy {
  name: string;
  short: string;
  tag: string;
  desc: string;
  why: { text: string; if?: Condition; else?: string; lifted_fallback?: string; lifted_max?: number }[];
  cta: string;
  cta_link: string;
  more: string;
  more_link: string;
  scenario_note: string | null;
  alt_line: string;
  alt_long: string;
}

/** Risposte: chiave della domanda → chiave dell'opzione (o elenco di chiavi per le multiple).
 *  Contiene anche i campi dell'anagrafica usati dal calcolo: `categoria` e `nosito`. */
export type Answers = Record<string, string | string[] | boolean | undefined>;

/** Correzioni del WEM: indicatore → punteggio (1-5, passi di 0,5). */
export type Overrides = Record<string, number>;

export interface IndicatorResult {
  id: string;
  area: AreaId;
  /** punteggio usato (override se presente) */
  value: number;
  /** punteggio calcolato dalle risposte */
  computed: number;
  overridden: boolean;
  /** punteggio nello scenario con il servizio consigliato */
  scenario: number;
  /** obiettivo del servizio, se il servizio incide su questo indicatore */
  target: number | null;
}

export interface AreaResult {
  id: AreaId;
  value: number;
  scenario: number;
  status: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface ProfileResult {
  spec_version: string;
  indicators: Record<string, IndicatorResult>;
  areas: AreaResult[];
  total: number;
  level: string;
  recommended_service: ServiceId;
  scenario_total: number;
  scenario_level: string;
  /** indicatori che il servizio alza, nell'ordine della spec */
  lifted: string[];
  /** indicatori fuori dal servizio e sotto soglia, dal più basso */
  yours: string[];
  blockers: string[];
}
