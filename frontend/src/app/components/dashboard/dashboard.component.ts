import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
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
    ];
  }

  get sortedItineraries() {
    const list = [...this.itineraries];
    if (this.activeFilter === 'Budget')   return list.sort((a, b) => (a.budget || 0) - (b.budget || 0));
    if (this.activeFilter === 'Duration') return list.sort((a, b) => String(a.duration).localeCompare(String(b.duration)));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  constructor(public auth: AuthService, private http: HttpClient) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }
    this.loadItineraries();
  }

  loadItineraries() {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiUrl}/api/itinerary`).subscribe({
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
    this.form = { title: '', destination: '', startDate: '', endDate: '', duration: '', budget: null, description: '' };
    this.formError = '';
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  submitCreate() {
    if (!this.form.title || !this.form.destination || !this.form.startDate || !this.form.endDate || !this.form.duration || !this.form.budget) {
      this.formError = 'Please fill all required fields.';
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

  onDestinationSelected(place: string): void {
    this.form.destination = place;
    if (this.showModal === false) {
      this.openModal();
    }
  }

  onRateLimitError(message: string): void {
    this.rateLimitMessage = message;
    setTimeout(() => { this.rateLimitMessage = ''; }, 5000);
  }
}
