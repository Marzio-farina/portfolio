import { Component, ElementRef, ViewChild, inject, input, output, signal, ChangeDetectionStrategy, HostBinding, ChangeDetectorRef } from '@angular/core';
import { DefaultAvatarService } from '../../services/default-avatar.service';
import { AvatarData } from '../avatar/avatar';
import { apiUrl } from '../../core/api/api-url';

export interface AvatarSelection {
  url?: string | null;
  file?: File | null;
  iconId?: number | null;
}

@Component({
  selector: 'app-avatar-editor',
  standalone: true,
  imports: [],
  templateUrl: './avatar-editor.html',
  styleUrl: './avatar-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvatarEditor {
  // URL iniziale (es. avatar attuale dell'utente)
  initialUrl = input<string | null>(null);
  // Opzioni dimensioni
  // - width/height possono essere number (px) oppure 'auto'
  // - se non specificati, si usa size come fallback (quadrato)
  width = input<number | 'auto'>('auto');
  height = input<number | 'auto'>('auto');
  size = input<number>(80); // fallback retrocompatibile
  // Contesto di utilizzo: influenza la priorità dell'immagine iniziale
  context = input<'testimonial' | 'aside' | 'generic'>('generic');
  // Stato esterno: se il parent è in modalità modifica
  editing = input<boolean>(false);

  // Dimensiona il contenitore host per vincolare l'editor
  @HostBinding('style.display') get hostDisplay(): string {
    // In aside il display inline-block spinge a destra: usa block
    return this.context() === 'aside' ? '' : 'inline-block';
  }
  @HostBinding('style.width') get hostW(): string {
    const w = this.width();
    if (w === 'auto') return 'auto';
    if (typeof w === 'number') return `${w}px`;
    // fallback a size
    return `${this.size()}px`;
  }
  @HostBinding('style.height') get hostH(): string {
    const h = this.height();
    if (h === 'auto') return 'auto';
    if (typeof h === 'number') return `${h}px`;
    // fallback a size
    return `${this.size()}px`;
  }

  // Emesso quando l'utente seleziona un nuovo avatar (file, url o icona)
  avatarChange = output<AvatarSelection>();

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  // Stato interno
  private defaultAvatars: AvatarData[] = [];
  private currentIndex = signal(0);
  uploadedUrl = signal<string | null>(null);
  private preferDefault = signal(false);
  get canNavigate(): boolean { return !this.uploadedUrl() && this.defaultAvatars.length > 1; }

  constructor() {
    // Carica avatar predefiniti
    const svc = inject(DefaultAvatarService);
    const cdr = inject(ChangeDetectorRef);

    // Fallback immediato per evitare attesa iniziale
    if (this.context() === 'testimonial' && this.defaultAvatars.length === 0) {
      const baseDefaults: AvatarData[] = [
        { id: 0, img: apiUrl('storage/avatars/default-avatar.png'), alt: 'Avatar default' },
        { id: 1, img: apiUrl('storage/avatars/avatar-1.png'), alt: 'Avatar 1' },
        { id: 2, img: apiUrl('storage/avatars/avatar-2.png'), alt: 'Avatar 2' },
        { id: 3, img: apiUrl('storage/avatars/avatar-3.png'), alt: 'Avatar 3' },
        { id: 4, img: apiUrl('storage/avatars/avatar-4.png'), alt: 'Avatar 4' },
        { id: 5, img: apiUrl('storage/avatars/avatar-5.png'), alt: 'Avatar 5' },
      ];
      this.defaultAvatars = baseDefaults;
      const idx = baseDefaults.findIndex(a => a.img.endsWith('default-avatar.png'));
      this.currentIndex.set(idx >= 0 ? idx : 0);
      cdr.markForCheck();
    }

    svc.getDefaultAvatars().subscribe((list: AvatarData[]) => {
      this.defaultAvatars = list;
      if (this.defaultAvatars.length > 0) {
        // Se usato nel form recensione, prova a selezionare default-avatar.png come primo
        if (this.context() === 'testimonial') {
          const idx = this.defaultAvatars.findIndex(a => a.img.endsWith('default-avatar.png'));
          this.currentIndex.set(idx >= 0 ? idx : 0);
        } else {
          this.currentIndex.set(0);
        }
      }
      cdr.markForCheck();
    });
  }

  get currentAvatarUrl(): string {
    const up = this.uploadedUrl();
    if (up) return up;
    // Aside: preferisci l'URL iniziale (avatar corrente dell'utente)
    if (this.context() === 'aside') {
      if (this.preferDefault() && this.defaultAvatars.length > 0) {
        return this.defaultAvatars[this.currentIndex()].img;
      }
      if (this.initialUrl()) return this.initialUrl()!;
      if (this.defaultAvatars.length > 0) return this.defaultAvatars[this.currentIndex()].img;
      return '';
    }
    // Testimonial/generic: preferisci un default se disponibile, altrimenti initialUrl
    if (this.defaultAvatars.length > 0) return this.defaultAvatars[this.currentIndex()].img;
    if (this.initialUrl()) return this.initialUrl()!;
    return '';
  }

  triggerFile(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] || null;
    if (!file) return;

    // Validazioni minime
    if (!file.type.startsWith('image/')) {
      inputEl.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      inputEl.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const url = (e.target?.result as string) || null;
      this.uploadedUrl.set(url);
      this.avatarChange.emit({ file, url, iconId: null });
    };
    reader.readAsDataURL(file);
  }

  previous(): void {
    if (this.uploadedUrl()) return; // non navigare se c'è un file caricato
    if (this.defaultAvatars.length <= 1) return;
    const idx = this.currentIndex();
    const next = idx > 0 ? idx - 1 : this.defaultAvatars.length - 1;
    this.currentIndex.set(next);
    this.preferDefault.set(true);
    const iconId = this.defaultAvatars[this.currentIndex()].id;
    this.avatarChange.emit({ iconId, url: this.currentAvatarUrl, file: null });
  }

  next(): void {
    if (this.uploadedUrl()) return;
    if (this.defaultAvatars.length <= 1) return;
    const idx = this.currentIndex();
    const next = idx < this.defaultAvatars.length - 1 ? idx + 1 : 0;
    this.currentIndex.set(next);
    this.preferDefault.set(true);
    const iconId = this.defaultAvatars[this.currentIndex()].id;
    this.avatarChange.emit({ iconId, url: this.currentAvatarUrl, file: null });
  }

  clearUploaded(): void {
    // Pulisce l'immagine caricata e ripristina i default avatar
    this.uploadedUrl.set(null);
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
    this.preferDefault.set(true);
    // Emette l'avatar di default corrente
    const current = this.defaultAvatars[this.currentIndex()] as AvatarData | undefined;
    if (current) {
      this.avatarChange.emit({ iconId: current.id, url: current.img, file: null });
    } else {
      this.avatarChange.emit({ iconId: null, url: null, file: null });
    }
  }
}


