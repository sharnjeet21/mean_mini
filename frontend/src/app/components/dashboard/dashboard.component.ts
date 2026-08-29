import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { DestinationSearchComponent } from '../destination-search/destination-search.component';
import { TrendingCardsComponent } from '../trending-cards/trending-cards.component';
import { getItineraryImage } from '../../utils/itinerary-image';
import { ToastService } from '../../services/toast.service';
import { AppCurrencyPipe } from '../../pipes/app-currency.pipe';

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
    AppCurrencyPipe,
  ],
  templateUrl: './dashboard.component.html',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  itineraries: any[] = [];
  loading = true;
  activeFilter = 'createdAt_desc';
  filters = [
    { label: 'Newest', value: 'createdAt_desc' },
    { label: 'Budget (Low)', value: 'budget_asc' },
    { label: 'Budget (High)', value: 'budget_desc' },
  ];
  filterOptions = {
    budgetMin: '',
    budgetMax: '',
    category: '',
    style: '',
    destination: ''
  };
  activeView: 'explore' | 'saved' | 'bookings' = 'explore';
  rateLimitMessage = '';
  loadError = '';
  destinationToast = '';
  
  currentPage = 1;
  limit = 6;
  hasMore = false;
 
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
      this.filterOptions.destination = destination;
      this.destinationToast = `${destination} is ready to explore below. Save a route or book your travel logistics to get started.`;
    }
  }
 
  get sortedItineraries() {
    return this.itineraries;
  }
 
  loadItineraries(append = false): void {
    if (!append) {
      this.loading = true;
      this.loadError = '';
      this.currentPage = 1;
    }
     
    let request;
    if (this.activeView === 'saved') {
      request = this.api.getFavorites();
    } else if (this.activeView === 'bookings') {
      request = this.api.getUserBookings();
    } else {
      const filters = {
        sort: this.activeFilter,
        page: this.currentPage,
        limit: this.limit,
        ...this.filterOptions
      };
      request = this.api.getItineraries(filters);
    }
 
    request.pipe(
      timeout(12000),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (result) => {
        if (this.activeView === 'explore') {
          const fetchedData = result && result.data ? result.data : [];
          this.hasMore = result && result.hasMore !== undefined ? result.hasMore : false;
          if (append) {
            this.itineraries = [...this.itineraries, ...fetchedData];
          } else {
            this.itineraries = fetchedData;
          }
        } else {
          this.itineraries = Array.isArray(result) ? result : [];
          this.hasMore = false;
        }
      },
      error: (error) => {
        if (!append) {
          this.itineraries = [];
        }
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
 
  loadMore(): void {
    if (this.hasMore && !this.loading) {
      this.currentPage++;
      this.loadItineraries(true);
    }
  }
 
  setView(view: 'explore' | 'saved' | 'bookings'): void {
    this.activeView = view;
    this.currentPage = 1;
    this.loadItineraries();
  }
 
  applyFilters(): void {
    if (this.activeView === 'explore') {
      this.currentPage = 1;
      this.loadItineraries();
    }
  }
 
  clearFilters(): void {
    this.filterOptions = {
      budgetMin: '',
      budgetMax: '',
      category: '',
      style: '',
      destination: ''
    };
    if (this.activeView === 'explore') {
      this.currentPage = 1;
      this.loadItineraries();
    }
  }

  getCardImage(item: any): string {
    return getItineraryImage(item);
  }

  onDestinationSelected(place: string): void {
    this.filterOptions.destination = place;
    this.destinationToast = `${place} selected. Browse the live routes below, then save or book the one that fits.`;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { destination: place },
      queryParamsHandling: 'merge',
    });
    if (this.activeView === 'explore') {
      this.loadItineraries();
    }
  }

  onRateLimitError(message: string): void {
    this.rateLimitMessage = message;
    setTimeout(() => { this.rateLimitMessage = ''; }, 5000);
  }
}
