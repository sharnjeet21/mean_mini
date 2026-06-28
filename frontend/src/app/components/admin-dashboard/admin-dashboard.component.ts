import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  itineraries: any[] = [];
  analytics: any = { summary: {}, topDestinations: [], bookingStatus: [] };
  activeTab = 'All';
  tabs = ['All', 'Active', 'Inactive'];
  searchTerm = '';
  loading = true;
  errorMessage = '';

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private location: Location,
    private router: Router,
  ) {}

  goBack(): void {
    if (history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    forkJoin({
      itineraries: this.api.getItineraries(),
      analytics: this.api.getItineraryAnalytics(),
    }).subscribe({
      next: ({ itineraries, analytics }) => {
        this.itineraries = itineraries;
        this.analytics = analytics;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Administrative data could not be loaded.';
        this.loading = false;
      },
    });
  }

  get stats() {
    const summary = this.analytics.summary || {};
    return [
      { icon: 'map', label: 'Active trips', value: summary.activeItineraries || 0, detail: `${summary.inactiveItineraries || 0} inactive`, iconStyle: 'color:#001356; background:#dde1ff' },
      { icon: 'confirmation_number', label: 'Bookings', value: summary.totalBookings || 0, detail: 'All statuses', iconStyle: 'color:#2c0051; background:#f0dbff' },
      { icon: 'bookmark', label: 'Wishlist saves', value: summary.totalFavorites || 0, detail: 'Community intent', iconStyle: 'color:#9d174d; background:#fce7f3' },
      { icon: 'star', label: 'Reviews', value: summary.totalReviews || 0, detail: `$${(summary.averageBudget || 0).toLocaleString()} avg budget`, iconStyle: 'color:#835100; background:#ffddb9' },
    ];
  }

  delete(id: string) {
    if (!confirm('Permanently delete this itinerary?')) return;
    this.api.deleteItinerary(id).subscribe({
      next: () => {
        this.itineraries = this.itineraries.filter((item) => item._id !== id);
        this.loadDashboard();
      },
      error: (err) => { this.errorMessage = err?.error?.message || 'Delete failed.'; },
    });
  }

  toggleActive(item: any) {
    this.api.updateItinerary(item._id, { isActive: !item.isActive }).subscribe({
      next: (updated) => {
        const index = this.itineraries.findIndex((current) => current._id === item._id);
        if (index >= 0) this.itineraries[index] = updated;
        this.api.getItineraryAnalytics().subscribe((analytics) => { this.analytics = analytics; });
      },
      error: (err) => { this.errorMessage = err?.error?.message || 'Status update failed.'; },
    });
  }

  get filteredItineraries() {
    const query = this.searchTerm.trim().toLowerCase();
    return this.itineraries.filter((item) => {
      const statusMatches = this.activeTab === 'All'
        || (this.activeTab === 'Active' && item.isActive)
        || (this.activeTab === 'Inactive' && !item.isActive);
      const searchMatches = !query
        || item.title?.toLowerCase().includes(query)
        || item.destination?.toLowerCase().includes(query)
        || item.createdBy?.name?.toLowerCase().includes(query);
      return statusMatches && searchMatches;
    });
  }
}
