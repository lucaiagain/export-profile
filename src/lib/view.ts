// Dal risultato del motore ai testi da mostrare (profilo a video e PDF). Tutti i testi vengono dalla spec.
import { evalCondition, fmt, levelOf, type ProfileResult } from "@/lib/engine";
import { areaById, blockerById, fill, indicatorById, spec, t } from "@/lib/spec";

export interface ProfileContext {
  company_name: string;
  contact_name: string;
  role?: string | null;
  region?: string | null;
  category: string;
  markets: string[];
  wem_notes?: Record<string, string>;
  wem_name?: string | null;
  date: Date;
  sample?: boolean;
}

export type StatusTone = "top" | "ok" | "warn" | "bad";

export function statusTone(label: string): StatusTone {
  const i = spec.rules.area_status.findIndex((s) => s.label === label);
  return (["top", "ok", "warn", "bad"] as const)[Math.max(0, i)];
}

const dateIt = (d: Date) => d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

export function buildView(r: ProfileResult, ctx: ProfileContext) {
  const svc = spec.services[r.recommended_service];
  const altId = Object.keys(spec.services).find((k) => k !== r.recommended_service)!;
  const scenario = spec.scenarios[r.recommended_service];
  const scenarioLabel = scenario.label.replace(/^con /, "Con ");
  const level = levelOf(spec, r.total);
  const values = Object.fromEntries(Object.values(r.indicators).map((i) => [i.id, i.value]));
  const uplift = Object.fromEntries(scenario.items.map((it) => [it.indicator, it.text]));
  const sameLevel = r.level === r.scenario_level;

  const why = svc.why.map((w) => {
    if (w.if) return evalCondition(w.if, values, r.total) ? w.text : (w.else ?? w.text);
    if (w.text.includes("{lifted}")) {
      const names = r.lifted.slice(0, w.lifted_max ?? 3).map((id) => indicatorById[id].label.toLowerCase());
      return fill(w.text, { lifted: names.join(", ") || (w.lifted_fallback ?? "") });
    }
    return w.text;
  });

  return {
    date: dateIt(ctx.date),
    company: ctx.company_name,
    meta: [ctx.category, ctx.region, ctx.contact_name && ctx.contact_name + (ctx.role ? `, ${ctx.role.toLowerCase()}` : "")].filter(
      Boolean,
    ) as string[],
    sample: !!ctx.sample,
    total: r.total,
    totalFmt: fmt(r.total),
    level: r.level,
    levelText: level.text,
    scenarioTotal: r.scenario_total,
    scenarioTotalFmt: fmt(r.scenario_total),
    scenarioLevel: r.scenario_level,
    scenarioLabel,
    serviceShort: svc.short,
    threshold: spec.threshold,
    levels: spec.levels.map((l) => l.name),
    blockers: r.blockers.map((id) => blockerById[id]),
    blockersTitle:
      r.blockers.length === 1 ? t("blockers_title_one") : t("blockers_title_many", { n: r.blockers.length }),
    areas: r.areas.map((a) => ({
      id: a.id,
      name: areaById[a.id].name,
      desc: areaById[a.id].desc,
      value: a.value,
      scenario: a.scenario,
      status: a.status,
      tone: statusTone(a.status),
      note: ctx.wem_notes?.[a.id]?.trim() || "",
      indicators: spec.indicators
        .filter((d) => d.area === a.id)
        .map((d) => ({
          id: d.id,
          label: d.label,
          value: r.indicators[d.id].value,
          scenario: r.indicators[d.id].scenario,
          overridden: r.indicators[d.id].overridden,
        })),
      strengths: a.strengths.map((id) => indicatorById[id].texts.strength),
      weaknesses: a.weaknesses.map((id) => indicatorById[id].texts.weakness),
      suggestions: a.suggestions.map((id) => indicatorById[id].texts.suggestion),
    })),
    scenarioLead: sameLevel
      ? t("scenario_same_level", { service: svc.name, delta: fmt(r.scenario_total - r.total) })
      : t("scenario_level_up", { service: svc.name, from: r.level, to: r.scenario_level }),
    scenarioNote: svc.scenario_note,
    lifted: r.lifted.map((id) => ({
      label: indicatorById[id].label,
      from: fmt(r.indicators[id].value),
      to: fmt(r.indicators[id].scenario),
      text: uplift[id],
    })),
    yours: r.yours.map((id) => ({
      label: indicatorById[id].label,
      value: fmt(r.indicators[id].value),
      text: indicatorById[id].texts.suggestion,
    })),
    service: {
      id: r.recommended_service,
      name: svc.name,
      tag: svc.tag,
      desc: svc.desc,
      why,
      cta: svc.cta,
      ctaUrl: spec.links[svc.cta_link],
      more: svc.more,
      moreUrl: spec.links[svc.more_link],
      altLine: svc.alt_line,
      altLong: svc.alt_long,
      altName: spec.services[altId].name,
    },
    blockersBeforeService: r.blockers.length
      ? t(r.blockers.length === 1 ? "blockers_before_service_one" : "blockers_before_service_many")
      : "",
    marketsLine: ctx.markets.length ? t("markets_line", { markets: ctx.markets.join(", ") }) : "",
    method: (spec.texts.method as string[]).map((p) => fill(p, { threshold: spec.threshold, scenario: scenario.label })),
    methodShort: t("method_short"),
    methodTail: ctx.wem_name ? t("method_signed", { wem: ctx.wem_name }) : t("method_unsigned"),
    wemName: ctx.wem_name ?? "",
    areasLead: t("areas_lead", { threshold: spec.threshold }),
  };
}

export type ProfileView = ReturnType<typeof buildView>;

/** Posizione sulla scala 1-5, in percentuale. */
export const scalePct = (v: number) => ((v - spec.scale.min) / (spec.scale.max - spec.scale.min)) * 100;

/** Punti del radar (4 assi: alto, destra, basso, sinistra) come nel canvas. */
export function radarPoints(vals: number[], cx = 250, cy = 180, R = 120) {
  const ang = vals.map((_, i) => ((-90 + (360 / vals.length) * i) * Math.PI) / 180);
  return vals
    .map((v, i) => {
      const k = v / spec.scale.max;
      return `${(cx + Math.cos(ang[i]) * R * k).toFixed(1)},${(cy + Math.sin(ang[i]) * R * k).toFixed(1)}`;
    })
    .join(" ");
}
