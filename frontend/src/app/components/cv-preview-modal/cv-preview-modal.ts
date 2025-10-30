import { Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CvPreviewModalService } from '../../services/cv-preview-modal.service';

@Component({
  selector: 'app-cv-preview-modal',
  standalone: true,
  templateUrl: './cv-preview-modal.html',
  styleUrls: ['./cv-preview-modal.css']
})
export class CvPreviewModal {
  private readonly modal = inject(CvPreviewModalService);
  private readonly sanitizer = inject(DomSanitizer);

  safeUrl = computed<SafeResourceUrl | null>(() => {
    const u = this.modal.url();
    return u ? this.sanitizer.bypassSecurityTrustResourceUrl(u) : null;
  });

  close(): void {
    this.modal.close();
  }
}


