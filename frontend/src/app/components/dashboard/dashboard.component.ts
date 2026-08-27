import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { DestinationSearchComponent } from '../destination-search/destination-search.component';
import { TrendingCardsComponent } from '../trending-cards/trending-cards.component';
import { getItineraryImage } from '../../utils/itinerary-image';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    DestinationSearchComponent,
    TrendingCardsComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  itineraries: any[] = [];
  loading = true;
  activeFilter = 'Date';
  filters = ['Date', 'Budget', 'Duration'];
  activeView: 'explore' | 'saved' | 'bookings' = 'explore';
  rateLimitMessage = '';
  loadError = '';
  destinationToast = '';

  private platformId = inject(PLATFORM_ID);
  auth = inject(AuthService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    this.route.queryParams.subscribe((params) => {
      if (params['view'] === 'saved' || params['view'] === 'bookings' || params['view'] === 'explore') {
        this.activeView = params['view'];
      } else if (!params['view']) {
        this.activeView = 'explore';
      }
      this.loadItineraries();
    });

    const destination = this.route.snapshot.queryParamMap.get('destination') || '';
    if (destination) {
      this.destinationToast = `${destination} is ready to explore below. Save a route or book your travel logistics to get started.`;
    }
  }

  get sortedItineraries() {
    const list = [...this.itineraries];
    if (this.activeFilter === 'Budget') return list.sort((a, b) => (a.budget || 0) - (b.budget || 0));
    if (this.activeFilter === 'Duration') return list.sort((a, b) => String(a.duration).localeCompare(String(b.duration)));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  loadItineraries(): void {
    this.loading = true;
    this.loadError = '';
    
    const request = this.activeView === 'saved'
      ? this.api.getFavorites()
      : this.activeView === 'bookings'
        ? this.api.getUserBookings()
        : this.api.getItineraries();

    request.pipe(
      timeout(12000),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (result) => {
        this.itineraries = Array.isArray(result) ? result : [];
      },
      error: (error) => {
        this.itineraries = [];
        if (error?.status === 401) {
          this.loadError = 'Your session expired. Redirecting you to sign in…';
        } else if (error?.name === 'TimeoutError') {
          this.loadError = 'The itinerary service took too long to respond. Please retry.';
        } else {
          this.loadError = error?.error?.message || error?.message || 'Itineraries could not be loaded.';
        }
      },
    });
  }

  setView(view: 'explore' | 'saved' | 'bookings'): void {
    this.activeView = view;
    this.loadItineraries();
  }

  getCardImage(item: any): string {
    return getItineraryImage(item);
  }

  onDestinationSelected(place: string): void {
    this.destinationToast = `${place} selected. Browse the live routes below, then save or book the one that fits.`;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { destination: place },
      queryParamsHandling: 'merge',
    });
  }

  onRateLimitError(message: string): void {
    this.rateLimitMessage = message;
    setTimeout(() => { this.rateLimitMessage = ''; }, 5000);
  }
}
