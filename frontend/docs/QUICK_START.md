# íº€ Quick Start - Testing Portfolio

Guida rapida per lavorare con i test del Portfolio.

---

## í¿ƒ Comandi Rapidi

### Eseguire Test

```bash
# Test in watch mode (sviluppo)
npm test

# Test singola esecuzione
npm test -- --no-watch

# Test con copertura
npm test -- --code-coverage --no-watch --browsers=ChromeHeadless

# Test specifico file
npm test -- --include='**/component-name.spec.ts'
```

### Visualizzare Coverage

```bash
# Dopo aver eseguito test con --code-coverage:
# 1. Apri il file HTML
start coverage/index.html     # Windows
open coverage/index.html      # Mac
xdg-open coverage/index.html  # Linux

# 2. Oppure vedi summary nel terminale (automatico)
```

---

## í³Š Stato Attuale (5 Nov 2025)

```
âœ… Test Passati:  1660/1710 (97.1%)
âŒ Test Falliti:    50/1710 (2.9%)

í³ˆ Coverage:
   Statements:  54.7%
   Branches:    40.5%
   Functions:   57.2%
   Lines:       55.5%
```

---

## í³š Documentazione

| Documento | Descrizione |
|-----------|-------------|
| [README.md](./README.md) | í³– Indice generale |
| [TEST_IMPROVEMENT_REPORT.md](./TEST_IMPROVEMENT_REPORT.md) | í³Š Report completo miglioramenti |
| [TESTING_ROADMAP.md](./TESTING_ROADMAP.md) | í·ºï¸ Roadmap strategica |
| [README_TESTING.md](./README_TESTING.md) | í³˜ Guida testing dettagliata |
| [HOW_TO_REACH_80.md](./HOW_TO_REACH_80.md) | í¾¯ Piano per 80% coverage |
| [CHANGELOG.md](./CHANGELOG.md) | í³‹ Storia modifiche |

---

## í°› Troubleshooting Comune

### Test Falliscono

1. **Controlla mock services**
   ```typescript
   // âŒ Sbagliato
   authService = jasmine.createSpyObj('AuthService', []);
   
   // âœ… Corretto
   authService = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
   authService.isAuthenticated.and.returnValue(signal(false));
   ```

2. **Signal non si aggiorna**
   ```typescript
   // âŒ Sbagliato
   spy.signal = signal(true);
   
   // âœ… Corretto
   spy.signal.set(true);
   ```

3. **HTTP Mock non trova richieste**
   ```typescript
   // âŒ Sbagliato
   httpMock.expectOne(req => req.url.includes('_t=123'));
   
   // âœ… Corretto
   const req = httpMock.expectOne(req => req.url.includes('/endpoint'));
   expect(req.request.params.has('_t')).toBe(true);
   ```

### Timeout Test

Se un test va in timeout:
```typescript
// Aumenta timeout specifico
it('test lungo', (done) => {
  // ... test code
}, 15000); // 15 secondi invece di 10
```

Oppure modifica `karma.conf.js`:
```javascript
client: {
  jasmine: {
    timeoutInterval: 15000
  }
}
```

---

## í³ˆ Migliorare Coverage

### 1. Identifica File con Bassa Coverage
```bash
# Guarda il report HTML
start coverage/index.html

# Cerca file con coverage < 50%
grep -r "50%" coverage/lcov.info
```

### 2. Aggiungi Test per Branch Non Coperti

```typescript
// Testa entrambi i rami dell'if
it('dovrebbe gestire caso true', () => {
  component.flag = true;
  expect(component.getValue()).toBe('yes');
});

it('dovrebbe gestire caso false', () => {
  component.flag = false;
  expect(component.getValue()).toBe('no');
});
```

### 3. Testa Edge Cases

```typescript
// Valori limite
it('dovrebbe gestire 0', () => {...});
it('dovrebbe gestire valori negativi', () => {...});
it('dovrebbe gestire null/undefined', () => {...});
it('dovrebbe gestire array vuoto', () => {...});
it('dovrebbe gestire stringa molto lunga', () => {...});
```

---

## í¾¯ Prossimi Obiettivi

- [ ] Risolvere 50 test rimanenti
- [ ] Portare branches a 50%
- [ ] Portare statements a 70%
- [ ] Documentare pattern complessi
- [ ] Setup CI/CD per test automatici

---

## í²¡ Tips

1. **Esegui test spesso**: `npm test` in watch mode durante sviluppo
2. **Verifica coverage**: Dopo ogni feature, controlla il coverage HTML
3. **Mock completi**: Includi TUTTI i metodi/proprietÃ  usati
4. **Async done**: Non dimenticare `done()` callback nei test asincroni
5. **DetectChanges**: Chiama `fixture.detectChanges()` dopo modifiche

---

## í³ž Help

Problemi? Controlla:
1. [TEST_IMPROVEMENT_REPORT.md](./TEST_IMPROVEMENT_REPORT.md) - Pattern comuni
2. [TESTING_ROADMAP.md](./TESTING_ROADMAP.md) - Strategia generale
3. Coverage report HTML per vedere cosa manca

---

**Happy Testing! í·ª**
