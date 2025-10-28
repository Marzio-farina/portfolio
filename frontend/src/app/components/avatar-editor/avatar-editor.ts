import { Component, ElementRef, ViewChild, inject, input, output, signal } from '@angular/core';
import { DefaultAvatarService } from '../../services/default-avatar.service';
import { AvatarData } from '../avatar/avatar';

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
  styleUrl: './avatar-editor.css'
})
export class AvatarEditor {
  // URL iniziale (es. avatar attuale dell'utente)
  initialUrl = input<string | null>(null);

  // Emesso quando l'utente seleziona un nuovo avatar (file, url o icona)
  avatarChange = output<AvatarSelection>();

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  // Stato interno
  private defaultAvatars: AvatarData[] = [];
  private currentIndex = signal(0);
  uploadedUrl = signal<string | null>(null);
  get canNavigate(): boolean { return !this.uploadedUrl() && this.defaultAvatars.length > 1; }

  constructor() {
    // Carica avatar predefiniti
    const svc = inject(DefaultAvatarService);
    svc.getDefaultAvatars().subscribe((list: AvatarData[]) => {
      this.defaultAvatars = list;
      if (this.defaultAvatars.length > 0) {
        this.currentIndex.set(0);
      }
    });
  }

  get currentAvatarUrl(): string {
    // Priorità: immagine caricata > avatar di default corrente > initialUrl
    const up = this.uploadedUrl();
    if (up) return up;
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
    const iconId = this.defaultAvatars[this.currentIndex()].id;
    this.avatarChange.emit({ iconId, url: this.currentAvatarUrl, file: null });
  }

  next(): void {
    if (this.uploadedUrl()) return;
    if (this.defaultAvatars.length <= 1) return;
    const idx = this.currentIndex();
    const next = idx < this.defaultAvatars.length - 1 ? idx + 1 : 0;
    this.currentIndex.set(next);
    const iconId = this.defaultAvatars[this.currentIndex()].id;
    this.avatarChange.emit({ iconId, url: this.currentAvatarUrl, file: null });
  }

  clearUploaded(): void {
    // Pulisce l'immagine caricata e ripristina i default avatar
    this.uploadedUrl.set(null);
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
    // Emette l'avatar di default corrente
    const current = this.defaultAvatars[this.currentIndex()] as AvatarData | undefined;
    if (current) {
      this.avatarChange.emit({ iconId: current.id, url: current.img, file: null });
    } else {
      this.avatarChange.emit({ iconId: null, url: null, file: null });
    }
  }
}


