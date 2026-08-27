import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { CurrencyService } from '../../../services/currency.service';

@Component({
  selector: 'app-agency-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './agency-overview.component.html',
})
export class AgencyOverviewComponent implements OnInit {
  auth = inject(AuthService);
  currencyService = inject(CurrencyService);
  private api = inject(ApiService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  recentProposals: any[] = [];
  analyticsData: any = null;
  loadingProposals = true;
  loadingAnalytics = true;
  errorMessage = '';

  ngOnInit(): void {
    this.fetchProposals();
    this.fetchAnalytics();
  }

  fetchProposals(): void {
    this.loadingProposals = true;
    this.api.getMyItineraries().pipe(
      finalize(() => {
        this.loadingProposals = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data: any[]) => {
        this.recentProposals = data.slice(0, 5).map(it => ({
          id: it._id,
          title: it.title,
          destination: it.destination,
          status: it.status || 'draft',
          isActive: it.isActive,
          date: it.createdAt,
          budget: it.budget,
        }));
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load proposals.';
      }
    });
  }

  fetchAnalytics(): void {
    this.loadingAnalytics = true;
    this.api.getAgencyAnalytics().pipe(
      finalize(() => {
        this.loadingAnalytics = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        this.analyticsData = data;
      },
      error: (err) => {
        // Silent error for analytics if not authorized
        console.warn('Analytics loading failed:', err?.message);
      }
    });
  }

  openProposal(id: string): void {
    this.router.navigate(['/itinerary', id]);
  }

  openPublicProposal(id: string): void {
    this.router.navigate(['/proposal', id]);
  }

  get statusLabel(): (status: string) => string {
    return (status: string) => {
      const map: Record<string, string> = {
        published: 'Published',
        draft: 'Draft',
        archived: 'Archived',
      };
      return map[status] || status;
    };
  }

  get statusClass(): (status: string) => string {
    return (status: string) => {
      if (status === 'published') return 'bg-emerald-500/20 text-emerald-300';
      if (status === 'archived') return 'bg-rose-500/20 text-rose-300';
      return 'bg-amber-500/20 text-amber-300';
    };
  }
}
