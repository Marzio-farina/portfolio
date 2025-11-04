# 🧪 Guida Completa al Testing in Angular 20

## 📚 Indice
1. [Setup Iniziale](#setup-iniziale)
2. [Anatomia di un Test](#anatomia-di-un-test)
3. [Fixare Test Esistenti](#fixare-test-esistenti)
4. [Test Utilities](#test-utilities)
5. [Best Practices](#best-practices)
6. [Comandi Utili](#comandi-utili)

---

## 1. Setup Iniziale

### Installazione Dipendenze
```bash
npm install --save-dev @angular/core jasmine karma karma-jasmine karma-chrome-launcher
```

### File di Configurazione
- `karma.conf.js` - Configurazione Karma test runner
- `src/test.ts` - Bootstrap per i test
- `tsconfig.spec.json` - TypeScript config per i test

---

## 2. Anatomia di un Test

### Struttura Base
```typescript
import { Component FixtureTestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent] // Standalone components
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
  });

  it('dovrebbe creare il componente', () => {
    expect(component).toBeTruthy();
  });
});
```

### Concetti Chiave
- **describe()**: Raggruppa test correlati
- **it()**: Definisce un singolo test
- **beforeEach()**: Setup eseguito prima di ogni test
- **expect()**: Asserzione che verifica una condizione
- **fixture**: Wrapper del componente per testing
- **detectChanges()**: Triggera change detection manualmente

---

## 3. Fixare Test Esistenti

### Problema 1: Mancanza di HttpClient

**Errore:**
```
No provider found for `_HttpClient`
```

**Soluzione:**
```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting()
    ]
  }).compileComponents();
});
```

### Problema 2: Mancanza di ActivatedRoute

**Errore:**
```
No provider found for `ActivatedRoute`
```

**Soluzione:**
```typescript
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

const mockActivatedRoute = {
  provide: ActivatedRoute,
  useValue: {
    snapshot: { params: {}, queryParams: {} },
    params: of({}),
    queryParams: of({})
  }
};

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyComponent],
    providers: [mockActivatedRoute]
  }).compileComponents();
});
```

### Problema 3: Input Required Non Impostati (Angular 20)

**Errore:**
```
Input is required but no value is available yet (NG0950)
```

**Soluzione:**
```typescript
beforeEach(async () => {
  // ... dopo createComponent
  
  fixture.componentRef.setInput('inputName', mockValue);
  fixture.detectChanges();
});
```

### Problema 4: RouterLink senza Router

**Errore:**
```
No provider found for `ActivatedRoute` (in RouterLink)
```

**Soluzione:**
```typescript
import { provideRouter } from '@angular/router';

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyComponent],
    providers: [provideRouter([])]
  }).compileComponents();
});
```

---

## 4. Test Utilities

### Uso delle Utilities
```typescript
import { COMMON_TEST_PROVIDERS } from '../testing/test-utils';

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyComponent],
    providers: COMMON_TEST_PROVIDERS
  }).compileComponents();
});
```

### Provider Disponibili
- `TEST_HTTP_PROVIDERS` - Solo HTTP
- `MOCK_ACTIVATED_ROUTE` - Solo routing
- `COMMON_TEST_PROVIDERS` - Entrambi

---

## 5. Best Practices

### ✅ DO (Fare)

#### Test Isolati
```typescript
it('dovrebbe aggiornare il signal', () => {
  component.mySignal.set(10);
  expect(component.mySignal()).toBe(10);
});
```

#### Test Asincroni
```typescript
it('dovrebbe emettere evento', (done) => {
  component.myOutput.subscribe((value) => {
    expect(value).toBe('test');
    done();
  });
  component.triggerEvent();
});
```

#### Mock Servizi
```typescript
const mockService = {
  getData: () => of([{ id: 1 }])
};

TestBed.configureTestingModule({
  providers: [
    { provide: MyService, useValue: mockService }
  ]
});
```

### ❌ DON'T (Non Fare)

#### Non Testare Implementazione Interna
```typescript
// ❌ BAD
it('chiama metodo privato', () => {
  component['privateMethod']();
});

// ✅ GOOD
it('comportamento pubblico corretto', () => {
  component.publicMethod();
  expect(component.result()).toBe(expected);
});
```

#### Non Dipendere dall'Ordine
```typescript
// ❌ BAD - Tests dipendono dall'ordine
let sharedState;
it('test 1', () => { sharedState = 10; });
it('test 2', () => { expect(sharedState).toBe(10); });

// ✅ GOOD - Ogni test è indipendente
it('test 1', () => {
  const state = 10;
  expect(state).toBe(10);
});
```

---

## 6. Comandi Utili

### Eseguire Test
```bash
# Tutti i test
ng test

# Specifico file
ng test --include='**/my-component.spec.ts'

# Headless (senza browser)
ng test --browsers=ChromeHeadless

# Single run (no watch)
ng test --watch=false

# Con coverage
ng test --code-coverage

# Coverage threshold
ng test --code-coverage --code-coverage-exclude='**/*.spec.ts'
```

### Debugging
```bash
# Debug in browser
ng test --browsers=Chrome

# Con source maps
ng test --source-map

# Verbose output
ng test --progress=true
```

### Coverage Report
```bash
ng test --code-coverage --watch=false

# Il report sarà in: coverage/index.html
```

---

## 📊 Metriche Target

### Coverage Minimo
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

### Priorità Test
1. **Alta**: Servizi, logica business
2. **Media**: Componenti con logica complessa
3. **Bassa**: Componenti di presentazione

---

## 🎯 Esempio Completo

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../testing/test-utils';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: COMMON_TEST_PROVIDERS
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    
    // Setup input required
    fixture.componentRef.setInput('requiredInput', 'test');
    fixture.detectChanges();
  });

  it('dovrebbe creare', () => {
    expect(component).toBeTruthy();
  });

  describe('Signal Management', () => {
    it('dovrebbe aggiornare signal', () => {
      component.mySignal.set('nuovo valore');
      expect(component.mySignal()).toBe('nuovo valore');
    });
  });

  describe('Output Events', () => {
    it('dovrebbe emettere evento', (done) => {
      component.myOutput.subscribe((value) => {
        expect(value).toBe('expected');
        done();
      });
      component.triggerEvent();
    });
  });

  describe('DOM Interaction', () => {
    it('dovrebbe renderizzare correttamente', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('Title');
    });
  });
});
```

---

## 🔗 Risorse Utili

- [Angular Testing Guide](https://angular.dev/guide/testing)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Karma Configuration](https://karma-runner.github.io/)

---

## 🚀 Prossimi Passi

1. Fissa test esistenti aggiungendo provider
2. Aggiungi test per nuove feature
3. Monitora coverage con ogni PR
4. Automatizza test in CI/CD

**Target: 80% Coverage entro fine progetto! 🎯**

