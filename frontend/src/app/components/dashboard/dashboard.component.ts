import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { DestinationSearchComponent } from '../destination-search/destination-search.component';
import { TrendingCardsComponent } from '../trending-cards/trending-cards.component';

export interface Stop {
  name: string;
  notes: string;
}

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
  destinationToast = '';
  private platformId = inject(PLATFORM_ID);

  // ── Wizard state ─────────────────────────────────────────────────────────────
  showModal = false;
  saving    = false;
  formError = '';
  currentStep = 1;
  readonly TOTAL_STEPS = 4;

  form = {
    title:       '',
    destination: '',
    startDate:   '',
    endDate:     '',
    duration:    '',
    budget:      null as number | null,
    description: '',
    stops:       [] as Stop[],   // additional stops beyond the primary destination
  };

  // ── Computed stats ────────────────────────────────────────────────────────────
  get stats() {
    const total        = this.itineraries.length;
    const destinations = new Set(this.itineraries.map(i => i.destination)).size;
    const avgBudget    = total
      ? Math.round(this.itineraries.reduce((s, i) => s + (i.budget || 0), 0) / total)
      : 0;
    return [
      { icon: 'map',      label: 'Total Itineraries',   value: total,                           badge: 'All',    badgeColor: '#835100', iconStyle: 'color:#3953bd; background:#dde1ff' },
      { icon: 'explore',  label: 'Unique Destinations', value: destinations,                    badge: 'Global', badgeColor: '#3953bd', iconStyle: 'color:#754aa1; background:#f0dbff' },
      { icon: 'payments', label: 'Avg Budget',          value: `$${avgBudget.toLocaleString()}`, badge: 'Avg',    badgeColor: '#444653', iconStyle: 'color:#835100; background:#ffddb9' },
    ];
  }

  get sortedItineraries() {
    const list = [...this.itineraries];
    if (this.activeFilter === 'Budget')   return list.sort((a, b) => (a.budget || 0) - (b.budget || 0));
    if (this.activeFilter === 'Duration') return list.sort((a, b) => String(a.duration).localeCompare(String(b.duration)));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /** Auto-calculated duration label from date inputs */
  get calculatedDuration(): string {
    if (!this.form.startDate || !this.form.endDate) return '';
    const start = new Date(this.form.startDate);
    const end   = new Date(this.form.endDate);
    const days  = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return '';
    const nights = days - 1;
    return nights > 0 ? `${days} Days / ${nights} Nights` : `${days} Day`;
  }

  /** Step label for progress indicator */
  get stepLabels(): string[] {
    return ['Basics', 'Dates', 'Budget', 'Stops'];
  }

  constructor(
    public auth: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) { this.loading = false; return; }
    this.loadItineraries();

    // If navigated from homepage "Plan This Trip" — pre-fill destination and open wizard
    const dest = this.route.snapshot.queryParamMap.get('destination');
    if (dest) {
      setTimeout(() => {
        this.openModal(dest);
        this.cdr.detectChanges();
      }, 300);
    }
  }

  loadItineraries() {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiUrl}/api/itinerary`).subscribe({
      next:  (res) => { this.itineraries = Array.isArray(res) ? res : []; this.loading = false; },
      error: ()    => { this.itineraries = [];                             this.loading = false; },
    });
  }

  // ── Wizard open / close ───────────────────────────────────────────────────────

  openModal(prefilledDestination = '') {
    this.form = {
      title:       '',
      destination: prefilledDestination,
      startDate:   '',
      endDate:     '',
      duration:    '',
      budget:      null,
      description: '',
      stops:       [],
    };
    this.formError   = '';
    this.currentStep = 1;
    this.showModal   = true;
  }

  closeModal() {
    this.showModal = false;
    this.currentStep = 1;
  }

  // ── Step navigation ───────────────────────────────────────────────────────────

  nextStep() {
    if (!this.validateStep(this.currentStep)) return;
    // Auto-calculate duration when leaving step 2
    if (this.currentStep === 2 && this.calculatedDuration) {
      this.form.duration = this.calculatedDuration;
    }
    if (this.currentStep < this.TOTAL_STEPS) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
    this.formError = '';
  }

  validateStep(step: number): boolean {
    this.formError = '';
    switch (step) {
      case 1:
        if (!this.form.title.trim())       { this.formError = 'Please enter a trip title.';          return false; }
        if (!this.form.destination.trim()) { this.formError = 'Please enter a primary destination.'; return false; }
        return true;
      case 2:
        if (!this.form.startDate) { this.formError = 'Please select a start date.'; return false; }
        if (!this.form.endDate)   { this.formError = 'Please select an end date.';  return false; }
        if (new Date(this.form.endDate) <= new Date(this.form.startDate)) {
          this.formError = 'End date must be after start date.'; return false;
        }
        return true;
      case 3:
        if (!this.form.budget || this.form.budget <= 0) { this.formError = 'Please enter a valid budget.'; return false; }
        return true;
      default:
        return true;
    }
  }

  // ── Stops management ─────────────────────────────────────────────────────────

  addStop() {
    this.form.stops.push({ name: '', notes: '' });
  }

  removeStop(index: number) {
    this.form.stops.splice(index, 1);
  }

  trackByIndex(index: number) { return index; }

  // ── Submit ────────────────────────────────────────────────────────────────────

  submitCreate() {
    if (!this.validateStep(this.currentStep)) return;
    if (!this.form.duration) this.form.duration = this.calculatedDuration || '1 Day';

    this.saving    = true;
    this.formError = '';

    const payload = {
      ...this.form,
      stops: this.form.stops.filter(s => s.name.trim()),
    };

    this.http.post<any>(`${environment.apiUrl}/api/itinerary`, payload).subscribe({
      next: (res) => {
        this.itineraries.unshift(res);
        this.saving    = false;
        this.showModal = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.formError = err?.error?.message || err?.message || 'Failed to create itinerary.';
        this.saving    = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── AI destination selection (from search / trending) ─────────────────────────

  onDestinationSelected(place: string): void {
    // Open wizard directly with destination pre-filled — same UX as "Plan This Trip" on homepage
    this.openModal(place);
  }

  onRateLimitError(message: string): void {
    this.rateLimitMessage = message;
    setTimeout(() => { this.rateLimitMessage = ''; }, 5000);
  }
}
