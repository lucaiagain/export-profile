# Export Profile → M.IA: specifiche di integrazione

Versione 1 · 2 novembre 2026 · da passare al progetto M.IA

Export Profile (https://exportprofile.iagain.it) invia a M.IA ogni profilo completato. La comunicazione va in una sola direzione: Export Profile non legge mai il database di M.IA, e M.IA non deve leggere quello di Export Profile.

## Cosa deve fare M.IA

Creare l'endpoint:

```
POST https://<dominio-mia>/api/inbound/export-profile
Content-Type: application/json
```

### 1. Autenticazione: firma HMAC
Ogni richiesta ha l'header `X-IAGAIN-Signature`: HMAC-SHA256 del **corpo grezzo** (i byte ricevuti, prima di qualsiasi parsing), in esadecimale minuscolo, con un segreto condiviso.

- Il segreto lo genera una delle due parti con `openssl rand -base64 32` e va messo sia in M.IA sia in Export Profile (variabile `MIA_HMAC_SECRET` su Vercel). Non va mai scritto nel codice né mandato via email in chiaro.
- Se la firma non corrisponde: rispondere `401` e non salvare nulla.
- Confronto a tempo costante (`timingSafeEqual`).

Esempio con Next.js (App Router):

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export async function POST(req: Request) {
  const raw = await req.text(); // corpo grezzo, prima del JSON.parse
  const got = req.headers.get("x-iagain-signature") ?? "";
  const want = createHmac("sha256", process.env.EXPORT_PROFILE_HMAC_SECRET!).update(raw).digest("hex");
  if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want)))
    return new Response("firma non valida", { status: 401 });

  const event = JSON.parse(raw);
  // upsert su event.profile_id (vedi sotto)
  return Response.json({ ok: true });
}
```

### 2. Idempotenza: upsert sull'id del profilo
- Header `Idempotency-Key` = `profile_id` (UUID), uguale al campo `profile_id` del corpo.
- Lo **stesso profilo può arrivare più volte**: per tentativi ripetuti dopo un errore, oppure perché un WEM ha corretto i punteggi e il profilo è stato ricalcolato. M.IA deve fare **upsert su `profile_id`** e tenere l'ultima versione ricevuta, mai creare duplicati.

### 3. Risposte
- `2xx` → consegnato, non viene più inviato (fino a una eventuale correzione WEM).
- qualsiasi altro codice, o nessuna risposta entro 10 secondi → nuovo tentativo dopo 1, 5, 30, 120, 720 minuti, poi ogni 24 ore.
- La coda viene elaborata ogni 15 minuti. Alla prima attivazione arrivano anche tutti i profili già raccolti.

## Contenuto (payload)

```json
{
  "event": "export_profile.completed",
  "profile_id": "0f8c…-uuid",
  "spec_version": "1.1.0",
  "completed_at": "2026-11-05T10:12:00.000Z",
  "company": { "name": "Oleificio Esempio", "website": "www.esempio.it", "no_website": false, "region": "Puglia", "category": "Olio extravergine d'oliva" },
  "contact": { "name": "Mario Rossi", "role": "Titolare", "email": "mario@esempio.it", "phone": "080 1234567" },
  "consents": { "privacy_at": "2026-11-05T09:58:00.000Z", "privacy_version": "2026-10-31", "marketing_at": null },
  "answers": { "com1": "2", "com2": "3", "off4": ["bio", "lab"], "esp6a": "4" },
  "result": {
    "total": 2.53, "level": "Apprendista",
    "areas": { "com": 2.43, "org": 2.4, "off": 2.7, "esp": 2.58 },
    "indicators": { "com1": 2, "com2": 3, "off2": 3, "off4": 2, "esp6": 3.5 },
    "recommended_service": "rtw",
    "scenario_total": 3.21, "scenario_level": "Specialista",
    "blockers": []
  },
  "markets_of_interest": ["Germania", "Stati Uniti"],
  "overrides": { "com1": 4 },
  "wem": { "name": "Giulia Bianchi", "notes": { "com": "Catalogo in inglese in lavorazione." } },
  "utm": { "source": "linkedin", "medium": "social", "campaign": "export-2027" }
}
```

| Campo | Note |
| --- | --- |
| `spec_version` | Versione del metodo con cui è stato calcolato. I punteggi di versioni diverse vanno confrontati con cautela |
| `answers` | Chiavi delle opzioni scelte (non i punteggi). Le domande e le opzioni sono nella spec, `spec/export_profile_spec_v1.1.0.json` del repository Export Profile |
| `result.indicators` | 23 indicatori, da 1 a 5 (a passi di 0,5 se corretti dal WEM). Sono già comprensivi delle correzioni |
| `result.recommended_service` | `rtw` = Road to World, `eo` = WIFO Export Office |
| `result.blockers` | Id dei fattori bloccanti: `org4` capacità produttiva, `org5` tempo per l'export, `esp6b` budget |
| `overrides` | Correzioni del WEM per indicatore; `{}` se nessuna. Le risposte originali restano in `answers` |
| `wem` | `null` se il profilo non è ancora stato verificato da un WEM |
| `consents.marketing_at` | `null` = nessun consenso alle comunicazioni commerciali: non usare il contatto per marketing |
| `completed_at`, `*_at` | ISO 8601, UTC |

## Uso previsto in M.IA
- Collegare il profilo all'azienda fornitrice quando il lead diventa cliente, così da ricalcolarlo dopo 6-12 mesi e misurare la crescita.
- In una fase successiva il motore di calcolo e la spec diventeranno un pacchetto condiviso, che M.IA userà anche per i questionari ai fornitori.

## Attivazione (lato Export Profile, a cura di IAGAIN)
Quando l'endpoint è pronto, in Vercel (progetto `export-profile`) si impostano:
- `MIA_ENDPOINT` = URL completo dell'endpoint;
- `MIA_HMAC_SECRET` = segreto condiviso;
- `MIA_ENABLED` = `true`;

poi si fa un nuovo deploy. Consiglio: provare prima con l'URL di un ambiente di test di M.IA.
