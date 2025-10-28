## Aside Component – Documentazione HTML/CSS

Questa documentazione descrive in modo approfondito struttura HTML, classi CSS, regole responsive e comportamenti di hover/posizionamento del componente `aside`.


### Panoramica
- File HTML: `frontend/src/app/components/aside/aside.html`
- CSS base: `frontend/src/app/components/aside/aside.css`
- CSS responsive: `frontend/src/app/components/aside/aside.responsive.css`

L’aside mostra avatar, informazioni dell’utente e azioni (Modifica profilo, Toggle tema, Toggle contatti). Il pulsante Modifica è visibile solo se l’utente è autenticato e cambia posizione e dimensioni in base alla larghezza del viewport.


### Struttura HTML (principale)

```html
<aside class="profile">
  <div class="profile__header">
    <div class="avatar-wrap">
      @if (!editMode()) {
        <app-avatar [avatarData]="mainAvatarData()" [width]="120"></app-avatar>
      } @else {
        <app-avatar-editor
          [size]="120"
          [initialUrl]="mainAvatarData()?.img || null"
          (avatarChange)="onAvatarEditorChange($event)">
        </app-avatar-editor>
      }
    </div>

    <div class="profile__identity">
      <h1 class="profile__name" [title]="fullName() || '—'">{{ fullName() || '—' }}</h1>
      <p class="profile__role">Full Stack Developer</p>
    </div>

    @if (isAuthed()) {
      <button
        class="btn btn-sm profile__edit"
        [class.profile__edit--offset]="showContacts()"
        (click)="toggleEditMode()"
        [title]="editMode() ? 'Fine' : 'Modifica'"
        [attr.aria-label]="editMode() ? 'Fine' : 'Modifica'">
        <svg class="profile__edit-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM21.41 6.34a1.25 1.25 0 0 0 0-1.77l-2.98-2.98a1.25 1.25 0 0 0-1.77 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
        <span class="profile__edit-label">{{ editMode() ? 'Fine' : 'Modifica' }}</span>
      </button>
    }

    <button
      (click)="toggleTheme()"
      class="btn btn-sm profile__toggle profile__theme-toggle"
      [title]="theme.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      aria-label="Toggle theme">
      <!-- icona tema (sole/luna) -->
    </button>

    @if (showButton()) {
      <button
        (click)="toggleContacts()"
        class="btn btn-sm profile__toggle profile__toggle--contacts"
        [class.is-open]="showContacts()"
        [attr.aria-expanded]="showContacts()"
        aria-controls="contacts-panel">
        <!-- caret SVG; ruota con .is-open -->
        @if (!isSmall()) { <span class="profile__toggle-label">{{ showContacts() ? 'Hide Contacts' : 'Show Contacts' }}</span> }
      </button>
    }
  </div>

  @if (showContacts()) {
    <div id="contacts-panel" class="contacts" @expandCollapse>
      <!-- elenco contatti + social -->
    </div>
  }
</aside>
```

Note importanti:
- `@if (!editMode())` alterna `app-avatar` e `app-avatar-editor` all’interno di `avatar-wrap`.
- `app-avatar` usa `[width]` per dimensionare il contenitore e l’immagine.
- `app-avatar-editor` usa `[size]` per dimensionare l’elemento host (quadrato); la UI interna si adatta.
- Il pulsante Modifica è disponibile solo se `isAuthed()` è vero.


### Classi CSS principali (base)

Contenitore
- `.profile`: card dell’aside, con `border-radius: 20px`, background e colori da CSS variables.
- `.profile__header`: contenitore superiore, `position: relative`, layout flex.

Avatar
- `.avatar-wrap`: wrapper posizionale dell’avatar/editor.
- `.avatar-edit` (commentato in HTML): micro-azione sovrapposta all’avatar (pulsante tondo in alto a destra) – non usato attualmente.

Identità
- `.profile__identity`: colonna con nome e ruolo.
- `.profile__name`: titolo grande con gradiente testo e `hover` che aumenta la scala.
- `.profile__role`: sottotitolo con opacità ridotta.

Azioni (toggle)
- `.profile__toggle`: stile base per pulsanti in overlay nell’header.
- `.profile__theme-toggle`: toggle tema, posizionato a sinistra (override di `right` → `left`).

Pulsante Modifica profilo
- `.profile__edit`: stile e posizionamento (default mobile/medium in basso a destra).
- `.profile__edit--offset`: sposta in basso di 15px quando i contatti sono aperti (<1250px).
- `.profile__edit-label`: etichetta testuale.
- `.profile__edit-icon`: icona matita (visibile solo sotto i 580px; vedi media query).

