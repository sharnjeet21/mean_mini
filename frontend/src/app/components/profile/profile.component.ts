import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  public auth       = inject(AuthService);
  private api       = inject(ApiService);
  private location  = inject(Location);
  private router    = inject(Router);

  // Resolved after injection — safe to call auth here
  user = this.auth.currentUser();

  // Stats
  itineraryCount = 0;
  bookingCount = 0;
  favoritesCount = 0;
  statsLoading = true;
  statsError = '';


  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadStats();
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
