import { Component, ElementRef, input, ViewChild } from '@angular/core';

export type Progetto = {
  id: number;
  title: string;
  category: string;
  description: string;
  poster: string; // data URI o url immagine
  video: string;  // url mp4/webm locale
  technologies : string;
};

@Component({
  selector: 'app-progetti-card',
  imports: [],
  templateUrl: './progetti-card.html',
  styleUrl: './progetti-card.css'
})
export class ProgettiCard {
  progetto = input.required<Progetto>();
  @ViewChild('videoEl', { static: false }) videoEl?: ElementRef<HTMLVideoElement>;

  play() {
    const v = this.videoEl?.nativeElement;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {/* ignoriamo errori autoplay */});
  }
  pause() {
    const v = this.videoEl?.nativeElement;
    if (!v) return;
    v.pause();
  }
}