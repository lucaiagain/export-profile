# Grafica Export Profile – riferimenti per lo sviluppo

Approvata da IAGAIN il 31 ottobre 2026. Fonte originale: canvas Claude Design "Export Profile IAGAIN – Grafica".

## Contenuto
- `loghi/iagain-logo-colore.svg`: logo IAGAIN principale, solo su fondo bianco o chiaro.
- `loghi/iagain-logo-negativo.svg`: logo IAGAIN bianco e oro, per fondi blu scuro (header).
- `loghi/wifo-marchio-viola.svg`: marchio WIFO, nel footer.
- `schermate/*.dc.html`: sorgente delle 5 schermate in formato Claude Design. Sono HTML con stili in linea, da usare come riferimento di layout, misure, colori e testi; non sono pagine pronte per la produzione.
  - `Main`: apertura;
  - `Domanda`: domanda su desktop;
  - `Domanda_mobile`: domanda su telefono, 390 × 844;
  - `Profilo`: profilo a video;
  - `PDF_pagina1`: prima pagina del PDF, A4.
- In `Profilo`, le barre dell'area aperta sono generate da `renderVals()` in fondo al file.

## Colori
| Ruolo | Valore |
| --- | --- |
| Blu IAGAIN (header, testo principale) | #1F232F |
| Oro IAGAIN (dettagli, testi grandi su blu) | #AD9677 |
| Oro per testo piccolo su bianco (contrasto AA) | #7A6747 |
| Oro chiaro (fondi delle note) | #F3EEE6 |
| Viola WIFO (azioni, scenario con il servizio) | #A3195B |
| Viola chiaro (risposta selezionata, sezione scenario) | #F7E8EF |
| Fondo pagina | #F4F5F7 |
| Testo secondario | #4A5063 |
| Bordi | #DDE0E6 |
| Stato "Da costruire" | testo #9E2F2F su #F8E4E4 |
| Stato "Sotto soglia" | testo #8A5A12 su #FBF0DD |
| Stato "In linea" / punti di forza | #2E7D5B |

## Tipografia
- Lato (400, 700, 900): titoli e testo.
- Barlow Semi Condensed (500, 600, 700): etichette in maiuscolo, numeri e punteggi.
- Entrambi da Google Fonts, come da manuale d'uso del marchio IAGAIN.

## Regole
- Il logo a colori va solo su bianco; su blu si usa la versione negativa.
- Bottone principale: viola WIFO con testo bianco, altezza minima 52 px. Bottone secondario: contorno.
- Angoli di 6 px per i bottoni e di 8-10 px per le schede. Bordi di 1 px, senza ombre.
- Una domanda per schermata. La risposta scelta ha bordo viola e fondo viola chiaro.
