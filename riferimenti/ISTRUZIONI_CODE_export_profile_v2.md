# Export Profile IAGAIN – istruzioni di sviluppo

Versione 2 · 31 ottobre 2026 · committente: Luca Pietrasanta, IAGAIN S.r.l.

## 1. Cosa costruire

Un'app web pubblica su **exportprofile.iagain.it**. Un'azienda agroalimentare o vinicola, spesso micro o familiare, compila un questionario di 23 domande e riceve subito il suo Export Profile:
- grado di maturità export da 1 a 5, su 5 livelli;
- punteggio per 4 aree;
- punti di forza, punti di debolezza e suggerimenti;
- scenario con il servizio IAGAIN consigliato;
- invito a prenotare una call.

È uno strumento di marketing per acquisire lead. Non deve appesantire chi lo compila: chi non arriva in fondo è un lead perso.

## 2. Materiali di riferimento (in questa cartella)

| File | Cosa contiene | Come usarlo |
| --- | --- | --- |
| `export_profile_spec_v1.json` | Il metodo completo: domande, risposte, punteggi, indicatori, categorie, livelli, scenari per servizio, fattori bloccanti, tutti i testi | **Fonte unica di verità.** Nessuna domanda, punteggio o testo va scritto nel codice: si legge da qui |
| `export_profile_prototipo.html` | Prototipo funzionante in una sola pagina (logica di calcolo e flusso) | Riferimento del comportamento atteso; i risultati dell'app devono coincidere |
| Documento "Export Profile IAGAIN – Struttura del questionario" (Claude Docs) | Regole spiegate, testi approvati, decisioni sulla grafica | Riferimento per i testi e le decisioni |
| Canvas "Export Profile IAGAIN – Grafica" (Claude Design) | 5 schermate: apertura, domanda desktop, domanda telefono, profilo a video, PDF pagina 1 | Riferimento visivo vincolante |

Luca fornirà i link al documento e al canvas.

## 3. Principio di architettura

Export Profile e **M.IA** (la piattaforma interna di IAGAIN: Next.js App Router e Supabase) sono **due sistemi separati che comunicano**, e condividono il metodo.

1. **Il metodo è un file di regole versionato** (`export_profile_spec_vX.json`). Il motore di calcolo è una funzione pura, `computeProfile(spec, answers, overrides?) → result`, senza dipendenze da UI o database. In una fase successiva questo motore e la spec diventeranno un pacchetto condiviso con M.IA, che userà lo stesso questionario per i fornitori: va scritto già con questo obiettivo.
2. **Ogni profilo salvato registra la versione della spec** con cui è stato calcolato.
3. **Export Profile non legge mai il database di M.IA.** La comunicazione va in una sola direzione: Export Profile invia a M.IA ogni profilo completato (sezione 7).
4. **Isolamento.** Export Profile è esposto pubblicamente: un suo progetto Supabase (o un database dedicato), separato da quello di M.IA. Il sito iagain.it su WordPress ha avuto un'infezione da malware: nessuna dipendenza da WordPress.

Stack, per coerenza con M.IA: Next.js App Router, TypeScript, Supabase (Postgres con RLS), deploy su **Vercel** (lo stesso account di M.IA, ma come progetto separato).

## 4. Fase 1 – funzionalità

### 4.1 Questionario
- Apertura come da canvas (schermata 1), con due azioni: "Inizia il questionario" e "Guarda un profilo d'esempio". L'esempio usa dati inventati, dichiarati come tali.
- Passo 1, anagrafica:
  - obbligatori: nome azienda, nome e cognome, email (formato valido), telefono (almeno 6 cifre), categoria (elenco dalla spec), sito web oppure la casella "Non abbiamo un sito", consenso privacy;
  - facoltativi: ruolo, regione, consenso alle comunicazioni.
  - Con "Non abbiamo un sito" la domanda 2 si salta e vale 1 (`skip_if` nella spec).
- **Una domanda per schermata**, con barra "Domanda X di 23" e area corrente. Sotto ogni domanda va la riga "Perché te lo chiediamo" (campo `why`). Le domande vanno avanti con "Avanti"; il passaggio automatico alla scelta è facoltativo.
- Progettato prima per il telefono: bersagli di almeno 44 px, navigazione fissa in basso (schermata 2b).
- Domanda 24, mercati di interesse: facoltativa, scelta multipla, senza punteggio.
- **Salvataggio automatico** delle risposte, dal passo 1 in poi (lì si raccolgono già email e consensi). Riprendere più tardi deve funzionare sullo stesso dispositivo e con un link personale via email.
- **Promemoria per i questionari non completati**: fino a 3 email da exportprofile@iagain.it con il link per riprendere. Valori predefiniti: 2, 5 e 10 giorni dall'ultima attività; devono essere modificabili. Ogni email contiene il link per non riceverne altre. Si fermano appena il questionario è completato.

