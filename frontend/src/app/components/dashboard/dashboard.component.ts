import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { DestinationSearchComponent } from '../destination-search/destination-search.component';
import { TrendingCardsComponent } from '../trending-cards/trending-cards.component';
import { getItineraryImage } from '../../utils/itinerary-image';

export interface Stop {
  name: string;
  notes: string;
}

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

  showModal = false;
  saving = false;
  formError = '';
  currentStep = 1;
  readonly TOTAL_STEPS = 4;
  readonly stepLabels = ['Basics', 'Dates', 'Budget', 'Stops'];

  private platformId = inject(PLATFORM_ID);

  form = this.emptyForm();

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    this.loadItineraries();
    const destination = this.route.snapshot.queryParamMap.get('destination') || '';
    const create = this.route.snapshot.queryParamMap.get('create') === '1';
    if ((destination || create) && this.auth.isAdmin) {
      setTimeout(() => this.openModal(destination), 200);
    } else if (destination) {
      this.destinationToast = `${destination} is ready to explore below. Save a route or ask a trip manager to publish a custom plan.`;
    }
  }

  private emptyForm(destination = '') {
    return {
      title: '',
      destination,
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
      stops: [] as Stop[],
    };
  }

  get stats() {
    const total = this.itineraries.length;
    const destinations = new Set(this.itineraries.map((item) => item.destination)).size;
    const averageBudget = total
      ? Math.round(this.itineraries.reduce((sum, item) => sum + (item.budget || 0), 0) / total)
      : 0;

    return [
      { icon: 'map', label: 'Total Itineraries', value: total, badge: 'All' },
      { icon: 'explore', label: 'Unique Destinations', value: destinations, badge: 'Global' },
      { icon: 'payments', label: 'Avg Budget', value: `$${averageBudget.toLocaleString()}`, badge: 'Avg' },
      {
        icon: 'favorite',
        label: 'Community Saves',
        value: this.itineraries.reduce((sum, item) => sum + (item.engagement?.favoriteCount || 0), 0),
        badge: 'Live',
      },
    ];
  }

  get sortedItineraries() {
    const list = [...this.itineraries];
    if (this.activeFilter === 'Budget') return list.sort((a, b) => (a.budget || 0) - (b.budget || 0));
    if (this.activeFilter === 'Duration') return list.sort((a, b) => String(a.duration).localeCompare(String(b.duration)));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  get calculatedDuration(): string {
    if (!this.form.startDate || !this.form.endDate) return '';
    const start = new Date(this.form.startDate);
    const end = new Date(this.form.endDate);
    if (end < start) return '';
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const nights = Math.max(0, days - 1);
    return nights ? `${days} Days / ${nights} Nights` : '1 Day';
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

  openModal(prefilledDestination = ''): void {
    if (!this.auth.isAdmin) {
      this.rateLimitMessage = 'Publishing itineraries is available to trip managers. You can still save and book live routes.';
      return;
    }
    this.form = this.emptyForm(prefilledDestination);
    this.formError = '';
    this.currentStep = 1;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.currentStep = 1;
  }

  nextStep(): void {
    if (!this.validateStep(this.currentStep)) return;
    if (this.currentStep === 2) this.form.duration = this.calculatedDuration;
    if (this.currentStep < this.TOTAL_STEPS) this.currentStep += 1;
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep -= 1;
    this.formError = '';
  }

  validateStep(step: number): boolean {
    this.formError = '';
    if (step === 1 && (!this.form.title.trim() || !this.form.destination.trim())) {
      this.formError = 'Enter a trip title and primary destination.';
      return false;
    }
    if (step === 2) {
      if (!this.form.startDate || !this.form.endDate) {
        this.formError = 'Select both travel dates.';
        return false;
      }
      if (!this.calculatedDuration) {
        this.formError = 'End date must be on or after the start date.';
        return false;
      }
    }
    if (step === 3 && (!this.form.budget || this.form.budget <= 0)) {
      this.formError = 'Enter a valid total budget.';
      return false;
    }
    return true;
  }

  updateDuration(): void {
    this.form.duration = this.calculatedDuration;
  }

  allocateBudget(): void {
    const total = Number(this.form.budget) || 0;
    const transport = Math.round(total * 0.25);
    const accommodation = Math.round(total * 0.35);
    const food = Math.round(total * 0.2);
    const activities = Math.round(total * 0.1);
    this.form.budgetBreakdown = {
      transport,
      accommodation,
      food,
      activities,
      contingency: total - transport - accommodation - food - activities,
    };
  }

  addStop(): void {
    this.form.stops.push({ name: '', notes: '' });
  }

  removeStop(index: number): void {
    this.form.stops.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  submitCreate(): void {
    if (!this.validateStep(this.currentStep)) return;
    this.form.duration = this.form.duration || this.calculatedDuration || '1 Day';
    this.saving = true;
    this.formError = '';

    const payload = {
      ...this.form,
      budget: Number(this.form.budget),
      stops: this.form.stops.filter((stop) => stop.name.trim()),
    };

    this.api.createItinerary(payload).pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (created) => {
        this.itineraries.unshift(created);
        this.showModal = false;
      },
      error: (error) => {
        this.formError = error?.error?.message || error?.message || 'Failed to create itinerary.';
      },
    });
  }

  getCardImage(item: any): string {
    return getItineraryImage(item);
  }

  onDestinationSelected(place: string): void {
    if (this.auth.isAdmin) {
      this.openModal(place);
    } else {
      this.destinationToast = `${place} selected. Browse the live routes below, then save or book the one that fits.`;
    }
  }

  onRateLimitError(message: string): void {
    this.rateLimitMessage = message;
    setTimeout(() => { this.rateLimitMessage = ''; }, 5000);
  }
}
