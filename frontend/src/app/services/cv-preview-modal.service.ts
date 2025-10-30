import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CvPreviewModalService {
  isOpen = signal(false);
  url = signal<string | null>(null);

  open(url: string): void {
    this.url.set(url);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.url.set(null);
  }
}


