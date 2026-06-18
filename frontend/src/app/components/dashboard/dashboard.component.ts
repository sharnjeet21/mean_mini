import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { DestinationSearchComponent } from '../destination-search/destination-search.component';
import { TrendingCardsComponent } from '../trending-cards/trending-cards.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DestinationSearchComponent, TrendingCardsComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  itineraries: any[] = [];
  loading = true;
  activeFilter = 'Date';
  filters = ['Date', 'Budget', 'Duration'];
  activeView: 'explore' | 'saved' | 'bookings' = 'explore';
  rateLimitMessage = '';
  private platformId = inject(PLATFORM_ID);

  showModal = false;
  saving = false;
  formError = '';
  form = {
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    duration: '',
    budget: null as number | null,
    travelerCount: 1,
    category: 'leisure',
    travelStyle: 'balanced',
    transportMode: 'mixed',
    accommodationType: 'hotel',
    budgetBreakdown: {
      transport: 0,
      accommodation: 0,
      food: 0,
      activities: 0,
      contingency: 0,
    },
    description: '',
  };

  get stats() {
    const total = this.itineraries.length;
    const destinations = new Set(this.itineraries.map(i => i.destination)).size;
    const avgBudget = total
      ? Math.round(this.itineraries.reduce((s, i) => s + (i.budget || 0), 0) / total)
      : 0;
    return [
      { icon: 'map',      label: 'Total Itineraries',   value: total,           badge: 'All',    badgeColor: '#835100', iconStyle: 'color:#3953bd; background:#dde1ff' },
      { icon: 'explore',  label: 'Unique Destinations', value: destinations,    badge: 'Global', badgeColor: '#3953bd', iconStyle: 'color:#754aa1; background:#f0dbff' },
      { icon: 'payments', label: 'Avg Budget',          value: `$${avgBudget.toLocaleString()}`, badge: 'Avg', badgeColor: '#444653', iconStyle: 'color:#835100; background:#ffddb9' },
      { icon: 'favorite', label: 'Community Saves', value: this.itineraries.reduce((s, i) => s + (i.engagement?.favoriteCount || 0), 0), badge: 'Live', badgeColor: '#047857', iconStyle: 'color:#be185d; background:#fce7f3' },
    ];
  }

  get sortedItineraries() {
    const list = [...this.itineraries];
    if (this.activeFilter === 'Budget')   return list.sort((a, b) => (a.budget || 0) - (b.budget || 0));
    if (this.activeFilter === 'Duration') return list.sort((a, b) => String(a.duration).localeCompare(String(b.duration)));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  constructor(public auth: AuthService, private http: HttpClient, private api: ApiService) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }
    this.loadItineraries();
  }

  loadItineraries() {
    this.loading = true;
    const request = this.activeView === 'saved'
      ? this.api.getFavorites()
      : this.activeView === 'bookings'
        ? this.api.getUserBookings()
        : this.api.getItineraries();
    request.subscribe({
      next: (res) => {
        this.itineraries = Array.isArray(res) ? res : [];
        this.loading = false;
      },
      error: () => {
        this.itineraries = [];
        this.loading = false;
      }
    });
  }

  openModal() {
    this.form = {
      title: '',
      destination: '',
      startDate: '',
      endDate: '',
      duration: '',
      budget: null,
      travelerCount: 1,
      category: 'leisure',
      travelStyle: 'balanced',
      transportMode: 'mixed',
      accommodationType: 'hotel',
      budgetBreakdown: {
        transport: 0,
        accommodation: 0,
        food: 0,
        activities: 0,
        contingency: 0,
      },
      description: '',
    };
    this.formError = '';
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  submitCreate() {
    if (!this.form.title || !this.form.destination || !this.form.startDate || !this.form.endDate || !this.form.duration || !this.form.budget) {
      this.formError = 'Please fill all required fields.';
      return;
    }
    if (new Date(this.form.endDate) < new Date(this.form.startDate)) {
      this.formError = 'End date must be on or after the start date.';
      return;
    }
    this.saving = true;
    this.formError = '';
    this.http.post<any>(`${environment.apiUrl}/api/itinerary`, this.form).subscribe({
      next: (res) => {
        this.itineraries.unshift(res);
        this.saving = false;
        this.showModal = false;
      },
      error: (err) => {
        this.formError = err?.error?.message || err?.message || 'Failed to create itinerary. Please try again.';
        this.saving = false;
      }
    });
  }

  setView(view: 'explore' | 'saved' | 'bookings') {
    this.activeView = view;
    this.loadItineraries();
  }

  updateDuration() {
    if (!this.form.startDate || !this.form.endDate) return;
    const start = new Date(this.form.startDate);
    const end = new Date(this.form.endDate);
    if (end < start) return;
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
    this.form.duration = `${days} Day${days === 1 ? '' : 's'}`;
  }

  allocateBudget() {
    const total = Number(this.form.budget) || 0;
    this.form.budgetBreakdown = {
      transport: Math.round(total * 0.25),
      accommodation: Math.round(total * 0.35),
      food: Math.round(total * 0.2),
      activities: Math.round(total * 0.1),
      contingency: total - Math.round(total * 0.25) - Math.round(total * 0.35) - Math.round(total * 0.2) - Math.round(total * 0.1),
    };
  }

  onDestinationSelected(place: string): void {
    if (this.showModal === false) {
      this.openModal();
    }
    this.form.destination = place;
  }

  onRateLimitError(message: string): void {
    this.rateLimitMessage = message;
    setTimeout(() => { this.rateLimitMessage = ''; }, 5000);
  }
}
