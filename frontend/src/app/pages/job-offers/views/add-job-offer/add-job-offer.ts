import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-job-offer',
  standalone: true,
  imports: [],
  templateUrl: './add-job-offer.html',
  styleUrl: './add-job-offer.css'
})
export class AddJobOffer {
  private router = inject(Router);

  goBack(): void {
    this.router.navigate(['/job-offers']);
  }
}

