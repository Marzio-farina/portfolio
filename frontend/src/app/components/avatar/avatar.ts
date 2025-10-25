import { Component, input, OnInit } from '@angular/core';
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
  styleUrl: './avatar.css'
})
export class Avatar implements OnInit {

  width = input<number>(120);
  highlighted = input<boolean>(false);
  avatarData = input<AvatarData | null>(null);
  
  avatars: AvatarData[] = [];
  selectedAvatar?: AvatarData;
  
  selectedId = 1;

  constructor(private avatarService: AvatarService) {}

  ngOnInit(): void {
    // Se viene passato un avatar specifico, usalo
    if (this.avatarData()) {
      this.selectedAvatar = this.avatarData()!;
      return;
    }
    
    // Altrimenti carica gli avatar di default
    this.avatarService.getAvatars().subscribe((data: AvatarData[]) => {
      this.avatars = data;
      this.selectAvatar(this.selectedId);
    });
  }

  selectAvatar(id: number): void {
    this.selectedAvatar = this.avatars.find(a => a.id === id);
  }
}
