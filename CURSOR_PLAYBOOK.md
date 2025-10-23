# Cursor Playbook (pratico per questo repo)

## Obiettivo
Portare un flusso professionale di sviluppo assistito dall'IA su questo monorepo (Laravel + Angular), massimizzando velocità senza sacrificare qualità.

## Regole d'oro
- Scrivi prompt con: ruolo → obiettivo → vincoli → contesto → criteri di accettazione.
- Preferisci "edits" atomici e frequenti, verifica con test/lint dopo ogni blocco.
- Cita file e funzioni con backtick (es. `routes/api.php`, `ProjectController`).
- Usa diffs chiari nei commit: tipo(scopo): descrizione breve.

## Workflow quotidiano in Cursor
1) PLAN
- Apri la chat e definisci outcome, constraints e impatti.
- Se attività > 2 passi, crea TODO condiviso con l'assistente.

2) DISCOVER
- Chiedi all'assistente di cercare punti d'ingresso (router, controllers, services).
- Raccogli contesto minimo (max 3–5 file chiave) prima di editare.

3) EDIT
- Richiedi una singola modifica coerente (1 feature, 1 bugfix, 1 refactor).
- Specifica file target e criteri di accettazione.

4) VERIFY
- Esegui test/lint/build (o chiedi all'assistente di farlo) e rivedi warnings.
- Se fallisce, chiedi fix mirato sull'errore specifico.

5) DOCUMENT
- Aggiungi breve nota in `BUGFIX_SUMMARY.md` o `REFACTORING_SUMMARY.md` se rilevante.

## Prompt pattern
Esempio (refactor backend):
```
Ruolo: senior Laravel engineer
Obiettivo: estrarre validazione in `app/Http/Requests/StoreProjectRequest.php`
Vincoli: nessun breaking change; test esistenti passano
Contesto: `ProjectController@store` usa validazione inline
Criteri: request dedicata, messaggi d'errore coerenti, 0 linter errors
```

Esempio (feature frontend):
```
Ruolo: senior Angular dev
Obiettivo: aggiungere loading state in `ProjectListComponent`
Vincoli: niente regressioni Lighthouse; no any
Contesto: `project.service.ts` espone `getProjects()`
Criteri: spinner su richiesta in corso, test snapshot aggiornato
```

## Buone pratiche specifiche per questo repo
- Backend
  - Mantieni contracts in `Requests/` e risposte JSON consistenti.
  - Usa seeders/factory per dati fittizi nei test manuali.
- Frontend
  - Tipi stretti in servizi; evita `any`.
  - Componenti presentazionali vs smart component separati.

## Come chiedere una ricerca rapida
```
Cerca dove viene gestita l'autenticazione API e mostrarmi i punti
chiave: middleware, controller login, generazione token.
```

## Come orchestrare una modifica multi-file
```
Aggiungi titolo e avatar al profilo utente:
- migrazione + model `UserProfile`
- controller API + risposte
- Angular service + UI
Criteri: migrazioni eseguite, endpoints documentati.
```
