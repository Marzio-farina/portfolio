import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EditModeService {
  readonly isEditing = signal(false);

  enable(): void { this.isEditing.set(true); }
  disable(): void { this.isEditing.set(false); }
  toggle(): void { this.isEditing.update(v => !v); }
}


