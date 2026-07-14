import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

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

  // Tab section views
  activeSection: 'itineraries' | 'users' | 'requests' | 'ai-runtime' | 'health' | 'affiliates' = 'itineraries';
  isPlatformMode = false;

  // User directory state
  users: any[] = [];
  userSearchTerm = '';
  userLoading = false;
  userErrorMessage = '';

  // Access requests state
  roleRequests: any[] = [];
  requestsLoading = false;
  requestsErrorMessage = '';

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private location: Location,
    private router: Router,
    private toastService: ToastService,
    private confirmService: ConfirmService,
  ) {}

  goBack(): void {
    if (history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/workspace']);
    }
  }

  ngOnInit() {
    this.isPlatformMode = this.router.url.split('?')[0].endsWith('/platform');
    if (this.isPlatformMode) {
      this.activeSection = 'users';
    } else {
      this.activeSection = 'itineraries';
    }
    this.loadDashboard();
    this.loadUsers();
    this.loadRoleRequests();
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

  loadUsers(): void {
    this.userLoading = true;
    this.userErrorMessage = '';
    const isSuperadmin = this.auth.currentUser()?.role === 'superadmin';
    const request = isSuperadmin ? this.api.getUsers() : this.api.getAdminUsers();

    request.subscribe({
      next: (res) => {
        this.users = Array.isArray(res) ? res : (res.users || []);
        this.userLoading = false;
      },
      error: (err) => {
        this.userErrorMessage = err?.error?.message || 'Failed to load user directory.';
        this.userLoading = false;
      }
    });
  }

  loadRoleRequests(): void {
    if (!['admin', 'superadmin'].includes(this.auth.currentUser()?.role || '')) return;
    this.requestsLoading = true;
    this.requestsErrorMessage = '';
    this.api.getRoleRequests().subscribe({
      next: (requests) => {
        this.roleRequests = requests;
        this.requestsLoading = false;
      },
      error: (err) => {
        this.requestsErrorMessage = err?.error?.message || 'Failed to load access requests.';
        this.requestsLoading = false;
      }
    });
  }

  changeUserRole(user: any, newRole: string): void {
    if (this.auth.currentUser()?.role !== 'superadmin') return;
    this.api.updateUserRole(user._id, newRole).subscribe({
      next: () => {
        user.role = newRole;
      },
      error: (err) => {
        this.userErrorMessage = err?.error?.message || 'Failed to update user role.';
      }
    });
  }

  toggleUserStatus(user: any): void {
    if (this.auth.currentUser()?.role !== 'superadmin') return;
    const newStatus = !user.isActive;
    this.api.toggleUserActiveStatus(user._id, newStatus).subscribe({
      next: () => {
        user.isActive = newStatus;
      },
      error: (err) => {
        this.userErrorMessage = err?.error?.message || 'Failed to toggle user status.';
      }
    });
  }

  async deleteUserAccount(userId: string): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Account',
      message: 'Are you sure you want to permanently delete this user account? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    const isSuperadmin = this.auth.currentUser()?.role === 'superadmin';
    const request = isSuperadmin ? this.api.deleteUser(userId) : this.api.deleteAdminUser(userId);

    request.subscribe({
      next: () => {
        this.users = this.users.filter((u) => u._id !== userId);
        this.toastService.success('User account deleted successfully.');
      },
      error: (err) => {
        this.userErrorMessage = err?.error?.message || 'Failed to delete user account.';
        this.toastService.error(this.userErrorMessage);
      }
    });
  }

  reviewRequest(reqObj: any, status: 'approved' | 'rejected', notes: string): void {
    if (!['admin', 'superadmin'].includes(this.auth.currentUser()?.role || '')) return;
    this.api.reviewRoleRequest(reqObj._id, status, notes).subscribe({
      next: (res) => {
        reqObj.status = status;
        reqObj.reviewNotes = notes;
        this.toastService.success(res.message || `Request ${status} successfully.`);
        this.loadRoleRequests();
        this.loadUsers();
      },
      error: (err) => {
        this.requestsErrorMessage = err?.error?.message || 'Failed to review request.';
        this.toastService.error(this.requestsErrorMessage);
      }
    });
  }

  get filteredUsers() {
    const query = this.userSearchTerm.trim().toLowerCase();
    return this.users.filter((u) => {
      return !query
        || u.name?.toLowerCase().includes(query)
        || u.email?.toLowerCase().includes(query)
        || u.role?.toLowerCase().includes(query);
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

  async delete(id: string): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Itinerary',
      message: 'Are you sure you want to permanently delete this itinerary? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    this.api.deleteItinerary(id).subscribe({
      next: () => {
        this.itineraries = this.itineraries.filter((item) => item._id !== id);
        this.toastService.success('Itinerary deleted successfully.');
        this.loadDashboard();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Delete failed.';
        this.toastService.error(this.errorMessage);
      },
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
