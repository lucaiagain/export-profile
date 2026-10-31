"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clearToken, getToken, setToken } from "@/lib/client-store";
import { visibleQuestions, type Answers, type Question } from "@/lib/engine";
import { anagText, areaById, spec, t } from "@/lib/spec";
import { anagSchema } from "@/lib/validation";
import s from "./questionnaire.module.css";

type AnagForm = {
  company_name: string;
  contact_name: string;
  role: string;
  email: string;
  phone: string;
  region: string;
  website: string;
  no_website: boolean;
  category: string;
  privacy: boolean;
  marketing: boolean;
};

const EMPTY_ANAG: AnagForm = {
  company_name: "", contact_name: "", role: "", email: "", phone: "", region: "",
  website: "", no_website: false, category: "", privacy: false, marketing: false,
};

const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const pad = (n: number) => String(n).padStart(2, "0");

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

async function api(path: string, method: string, token: string | null, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Errore di rete"), { status: res.status });
  return data;
}

export default function Questionnaire() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setTok] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState(0);
  const [anag, setAnag] = useState<AnagForm>(EMPTY_ANAG);
  const [answers, setAnswers] = useState<Answers>({});
  const [markets, setMarkets] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  const questions = useMemo(
    () => visibleQuestions(spec, { ...answers, nosito: anag.no_website }),
    [answers, anag.no_website],
  );
  const total = questions.length;
  const marketsScreen = total + 1;
  const q: Question | undefined = screen >= 1 && screen <= total ? questions[screen - 1] : undefined;

  // Ripresa: dal link personale (?k=) o dalla memoria del dispositivo.
  useEffect(() => {
    const fromLink = params.get("k");
    if (fromLink) {
      setToken(fromLink);
      router.replace("/questionario" + (params.get("modifica") ? "?modifica=1" : ""));
    }
    const tk = fromLink ?? getToken();
    if (!tk) {
      setLoaded(true);
      return;
    }
    api("/api/profilo", "GET", tk)
      .then(({ state }) => {
        setTok(tk);
        setAnag(state.anag);
        setAnswers(state.answers ?? {});
        setMarkets(state.markets ?? []);
        setScreen(params.get("modifica") ? 1 : Math.max(1, state.step));
      })
      .catch(() => clearToken())
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Il focus va al titolo a ogni cambio di schermata (lettori di schermo, tastiera).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [screen]);

  // Turnstile sul passo 1, solo se configurato.
  const renderTurnstile = useCallback(() => {
    if (!TURNSTILE_KEY || !window.turnstile || !turnstileRef.current || turnstileRef.current.childElementCount) return;
    window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_KEY,
      language: "it",
      callback: (tk: string) => setTurnstileToken(tk),
      "expired-callback": () => setTurnstileToken(""),
    });
  }, []);
  useEffect(() => {
    if (screen === 0 && !token) renderTurnstile();
  }, [screen, token, renderTurnstile, loaded]);

  // Salvataggio automatico (dal passo 1 in poi).
  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!token) return;
      try {
        await api("/api/profilo", "PATCH", token, patch);
      } catch {
        setMessage("Non riusciamo a salvare in questo momento: controlla la connessione.");
      }
    },
    [token],
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveSoon = (patch: Record<string, unknown>) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(patch), 400);
  };

  function setAnswer(id: string, v: string | string[]) {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    setErrors({});
    saveSoon({ answers: next });
  }

  function toggleMulti(question: Extract<Question, { type: "multi" }>, key: string) {
    const cur = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
    const opt = question.options.find((o) => o.key === key)!;
    let next: string[];
    if (cur.includes(key)) next = cur.filter((k) => k !== key);
    else if (opt.exclusive) next = [key];
    else next = [...cur.filter((k) => !question.options.find((o) => o.key === k)?.exclusive), key];
    setAnswer(question.id, next);
  }

  function toggleMarket(m: string) {
    const next = markets.includes(m) ? markets.filter((x) => x !== m) : [...markets, m];
    setMarkets(next);
    saveSoon({ markets: next });
  }

  function validateAnag(): boolean {
    const parsed = anagSchema.safeParse(anag);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const e: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0]);
      if (e[k]) continue;
      e[k] =
        k === "email" ? "Inserisci un indirizzo email valido."
        : k === "phone" ? "Inserisci un numero di telefono (almeno 6 cifre)."
        : k === "website" ? "Inserisci il sito oppure spunta “Non abbiamo un sito”."
        : k === "privacy" ? "Per ricevere il profilo serve il consenso all'informativa."
        : k === "category" ? "Scegli la categoria."
        : "Campo obbligatorio.";
    }
    setErrors(e);
    setMessage("Controlla i campi evidenziati.");
    return false;
  }

  async function next() {
    setMessage("");
    if (screen === 0) {
      if (!validateAnag()) return;
      if (!token && TURNSTILE_KEY && !turnstileToken) {
        setMessage("Completa la verifica anti-bot qui sopra.");
        return;
      }
      setBusy(true);
      try {
        if (!token) {
          const utm = Object.fromEntries(
            ["source", "medium", "campaign", "term", "content"].map((k) => [k, params.get("utm_" + k) ?? ""]),
          );
          const { token: tk } = await api("/api/profilo", "POST", null, { anag, utm, turnstileToken });
          setToken(tk);
          setTok(tk);
        } else {
          await api("/api/profilo", "PATCH", token, { anag, step: 1 });
        }
        setScreen(1);
      } catch (e) {
        setMessage((e as Error).message);
        if (TURNSTILE_KEY) window.turnstile?.reset();
      } finally {
        setBusy(false);
      }
      return;
    }
    if (q) {
      const v = answers[q.id];
      const ok = q.type === "multi" ? Array.isArray(v) && v.length > 0 : typeof v === "string";
      if (!ok) {
        setErrors({ [q.id]: "Scegli una risposta per continuare." });
        setMessage("Scegli una risposta per continuare.");
        return;
      }
      clearTimeout(saveTimer.current);
      save({ answers, step: screen + 1 });
      setScreen(screen + 1);
      return;
    }
    if (screen === marketsScreen) {
      setBusy(true);
      clearTimeout(saveTimer.current);
      try {
        await api("/api/profilo", "PATCH", token, { answers, markets, step: marketsScreen });
        await api("/api/profilo/completa", "POST", token);
        router.push(`/profilo/${token}`);
      } catch (e) {
        setMessage((e as Error).message);
        setBusy(false);
      }
    }
  }

  function back() {
    setMessage("");
    setErrors({});
    if (screen === 0) router.push("/");
    else setScreen(screen - 1);
  }

  if (!loaded) return <div className={s.loading} aria-live="polite">Caricamento…</div>;

  const step = screen === 0 ? spec.steps[0] : q ? spec.steps.find((st) => st.id === q.area)! : spec.steps[spec.steps.length - 1];
  const stepNo = spec.steps.indexOf(step) + 1;
  const counter = screen === 0 ? "Dati dell'azienda" : q ? `Domanda ${screen} di ${total}` : "Ultima domanda, facoltativa";
  const pct = Math.round((Math.min(screen, total) / total) * 100);

  return (
    <>
      {TURNSTILE_KEY && !token && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onLoad={renderTurnstile} />
      )}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" aria-label="Export Profile, pagina iniziale">
            <img className={s.logo} src="/loghi/iagain-logo-negativo.svg" alt="IAGAIN" width={62} height={52} />
          </Link>
          <span className={s.tagline}>Export Profile · metodo WIFO®</span>
          <span className={s.mobileCount}>{screen >= 1 && q ? `${screen} di ${total}` : ""}</span>
        </div>
      </header>

      <div className={s.progress}>
        <div className={s.progressInner}>
          <div className={s.progressRow}>
            <span className={s.stepName}>
              <span className={s.stepNo}>{stepNo} · </span>
              {screen === 0 ? step.title : q ? areaById[q.area].name : "Mercati di interesse"}
            </span>
            <span className={s.counter}>{counter}</span>
          </div>
          <div className={s.segments} aria-hidden="true">
            {questions.map((qq, i) => (
              <span key={qq.id} className={i + 1 < screen ? s.segDone : i + 1 === screen ? s.segNow : s.seg} />
            ))}
          </div>
          <div className={s.bar} aria-hidden="true">
            <div style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <main className={s.main}>
        <form
          className={s.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {screen === 0 && (
            <AnagStep
              anag={anag}
              errors={errors}
              setAnag={(a) => {
                setAnag(a);
                setErrors({});
              }}
              headingRef={headingRef}
              turnstileRef={turnstileRef}
              showTurnstile={!!TURNSTILE_KEY && !token}
            />
          )}

          {q && (
            <fieldset className={s.fieldset} aria-describedby={`why-${q.id}`}>
              <legend className={s.legend}>
                <span className={s.qn}>{pad(screen)}</span>
                <span className={s.qtext} tabIndex={-1} ref={headingRef as React.RefObject<HTMLSpanElement>}>
                  {q.text}
                </span>
              </legend>
              <p className={s.hint}>{q.hint ?? t("question_hint_default")}</p>
              {q.type === "single"
                ? q.options.map((o) => {
                    const id = `${q.id}-${o.key}`;
                    const checked = answers[q.id] === o.key;
                    return (
                      <label key={o.key} htmlFor={id} className={checked ? s.optOn : s.opt}>
                        <input
                          type="radio"
                          id={id}
                          name={q.id}
                          value={o.key}
                          checked={checked}
                          onChange={() => setAnswer(q.id, o.key)}
                        />
                        <span>{o.label}</span>
                      </label>
                    );
                  })
                : q.options.map((o) => {
                    const id = `${q.id}-${o.key}`;
                    const cur = answers[q.id];
                    const checked = Array.isArray(cur) && cur.includes(o.key);
                    return (
                      <label key={o.key} htmlFor={id} className={checked ? s.optOn : s.opt}>
                        <input type="checkbox" id={id} name={q.id} value={o.key} checked={checked} onChange={() => toggleMulti(q, o.key)} />
                        <span>{o.label}</span>
                      </label>
                    );
                  })}
              <div className={s.why} id={`why-${q.id}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7A6747" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5" />
                  <path d="M12 8h.01" />
                </svg>
                <p>
                  {t("why_prefix")} {q.why.charAt(0).toLowerCase() + q.why.slice(1)}
                </p>
              </div>
            </fieldset>
          )}

          {screen === marketsScreen && (
            <fieldset className={s.fieldset}>
              <legend className={s.legend}>
                <span className={s.qn}>{pad(total + 1)}</span>
                <span className={s.qtext} tabIndex={-1} ref={headingRef as React.RefObject<HTMLSpanElement>}>
                  {t("markets_question")}
                </span>
              </legend>
              <p className={s.hint}>{t("markets_hint")}</p>
              <div className={s.marketGrid}>
                {spec.markets_of_interest.map((m, i) => {
                  const checked = markets.includes(m);
                  return (
                    <label key={m} htmlFor={`mk-${i}`} className={checked ? s.optOn : s.opt}>
                      <input type="checkbox" id={`mk-${i}`} name="mercati" value={m} checked={checked} onChange={() => toggleMarket(m)} />
                      <span>{m}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <p className={s.message} role="alert" aria-live="assertive">
            {message}
          </p>

          <nav className={s.nav} aria-label="Navigazione questionario">
            <button type="button" className="btn btn-ghost" onClick={back}>
              Indietro
            </button>
            <button type="submit" className={`btn btn-primary ${s.next}`} disabled={busy}>
              {busy ? "Attendi…" : screen === marketsScreen ? "Vedi il tuo Export Profile" : "Avanti"}
            </button>
          </nav>
        </form>
        <p className={s.autosave}>{t("autosave_note")}</p>
      </main>
    </>
  );
}

function AnagStep({
  anag,
  errors,
  setAnag,
  headingRef,
  turnstileRef,
  showTurnstile,
}: {
  anag: AnagForm;
  errors: Record<string, string>;
  setAnag: (a: AnagForm) => void;
  headingRef: React.RefObject<HTMLElement | null>;
  turnstileRef: React.RefObject<HTMLDivElement | null>;
  showTurnstile: boolean;
}) {
  const step = spec.steps[0];
  const set = <K extends keyof AnagForm>(k: K, v: AnagForm[K]) => setAnag({ ...anag, [k]: v });
  const text = (k: keyof AnagForm, label: string, req: boolean, type = "text", ac?: string) => (
    <div className={`field ${errors[k] ? "invalid" : ""}`}>
      <label htmlFor={`f-${k}`}>
        {label}
        {req && <span className="req" aria-hidden="true"> *</span>}
      </label>
      <input
        id={`f-${k}`}
        className="input"
        type={type}
        autoComplete={ac}
        required={req}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `e-${k}` : undefined}
        value={anag[k] as string}
        onChange={(e) => set(k, e.target.value as never)}
      />
      {errors[k] && <span id={`e-${k}`} className="field-error">{errors[k]}</span>}
    </div>
  );
  const [before, after] = anagText.privacy.split(anagText.privacy_link_text);

  return (
    <div className={s.anag}>
      <h1 className={s.anagTitle} tabIndex={-1} ref={headingRef as React.RefObject<HTMLHeadingElement>}>
        {step.title}
      </h1>
      <p className={s.intro}>{step.intro}</p>
      <div className={s.fields}>
        {text("company_name", anagText.azienda, true, "text", "organization")}
        {text("contact_name", anagText.referente, true, "text", "name")}
        {text("email", anagText.email, true, "email", "email")}
        {text("phone", anagText.telefono, true, "tel", "tel")}
        <div className={`field ${errors.category ? "invalid" : ""}`}>
          <label htmlFor="f-category">
            {anagText.categoria}
            <span className="req" aria-hidden="true"> *</span>
          </label>
          <select
            id="f-category"
            className="select"
            required
            aria-invalid={!!errors.category}
            value={anag.category}
            onChange={(e) => set("category", e.target.value)}
          >
            <option value="">{anagText.categoria_placeholder}</option>
            {spec.categories.map((c) => (
              <option key={c.label}>{c.label}</option>
            ))}
          </select>
          {errors.category && <span className="field-error">{errors.category}</span>}
        </div>
        <div className={`field ${errors.website ? "invalid" : ""}`}>
          <label htmlFor="f-website">
            {anagText.sito}
            <span className="req" aria-hidden="true"> *</span>
          </label>
          <input
            id="f-website"
            className="input"
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder={anagText.sito_placeholder}
            disabled={anag.no_website}
            aria-invalid={!!errors.website}
            value={anag.website}
            onChange={(e) => set("website", e.target.value)}
          />
          <label className="check" htmlFor="f-nosito">
            <input
              type="checkbox"
              id="f-nosito"
              checked={anag.no_website}
              onChange={(e) => setAnag({ ...anag, no_website: e.target.checked, website: e.target.checked ? "" : anag.website })}
            />
            <span>{anagText.nosito}</span>
          </label>
          {errors.website && <span className="field-error">{errors.website}</span>}
        </div>
        {text("role", anagText.ruolo, false, "text", "organization-title")}
        {text("region", anagText.regione, false, "text", "address-level1")}
      </div>

      <div className={s.consents}>
        <label className={`check ${errors.privacy ? "invalid" : ""}`} htmlFor="f-privacy">
          <input type="checkbox" id="f-privacy" checked={anag.privacy} onChange={(e) => set("privacy", e.target.checked)} />
          <span>
            {before}
            <a href={spec.links.privacy} target="_blank" rel="noopener noreferrer">
              {anagText.privacy_link_text}
            </a>
            {after}
            <span className="req" aria-hidden="true"> *</span>
          </span>
        </label>
        {errors.privacy && <span className="field-error">{errors.privacy}</span>}
        <label className="check" htmlFor="f-marketing">
          <input type="checkbox" id="f-marketing" checked={anag.marketing} onChange={(e) => set("marketing", e.target.checked)} />
          <span>{anagText.marketing}</span>
        </label>
        <p className={s.retention}>{anagText.retention}</p>
        {showTurnstile && <div ref={turnstileRef} className={s.turnstile} />}
      </div>
    </div>
  );
}
