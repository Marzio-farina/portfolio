import { Component, input, OnInit } from '@angular/core';
import { AvatarService } from '../../services/avatar.service';

export interface Avatar {
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
  avatars: Avatar[] = [];
  selectedAvatar?: Avatar;
  
  selectedId = 1;

  constructor(private avatarService: AvatarService) {}

  ngOnInit(): void {
    this.avatarService.getAvatars().subscribe(data => {
      this.avatars = data;
      this.selectAvatar(this.selectedId);
    });
  }

  selectAvatar(id: number): void {
    this.selectedAvatar = this.avatars.find(a => a.id === id);
  }
}
