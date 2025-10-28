import { Component, input, OnInit, computed, effect, signal, ChangeDetectionStrategy } from '@angular/core';
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

  width = input<number>(120);
  highlighted = input<boolean>(false);
  avatarData = input<AvatarData | null>(null);
  
  private avatars = signal<AvatarData[]>([]);
  private selectedId = 1;
  
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

  constructor(private avatarService: AvatarService) {
    // Effect: carica gli avatar di default se non è passato avatarData
    effect(() => {
      const data = this.avatarData();
      // Se avatarData non è passato, carica gli avatar di default
      if (!data) {
        this.avatarService.getAvatars().subscribe((avatars: AvatarData[]) => {
          this.avatars.set(avatars);
        });
      }
    });
  }

  ngOnInit(): void {
    // Non fare niente qui - l'effect si occupa di tutto
  }
}
