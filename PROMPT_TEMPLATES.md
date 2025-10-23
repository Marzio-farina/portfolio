# Template di Prompt per Cursor (riutilizzabili)

Usa questi modelli, sostituendo le parti tra <>.

## 1) Refactor mirato
```
Ruolo: <ruolo es. senior Laravel/Angular>
Obiettivo: <cosa cambiare e perché>
Vincoli: <no breaking change, no any, performance, ecc.>
Contesto: file/funzioni coinvolte: `<path/file>`, `<classe#metodo>`
Criteri di accettazione: <elenco breve e verificabile>
Output atteso: edit sui file specificati, niente testo superfluo
```

## 2) Feature end‑to‑end
```
Ruolo: lead full‑stack
Obiettivo: <nuovo endpoint + UI + test>
Vincoli: <security, DX, coverage>
Contesto: backend in Laravel, frontend in Angular
Criteri: <API documentata, UI funziona, test/lint ok>
```

## 3) Bugfix guidato dall'errore
```
Ruolo: fixer
Errore: <copia/incolla messaggio>
Sospetto: <ipotesi breve>
Contesto: <file/function>
Criteri: errore risolto, nessuna regressione, aggiungi test se sensato
```

## 4) Ricerca nel codice (discovery)
```
Ruolo: ricercatore codice
Domanda: <cosa vuoi capire>
Ambito: <backend/frontend/entrambi>
Output: elenco file chiave + breve spiegazione
```

## 5) Migrazione/DB
```
Ruolo: data engineer
Obiettivo: <nuova colonna/tabella>
Vincoli: dati esistenti intatti
Contesto: migrazioni in `database/migrations`
Criteri: migrazione eseguita, model aggiornato, seeder ok
```

## 6) Ottimizzazione performance
```
Ruolo: performance engineer
Obiettivo: <ridurre payload/tempo render>
Contesto: <servizio/rotta/componente>
Metriche: <target ms, dimensione KB>
Criteri: misurazione prima/dopo
```

## 7) Documentazione automatica
```
Ruolo: technical writer
Obiettivo: genera README per <feature>
Contesto: file coinvolti <elenco>
Criteri: istruzioni chiare, comandi testati
```

---

### Esempi rapidi per questo repo
- Backend (Laravel):
```
Ruolo: senior Laravel engineer
Obiettivo: aggiungi validazione per `bio` in `UserProfile`
Vincoli: risposta API coerente
Contesto: `app/Http/Controllers/UserProfileController.php`
Criteri: 422 con messaggi chiari, test feature passa
```

- Frontend (Angular):
```
Ruolo: senior Angular dev
Obiettivo: introdurre skeleton loader per `Projects` list
Vincoli: no any, no flicker
Contesto: `src/app/projects/*`
Criteri: stato loading, aria‑attributes corretti
```
