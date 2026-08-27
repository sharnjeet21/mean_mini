import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { CurrencyService } from '../../../services/currency.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-agency-proposals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agency-proposals.component.html',
})
export class AgencyProposalsComponent implements OnInit {
  currencyService = inject(CurrencyService);
  auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  proposals: any[] = [];
  loading = true;
  errorMessage = '';
  searchTerm = '';
  activeTab: 'all' | 'draft' | 'published' = 'all';

  ngOnInit(): void {
    this.fetchProposals();
  }

  fetchProposals(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getMyItineraries().pipe(
      finalize(() => { this.loading = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (data: any[]) => {
        this.proposals = data.map(it => ({
          id: it._id,
          title: it.title,
          destination: it.destination,
          status: it.status || 'draft',
          isActive: it.isActive,
          date: it.createdAt,
          budget: it.budget,
          travelerCount: it.travelerCount,
          engagement: it.engagement,
        }));
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load proposals.';
      },
    });
  }

  get filteredProposals(): any[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.proposals.filter(p => {
      const matchesSearch = !query || 
        p.title?.toLowerCase().includes(query) || 
        p.destination?.toLowerCase().includes(query);
      const matchesTab = this.activeTab === 'all' || p.status === this.activeTab;
      return matchesSearch && matchesTab;
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

  copyPublicLink(id: string): void {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/proposal/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toast.success('Public proposal link copied to clipboard!');
    }).catch(() => {
      this.toast.error('Failed to copy link.');
    });
  }
}
