import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-dashboard.component.html',
})
export class ClientDashboardComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  proposals: any[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.api.getItineraries().pipe(
      finalize(() => { this.loading = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (data) => { this.proposals = data; },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Could not load proposals.';
      },
    });
  }
}
