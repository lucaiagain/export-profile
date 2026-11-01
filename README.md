# Export Profile IAGAIN

App pubblica per **exportprofile.iagain.it**: questionario di 23 domande, profilo export immediato, PDF via email, area staff con modalità WEM. Istruzioni di partenza in `riferimenti/ISTRUZIONI_CODE_export_profile_v2.md`.

Stack: Next.js 15 (App Router) · TypeScript · Supabase (Postgres con RLS) · Vercel · SMTP Aruba per le email · Brevo per i contatti.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `spec/export_profile_spec_v1.1.0.json` | **Il metodo**: domande, punteggi, regole, testi. Fonte unica di verità |
| `src/lib/engine/` | Motore puro `computeProfile(spec, answers, overrides?)`, senza dipendenze da UI o database: pronto a diventare il pacchetto condiviso con M.IA |
| `src/lib/view.ts` | Dal risultato ai testi da mostrare (usato da pagina e PDF) |
| `src/components/` | Questionario, profilo a video |
| `src/lib/pdf.tsx` | PDF A4 generato sul server (react-pdf, font in `assets/fonts`) |
| `src/app/staff/` | Area IAGAIN: elenco, filtri, CSV, modalità WEM |
| `src/lib/jobs.ts`, `src/app/api/cron/` | Promemoria, cancellazione a 14 giorni, consegna a M.IA |
| `supabase/migrations/` | Schema del database |
| `tests/` | Collaudo: motore contro il prototipo, promemoria e cancellazione |
| `riferimenti/` | Istruzioni, prototipo, grafica approvata |

### Spec 1.1.0
Rispetto alla 1.0.0 ci sono **solo aggiunte, con punteggi identici** (verificato dai test):
- `rules.recommend.when`: la regola del servizio consigliato in forma leggibile dal motore (la 1.0.0 la descriveva solo a parole);
- `services`: testi delle schede Road to World e WIFO Export Office;
- `texts`: testi del profilo, dell'anagrafica e dell'apertura, presi dal prototipo.

Per una nuova versione del metodo: nuovo file in `spec/`, aggiornare l'import in `src/lib/spec.ts`. Ogni profilo salva la versione con cui è stato calcolato (`spec_version`).

## Sviluppo locale

```bash
npm install
npm run dev
```

Senza variabili d'ambiente l'app gira in modalità sviluppo: dati in `.data/dev-db.json`, email (con PDF allegato) in `.data/mail/`, accesso staff senza link magico su `/staff/accedi`.

```bash
npm test        # motore vs prototipo (2000 combinazioni) + promemoria/cancellazione
npm run build
```

## Messa in produzione

1. **Supabase**: nuovo progetto (region EU, es. Francoforte), separato da M.IA. Eseguire `supabase/migrations/0001_init.sql` nell'editor SQL. In *Authentication → URL configuration* impostare Site URL `https://exportprofile.iagain.it` e aggiungere `https://exportprofile.iagain.it/staff/auth/callback` ai Redirect URL.
2. **Vercel**: nuovo progetto nello stesso account di M.IA, collegato a questo repository. Inserire le variabili di `.env.example` (per `TOKEN_ENC_KEY` e `CRON_SECRET`: `openssl rand -base64 32`). I job pianificati sono in `vercel.json`.
3. **Dominio**: in Vercel aggiungere `exportprofile.iagain.it`, poi nel DNS di iagain.it creare il record
   `exportprofile  CNAME  cname.vercel-dns.com.` (Vercel conferma il valore esatto nella schermata del dominio).
4. **Turnstile**: in Cloudflare creare un widget per `exportprofile.iagain.it` e inserire le due chiavi.
5. **Email (Aruba)**: creare su Aruba la casella `exportprofile@iagain.it` e impostare `SMTP_HOST=smtps.aruba.it`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` (e se serve `MAIL_REPLY_TO`). L'SPF di iagain.it autorizza già Aruba. Le stesse credenziali vanno in Supabase → *Authentication → Emails → SMTP Settings* per i link di accesso dello staff.
   Senza SMTP i lead si salvano comunque; promemoria e PDF via email non partono.
6. **Brevo** (quando arriva la chiave), solo per i contatti: creare gli attributi `EP_AZIENDA` (testo), `EP_PUNTEGGIO` (numero), `EP_GRADO`, `EP_SERVIZIO`, `EP_BLOCCANTI`, `EP_CATEGORIA`, `EP_MERCATI` (testo), `EP_MARKETING` (booleano); impostare `BREVO_API_KEY`, `BREVO_LIST_ID` (facoltativo) e `BREVO_ENABLED=true`.
7. **M.IA** (quando avrà l'area marketing): impostare `MIA_ENDPOINT`, `MIA_HMAC_SECRET`, `MIA_ENABLED=true`. La coda `outbox_mia` contiene già i profili raccolti: partono al primo giro.

## Contratto verso M.IA

`POST {MIA_ENDPOINT}` con corpo JSON come da sezione 7 delle istruzioni (`src/lib/mia.ts`).
- `X-IAGAIN-Signature`: HMAC-SHA256 esadecimale del corpo, con `MIA_HMAC_SECRET`.
- `Idempotency-Key`: id del profilo. Una correzione WEM rimette in coda lo stesso profilo aggiornato: M.IA deve fare *upsert* sull'id.
- Tentativi ripetuti dopo 1, 5, 30, 120, 720 minuti, poi ogni 24 ore.

## Note di funzionamento

- **Accesso del lead**: il link personale contiene un token casuale; nel database c'è l'hash (per la ricerca) e una copia cifrata AES-256-GCM (per rimetterlo nei promemoria). Nessuna lettura pubblica: RLS attiva senza policy, tutto passa dal server con la service role.
- **Promemoria**: giorni di calendario (ora italiana) dall'ultima attività, invio alle 9 circa; ogni email ha il link per non riceverne altri. Si fermano al completamento.
- **Cancellazione**: questionari non completati, al 14° giorno dall'ultima attività; se il contatto era su Brevo viene rimosso anche lì.
- **WEM**: le correzioni si salvano in `overrides` (passi di 0,5); le risposte originali restano intatte.
- **CSV**: separatore `;` con BOM, si apre direttamente in Excel.