### 4.2 Calcolo (dalla spec)
- Indicatori:
  - `question` → punteggio della risposta;
  - `average` → media delle domande indicate;
  - `weighted_multi` → base + somma dei pesi, con massimo 5; con la risposta esclusiva "Nessuna" vale 1;
  - `category` → punteggio della categoria scelta.
- Area = media dei suoi indicatori. Grado = media delle 4 aree. Livello = fascia (`levels[].min`).
- Servizio consigliato = regola `rules.recommend`, calcolata sui punteggi attuali.
- Scenario = per gli indicatori del servizio consigliato, `max(attuale, target)`.
- Fattori bloccanti = regole `blockers`. Sono segnalati a parte e non modificano la media.
- Testi: punto di forza da 4; debolezza fino a 2,5; suggerimento sotto 3, al massimo 4 per area, dal più basso.

### 4.3 Profilo a video (schermata 3)
- Sezione 01: grado, livello e testo, scala dei 5 livelli con i segni per oggi, per lo scenario e per la soglia 3. Subito sotto, l'eventuale riquadro "Prima di tutto" con i fattori bloccanti.
- Sezione 02: radar delle 4 aree (oggi, scenario, soglia) e tabella.
- Le 4 aree **a fisarmonica**: la prima aperta, le altre chiuse con punteggio e stato visibili. Da aperta: barre degli indicatori con la parte dello scenario, poi forza, debolezza e suggerimenti.
- Sezione 03, "Con [servizio]": salto di livello, "Cosa facciamo noi", "Cosa resta a te". Solo per Road to World compare anche la nota che si tratta di un test di 4 mesi.
- Sezione 04: scheda del servizio consigliato con il bottone di prenotazione (link nella spec) e, in una riga, l'altro servizio come alternativa.
- Nota finale sul metodo.

### 4.4 PDF via email
- Bottone "Ricevi il PDF via email": il PDF si genera sul server e parte all'email del lead.
- Formato A4: pagina 1 come da canvas (schermata 4); pagine 2-4 con le aree, lo scenario e il passo successivo, nella stessa impostazione.
- Invio con Brevo transazionale, mittente **exportprofile@iagain.it** (da verificare su Brevo con i record SPF/DKIM del dominio).

### 4.5 Lead
- A profilo completato:
  1. salvataggio nella tabella `profiles`, con risposte, risultati, versione della spec, consensi con data e ora e versione dell'informativa;
  2. creazione o aggiornamento del contatto su Brevo con gli attributi: punteggio, grado, servizio consigliato, fattori bloccanti, categoria, mercati di interesse;
  3. messa in coda per l'invio a M.IA (sezione 7).

### 4.6 Area IAGAIN, solo per lo staff
- Accesso con link magico per email, solo per indirizzi @iagain.it.
- Elenco dei profili con filtri (data, grado, servizio, categoria) ed esportazione in CSV (nomi file senza spazi né parentesi).
- **Modalità WEM** su un profilo:
  - correzione di ogni punteggio (scala 1-5 a passi di 0,5);
  - note per area;
  - nome del WEM che verifica il profilo;
  - nuovo PDF con le note.
  Le correzioni si salvano come override, senza perdere le risposte originali.

## 5. Grafica
- Seguire il canvas di Claude Design. Brand IAGAIN: blu #1F232F, oro #AD9677. Viola WIFO #A3195B per le azioni e lo scenario. Font Lato e Barlow Semi Condensed (Google Fonts). Loghi IAGAIN e WIFO dal progetto IAGAIN.
- Testo piccolo in oro su bianco: usare #7A6747. #AD9677 su bianco non raggiunge il contrasto 4,5:1.
- Accessibilità: controlli veri (`input`, `label`, `button`), focus visibile, contrasto AA.

## 6. Dati (indicativo)
- `profiles`: id, created_at, spec_version, status (in_corso / completato), anagrafica (azienda, referente, ruolo, email, telefono, regione, sito, nosito, categoria), consensi (privacy_at, marketing_at, privacy_version), answers (jsonb), result (jsonb: indicatori, aree, totale, livello, servizio, scenario, bloccanti), markets (text[]), overrides (jsonb), wem_notes (jsonb), wem_name, utm (jsonb), sent_to_brevo_at, sent_to_mia_at.
- `reminders`: id, profile_id, n (1-3), sent_at; i promemoria non si inviano se il lead si è disiscritto (`unsubscribed_at` in `profiles`).
- `outbox_mia`: id, profile_id, payload (jsonb), attempts, last_error, delivered_at.
- RLS: nessuna lettura pubblica. Le scritture pubbliche passano solo da server action o route con validazione.

