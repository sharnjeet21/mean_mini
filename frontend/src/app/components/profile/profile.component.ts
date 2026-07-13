import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  public auth       = inject(AuthService);
  private api       = inject(ApiService);
  private location  = inject(Location);
  private router    = inject(Router);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  // Resolved after injection — safe to call auth here
  user = this.auth.currentUser();

  // Stats
  itineraryCount = 0;
  bookingCount = 0;
  favoritesCount = 0;
  statsLoading = true;
  statsError = '';

  // Upgrade requests
  roleRequest: any = null;
  roleRequestReason = '';
  roleRequestLoading = false;

  // Developer switch options
  isDevMode = !environment.production;
  selectedDevRole = '';


  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadStats();
    this.loadMyRoleRequest();
  }

  loadStats(): void {
    this.statsLoading = true;
    this.statsError = '';
    forkJoin({
      itineraries: this.api.getItineraries().pipe(catchError(() => of([]))),
      bookings:    this.api.getUserBookings().pipe(catchError(() => of([]))),
      favorites:   this.api.getFavorites().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ itineraries, bookings, favorites }) => {
        const uid = this.user?.id;
        this.itineraryCount = uid
          ? itineraries.filter((i: any) => (i.createdBy?._id || i.createdBy) === uid).length
          : itineraries.length;
        this.bookingCount   = bookings.length;
        this.favoritesCount = favorites.length;
        this.statsLoading   = false;
      },
      error: () => {
        this.statsError   = 'Unable to load activity data.';
        this.statsLoading = false;
      },
    });
  }

  loadMyRoleRequest(): void {
    if (this.user?.role !== 'user') return;
    this.api.getMyRoleRequest().subscribe({
      next: (req) => {
        this.roleRequest = req;
      },
      error: () => {
        // ignore errors silently
      }
    });
  }

  submitRoleRequest(): void {
    if (!this.roleRequestReason || this.roleRequestReason.trim().length < 10) {
      this.toastService.warning('Please enter a reason of at least 10 characters.');
      return;
    }
    this.roleRequestLoading = true;
    this.api.requestAdminRole(this.roleRequestReason).subscribe({
      next: (res) => {
        this.roleRequestLoading = false;
        this.roleRequest = { status: 'pending', reason: this.roleRequestReason };
        this.toastService.success(res.message || 'Request submitted successfully!');
      },
      error: (err) => {
        this.roleRequestLoading = false;
        this.toastService.error(err?.error?.message || 'Failed to submit request.');
      }
    });
  }

  async switchDevRole(newRole: string): Promise<void> {
    if (!this.isDevMode) return;
    if (!newRole) return;
    
    const confirmed = await this.confirmService.confirm({
      title: 'Switch Role (Developer Mode)',
      message: `Are you sure you want to switch your account role to "${newRole}"?`,
      confirmText: 'Switch',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!confirmed) return;

    this.toastService.info('Switching role...', 1000);
    this.api.updateUserRole(this.user!.id, newRole).subscribe({
      next: () => {
        this.auth.updateCurrentUserRole(newRole);
        this.user = this.auth.currentUser();
        this.selectedDevRole = '';
        this.toastService.success(`Successfully switched role to "${newRole}"!`);
        this.loadStats();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to switch role.');
      }
    });
  }

  goBack(): void {
    if (history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  get initials(): string {
    const name = this.user?.name || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  get roleLabel(): string {
    switch (this.user?.role) {
      case 'superadmin': return 'Super Admin';
      case 'admin':      return 'Trip Manager';
      default:           return 'Traveler';
    }
  }

  get roleColor(): string {
    switch (this.user?.role) {
      case 'superadmin': return 'text-[#ffc96b] border-[#ffc96b]/30 bg-[#ffc96b]/10';
      case 'admin':      return 'text-[#8cbcff] border-[#8cbcff]/30 bg-[#8cbcff]/10';
      default:           return 'text-[#7ae0c3] border-[#7ae0c3]/30 bg-[#7ae0c3]/10';
    }
  }

  navigateTo(path: string, queryParams?: any): void {
    this.router.navigate([path], queryParams ? { queryParams } : {});
  }

  logout(): void {
    this.auth.logout();
  }
}
