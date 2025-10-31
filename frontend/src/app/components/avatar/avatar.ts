import { Component, input, OnInit, computed, signal, ChangeDetectionStrategy, inject, effect, Injector, runInInjectionContext } from '@angular/core';
import { AvatarService } from '../../services/avatar.service';

export interface AvatarData {
  id: number;
  img: string;
  alt: string;
}

@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Avatar implements OnInit {
  private avatarService = inject(AvatarService);
  private injector = inject(Injector);

  width = input<number>(120);
  highlighted = input<boolean>(false);
  avatarData = input<AvatarData | null>(null);
  
  private avatars = signal<AvatarData[]>([]);
  private selectedId = 1;
  imageLoaded = signal(false);
  
  selectedAvatar = computed(() => {
    // Se avatarData è passato, usalo
    const data = this.avatarData();
    if (data) {
      return data;
    }
    
    // Altrimenti ritorna il primo avatar dalla lista caricata
    const avatarsList = this.avatars();
    if (avatarsList.length > 0) {
      return avatarsList.find(a => a.id === this.selectedId) || avatarsList[1];
    }
    
    return null;
  });

  constructor() {
    // Usa runInInjectionContext nel constructor per creare l'effect nel contesto corretto
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const data = this.avatarData();
        // Quando avatarData cambia, resetta lo skeleton
        this.imageLoaded.set(false);
      });
    });
  }

  ngOnInit(): void {
    // Carica gli avatar di default solo se avatarData non è passato
    if (!this.avatarData() && this.avatars().length === 0) {
      this.avatarService.getAvatars().subscribe((avatars: AvatarData[]) => {
        this.avatars.set(avatars);
      });
    }
  }

  onImgLoad() {
    this.imageLoaded.set(true);
  }
}
