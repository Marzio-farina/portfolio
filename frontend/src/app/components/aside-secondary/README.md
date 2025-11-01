# Aside Secondary Component

## Descrizione
Componente secondario visualizzato sotto l'aside principale che mostra statistiche del repository GitHub del portfolio.
Visibile solo su dispositivi con larghezza >= 1250px.

## Caratteristiche
- **Larghezza fissa**: 320px (stessa dell'aside principale)
- **Visibilità**: Solo su schermi >= 1250px
- **Posizionamento**: Sotto l'aside principale con gap di 1.5rem
- **Stile**: Coerente con l'aside principale (surface, border, shadow)
- **Integrazione GitHub**: Mostra statistiche in tempo reale dal repository

## Funzionalità

### Statistiche GitHub
Il componente recupera e visualizza automaticamente:
- **Repository link**: Link diretto al repository GitHub
- **Commits Totali**: Numero totale di commit eseguiti sul repository

### Stati Visivi
- **Loading**: Spinner animato durante il caricamento
- **Dati caricati**: Visualizzazione delle statistiche
- **Empty state**: Messaggio quando nessun link GitHub è configurato
- **Errore**: Messaggio di errore in caso di problemi

## Come Funziona

1. Il componente recupera i social links dal profilo utente tramite `AboutProfileService`
2. Cerca il provider 'github' tra i social links
3. Utilizza `GitHubService` per chiamare l'API pubblica di GitHub
4. Mostra le statistiche recuperate con animazioni e hover effects

## Configurazione

Per mostrare le statistiche GitHub, assicurati che nel backend sia configurato un social link con:
- **Provider**: `github`
- **URL**: URL completo del repository (es: `https://github.com/username/repository`)

## Servizi Utilizzati

### GitHubService
Servizio dedicato per l'integrazione con l'API di GitHub:
- `getFullRepoStats$()`: Recupera il numero totale di commit del repository
- `getCommitCount$()`: Recupera il numero di commit (metodo alternativo)
- Parsing dell'header Link di GitHub per ottenere il conteggio totale
- Gestione automatica degli errori
- Parsing intelligente degli URL GitHub

### AboutProfileService
Recupera i dati del profilo utente inclusi i social links.

## Personalizzazione CSS

Il componente usa variabili CSS per una facile personalizzazione:
- `--bg-card`: Sfondo del componente
- `--border-primary`: Bordo del componente
- `--text-primary`: Colore testo principale
- `--text-secondary`: Colore testo secondario
- `--accent-primary`: Colore accent (oro)

## Animazioni

- **Spinner**: Rotazione continua durante il caricamento
- **Hover effects**: Transform e cambio colore sui link
- **Transizioni**: Smooth transitions su tutti gli stati

## Note Tecniche
- Il componente è già integrato nel layout principale
- La visibilità è gestita tramite CSS media queries
- Su dispositivi < 1250px il componente viene nascosto automaticamente
- Le chiamate API sono cachate per ottimizzare le performance
- Gestione automatica degli errori di rete

