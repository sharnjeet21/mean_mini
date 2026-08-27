import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmService } from '../../../services/confirm.service';

@Component({
  selector: 'app-agency-operations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agency-operations.component.html',
})
export class AgencyOperationsComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private cdr = inject(ChangeDetectorRef);

  itineraries: any[] = [];
  analytics: any = { summary: {}, topDestinations: [], bookingStatus: [] };
  activeTab = 'All';
  tabs = ['All', 'Active', 'Inactive'];
  searchTerm = '';
  loading = true;
  errorMessage = '';

  activeSection: 'itineraries' | 'requests' | 'affiliates' = 'itineraries';

  // Role Requests state
  roleRequests: any[] = [];
  requestsLoading = false;
  requestsErrorMessage = '';

  // Affiliate Analytics state
  affiliateData: any = null;
  affiliateLoading = false;
  affiliateError = '';

  ngOnInit(): void {
    this.loadOperationsData();
  }

  loadOperationsData(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      itineraries: this.api.getItineraries(),
      analytics: this.api.getItineraryAnalytics(),
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: ({ itineraries, analytics }) => {
        this.itineraries = itineraries;
        this.analytics = analytics;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load operations database.';
      },
    });
  }

  loadRoleRequests(): void {
    this.requestsLoading = true;
    this.requestsErrorMessage = '';
    this.api.getRoleRequests().pipe(
      finalize(() => {
        this.requestsLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (requests) => {
        this.roleRequests = requests;
      },
      error: (err) => {
        this.requestsErrorMessage = err?.error?.message || 'Failed to load access requests.';
      }
    });
  }

  loadAffiliateAnalytics(): void {
    this.affiliateLoading = true;
    this.affiliateError = '';
    this.api.getAffiliateAnalytics().pipe(
      finalize(() => {
        this.affiliateLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        this.affiliateData = data;
      },
      error: (err) => {
        this.affiliateError = err?.error?.message || 'Failed to load affiliate analytics.';
      },
    });
  }

  setSection(section: 'itineraries' | 'requests' | 'affiliates'): void {
    this.activeSection = section;
    if (section === 'requests') this.loadRoleRequests();
    if (section === 'affiliates') this.loadAffiliateAnalytics();
  }

  toggleActive(item: any): void {
    this.api.updateItinerary(item._id, { isActive: !item.isActive }).subscribe({
      next: (updated) => {
        const index = this.itineraries.findIndex((current) => current._id === item._id);
        if (index >= 0) this.itineraries[index] = updated;
        this.api.getItineraryAnalytics().subscribe((analytics) => { this.analytics = analytics; });
        this.toastService.success(`Itinerary active status updated.`);
      },
      error: (err) => { this.errorMessage = err?.error?.message || 'Status update failed.'; },
    });
  }

  async delete(id: string): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Itinerary',
      message: 'Are you sure you want to permanently delete this itinerary from the global directory? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    this.api.deleteItinerary(id).subscribe({
      next: () => {
        this.itineraries = this.itineraries.filter((item) => item._id !== id);
        this.toastService.success('Itinerary deleted successfully.');
        this.loadOperationsData();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Delete failed.';
        this.toastService.error(this.errorMessage);
      },
    });
  }

  reviewRequest(reqObj: any, status: 'approved' | 'rejected', notes: string): void {
    this.api.reviewRoleRequest(reqObj._id, status, notes).subscribe({
      next: (res) => {
        reqObj.status = status;
        reqObj.reviewNotes = notes;
        this.toastService.success(res.message || `Request ${status} successfully.`);
        this.loadRoleRequests();
      },
      error: (err) => {
        this.requestsErrorMessage = err?.error?.message || 'Failed to review request.';
        this.toastService.error(this.requestsErrorMessage);
      }
    });
  }

  get stats() {
    const summary = this.analytics.summary || {};
    return [
      { icon: 'map', label: 'Active trips', value: summary.activeItineraries || 0, detail: `${summary.inactiveItineraries || 0} inactive` },
      { icon: 'confirmation_number', label: 'Bookings', value: summary.totalBookings || 0, detail: 'All statuses' },
      { icon: 'bookmark', label: 'Wishlist saves', value: summary.totalFavorites || 0, detail: 'Community intent' },
      { icon: 'star', label: 'Reviews', value: summary.totalReviews || 0, detail: `$${(summary.averageBudget || 0).toLocaleString()} avg budget` },
    ];
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