## 7. Comunicazione con M.IA (da attivare quando M.IA avrà l'area marketing)
- Endpoint su M.IA (da creare lato M.IA): `POST /api/inbound/export-profile`.
- Autenticazione: firma HMAC-SHA256 del corpo nell'header `X-IAGAIN-Signature`, con un segreto condiviso; header `Idempotency-Key` = id del profilo.
- Consegna: dalla tabella `outbox_mia`, con tentativi ripetuti a intervalli crescenti. Alla prima attivazione si inviano anche i profili già raccolti.
- Payload:

```json
{
  "event": "export_profile.completed",
  "profile_id": "uuid",
  "spec_version": "1.0.0",
  "completed_at": "2026-11-05T10:12:00Z",
  "company": {"name": "", "website": "", "no_website": false, "region": "", "category": ""},
  "contact": {"name": "", "role": "", "email": "", "phone": ""},
  "consents": {"privacy_at": "", "privacy_version": "", "marketing_at": null},
  "answers": {"com1": "2", "off4": ["bio", "lab"]},
  "result": {
    "total": 2.53, "level": "Apprendista",
    "areas": {"com": 2.43, "org": 2.4, "off": 2.7, "esp": 2.58},
    "indicators": {"com1": 2},
    "recommended_service": "rtw",
    "scenario_total": 3.21, "scenario_level": "Specialista",
    "blockers": []
  },
  "markets_of_interest": ["Germania"],
  "overrides": {}, "wem": null,
  "utm": {"source": "", "medium": "", "campaign": ""}
}
```

In M.IA il profilo deve potersi collegare all'azienda fornitrice quando il lead diventa cliente. Così si potrà ricalcolarlo dopo 6-12 mesi e misurare la crescita.

## 8. Sicurezza e privacy
- Protezione anti-bot sul modulo (Cloudflare Turnstile o equivalente) e limite di invii per IP.
- Nessuna chiave nel codice del browser: Brevo, segreto HMAC e Supabase service role vanno solo sul server.
- Consensi registrati con data, ora e versione dell'informativa ([iagain.it/privacy-policy](https://www.iagain.it/privacy-policy/)).
- Profili lasciati a metà: **cancellazione automatica 14 giorni dopo l'ultima attività** (valore modificabile), dopo i promemoria. Va eseguita da un job pianificato (Vercel Cron) e anche Brevo va aggiornato (contatto rimosso o marcato).
- I promemoria e la conservazione per 14 giorni vanno indicati nell'informativa mostrata al passo 1: è da concordare con IAGAIN prima del lancio.

## 9. Fuori dalla fase 1 (fase 2)
- Caricamento di catalogo e listino, con valutazione automatica da parte dell'AI.
- Controllo automatico del sito web (lingue, sezione export).
- Confronto con la media della categoria, quando i dati raccolti saranno sufficienti.
- Pacchetto condiviso spec+motore usato anche da M.IA per i fornitori.

## 10. Decisioni prese e punti aperti
| Tema | Decisione |
| --- | --- |
| Dominio | Il DNS di iagain.it lo gestisce Luca: Code gli indica il record da creare per exportprofile.iagain.it (di norma un CNAME verso Vercel) |
| Hosting | Vercel, nello stesso account di M.IA, come progetto separato |
| Email | Mittente exportprofile@iagain.it; va verificato su Brevo |
| Chiave API Brevo | **Aperto**: arriva dopo. Fino ad allora l'invio a Brevo resta disattivato da configurazione e i lead si salvano solo nel database |
| Questionari non completati | Fino a 3 promemoria, cancellazione dopo 14 giorni dall'ultima attività |

## 11. Collaudo minimo
- Con le risposte dell'esempio (`SAMPLE` nel prototipo), il calcolo deve dare:
  - grado 2,53 (Apprendista);
  - aree com 2,43 · org 2,40 · off 2,70 · esp 2,58;
  - servizio Road to World;
  - scenario 3,21 (Specialista).
- Con capacità produttiva = 1 e budget = 1 compaiono 2 fattori bloccanti.
- Spuntando "Non abbiamo un sito" la domanda 2 non compare e vale 1.
- Per ogni combinazione di test, il risultato del motore coincide con quello del prototipo.
- Un questionario lasciato a metà riceve i promemoria nei giorni previsti e viene cancellato al 14° giorno; uno completato non riceve promemoria.
- Su un telefono di 390 px di larghezza nessuna pagina scorre in orizzontale.