Pannello contatti/social
- `.contacts`, `.contacts__list`, `.contact`, `.contact__icon`, `.contact__body`, `.contact__label`, `.contact__link`, `.contact__text`, `.contacts__divider`, `.socials`.


### Stati Hover/Overlay coerenti
- `:hover` di `.profile__edit` e `.profile__toggle` usa lo stesso gradiente e l’overlay `::before` per coerenza con il toggle contatti.
- Colore testo coerente: `color: var(--accent-primary)` durante l’hover.

Estratti:
```css
.profile__edit:hover {
  background: linear-gradient(to bottom right, hsl(45, 100%, 71%) 0%, hsla(36, 100%, 69%, 1) 50%);
  color: var(--accent-primary);
}
.profile__edit::before { content: ""; position: absolute; inset: 1px; border-radius: inherit; transition: .25s ease; z-index: -1; }
.profile__edit:hover::before { background: linear-gradient(135deg, hsla(45,100%,71%,.251) 0%, hsla(35,100%,68%,0) 59.86%), var(--eerie-black-2); }
```


### Regole responsive (aside.responsive.css)

- Desktop ≥ 1250px
  - `.profile__edit`: posizionato in alto a destra (`top:0; right:0; bottom:auto !important;`), `border-radius: 0 20px 0 20px`, `width: 90px`.

- 580px – 1249px
  - `.profile__edit`: altezza ridotta con override DaisyUI (`--btn-min-h: 32px; min-height: 32px; height: 32px; padding-top/bottom: 4px; line-height: 1; font-size: .5rem !important;`).

- < 1250px
  - `.profile__edit`: `border-radius: 20px 0 20px 0`.
  - `.profile__edit.profile__edit--offset`: quando i contatti sono aperti, `bottom: -15px; border-radius: 20px 0 0 0`.

- < 580px
  - Nasconde label (`.profile__edit-label { display: none; }`), mostra icona (`.profile__edit-icon { display: inline-block; }`).
  - `.profile__edit`: dimensioni automatiche (`width:auto; height:auto; padding: 7px 12px;`).

Layout mobile generale
- < 1249px `profile__header` diventa colonna, centrato, con `gap` e padding ridotti.
- Titoli e liste si adattano per evitare overflow, centrando i contenuti.


### Dimensionamento avatar
- `app-avatar`:
  - accetta `[width]` (es. `120`) e dimensiona `figure.profile__avatar` e `<img>` coerentemente a livello di componente avatar.
- `app-avatar-editor`:
  - accetta `[size]` (es. `120`) e dimensiona il contenitore host quadrato; gli elementi interni (preview/frecce) riempiono l’altezza del contenitore.
  - In caso di overflow verticale del contenitore padre, si consiglia – se necessario – di vincolare il wrapper (es. `.avatar-wrap`) con `height` esplicita e di impostare `overflow: hidden` all’editor.


### Accessibilità
- Pulsanti con `title` e `aria-label` coerenti allo stato (es. Modifica → Fine).
- Toggle contatti con `aria-controls` e `aria-expanded`.
- Icone SVG marcate `aria-hidden="true"` quando puramente decorative.


### Variabili CSS utilizzate
- Colori, sfondi, ombre, transizioni: `var(--bg-card)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--accent-primary)`, `var(--accent-hover)`, `var(--border-primary)`, `var(--eerie-black-2)`, `var(--shadow-1)`, `var(--transition-1)`.


### Note e insidie note
- DaisyUI imposta `min-height` sui `.btn`: sulle viewport 580–1249px viene forzata a 32px tramite variabile `--btn-min-h` e proprietà esplicite.
- Il posizionamento del pulsante Modifica dipende dai breakpoint; se aggiungete altre azioni in overlay (altri `.profile__toggle`), verificate z-index e hit area.
- Per evitare effetti collaterali tra componenti fratelli, quando si applicano vincoli all’editor avatar nell’aside usare selettori più specifici scoping sul wrapper interessato (ad es. una classe aggiuntiva a `avatar-wrap`).


### Checklist rapida
- [ ] Il pulsante Modifica appare solo quando l’utente è autenticato.
- [ ] Per ≥1250px il pulsante Modifica è in alto a destra e più stretto.
- [ ] Per <1250px è in basso a destra; con contatti aperti scende di 15px.
- [ ] Per 580–1249px l’altezza del pulsante è ridotta.
- [ ] Per <580px il pulsante mostra solo l’icona.
- [ ] L’avatar e l’editor rispettano le dimensioni passate (`[width]`, `[size]`).
- [ ] Hover di Modifica e dei toggle è visivamente coerente.


