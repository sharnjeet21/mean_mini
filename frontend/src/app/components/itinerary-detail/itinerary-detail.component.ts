import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AiService, BudgetEstimate, Flight, Hotel, RoutePlan, SmartPlan } from '../../services/ai.service';
import { ApiService, TripAnalysis } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { fetchItineraryImage, getItineraryImage } from '../../utils/itinerary-image';

@Component({
  selector: 'app-itinerary-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './itinerary-detail.component.html',
})
export class ItineraryDetailComponent implements OnInit {
  itinerary: any = null;
  analysis: TripAnalysis | null = null;
  loading = true;
  analysisLoading = true;
  actionLoading = '';
  actionMessage = '';
  errorMessage = '';
  imageUrl = '';
  openDay: number | null = 0;
  reviewRating = 5;
  reviewComment = '';
  readonly stars = [1, 2, 3, 4, 5];
  private platformId = inject(PLATFORM_ID);
  private itineraryId = '';

  // ── AI-enhanced feature state ─────────────────────────────────────────────
  // Route Planning
  routePlan: RoutePlan | null = null;
  routePlanLoading = false;
  routePlanError = '';
  routeOrigin = '';
  routeDest = '';
  routeStops = '';

  // Hotel Suggestions
  hotels: Hotel[] = [];
  hotelsLoading = false;
  hotelsError = '';

  // Budget Estimate
  budgetEstimate: BudgetEstimate | null = null;
  budgetLoading = false;
  budgetError = '';

  // Flight Info
  flights: Flight[] = [];
  flightsLoading = false;
  flightsError = '';

  // Smart Plan
  smartPlan: SmartPlan | null = null;
  smartPlanLoading = false;
  smartPlanError = '';
  smartPlanInterests = '';
  smartPlanDuration = 3;
  smartPlanTravelStyle = 'balanced';
  smartPlanTravelers = 1;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public auth: AuthService,
    private ai: AiService,
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    this.itineraryId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.itineraryId) {
      this.errorMessage = 'No itinerary was selected.';
      this.loading = false;
      return;
    }

    this.loadItinerary();
    this.loadAnalysis();
  }

  loadItinerary() {
    this.api.getItinerary(this.itineraryId).subscribe({
      next: (res) => {
        this.itinerary = res;
        const ownReview = (res.reviews || []).find((review: any) => (
          (review.userId?._id || review.userId) === this.auth.currentUser()?.id
        ));
        if (ownReview) {
          this.reviewRating = ownReview.rating;
          this.reviewComment = ownReview.comment || '';
        }
        this.imageUrl = getItineraryImage(res);

        // Auto-populate AI feature fields from itinerary data
        this.routeDest = res.destination || '';
        this.routeOrigin = '';
        this.smartPlanTravelers = res.travelerCount || 1;
        this.smartPlanDuration = parseInt(res.duration) || 3;

        // Fetch AI-powered image from Unsplash
        if (res.destination) {
          fetchItineraryImage(res.destination).then((url) => {
            this.imageUrl = url;
          });
        }

        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'This itinerary could not be loaded.';
        this.loading = false;
      },
    });
  }

  loadAnalysis() {
    this.analysisLoading = true;
    this.api.getTripAnalysis(this.itineraryId)
      .pipe(finalize(() => { this.analysisLoading = false; }))
      .subscribe({
        next: (analysis) => { this.analysis = analysis; },
        error: () => { this.analysis = null; },
      });
  }

  // ── Phase 2: Route Planning ───────────────────────────────────────────────
  loadRoutePlan() {
    if (!this.routeOrigin || !this.routeDest) {
      this.routePlanError = 'Please provide both origin and destination.';
      return;
    }
    this.routePlanLoading = true;
    this.routePlanError = '';
    this.routePlan = null;
    this.ai.getRoutePlan(this.routeOrigin, this.routeDest, this.routeStops || undefined)
      .pipe(finalize(() => { this.routePlanLoading = false; }))
      .subscribe({
        next: (plan) => { this.routePlan = plan; },
        error: (err) => {
          this.routePlanError = err?.message || 'Failed to load route plan.';
        },
      });
  }

  // ── Phase 3: Hotel Suggestions ────────────────────────────────────────────
  loadHotels() {
    if (!this.itinerary?.destination) return;
    this.hotelsLoading = true;
    this.hotelsError = '';
    this.hotels = [];
    this.ai.getHotelSuggestions(this.itinerary.destination, this.itinerary.budget || undefined)
      .pipe(finalize(() => { this.hotelsLoading = false; }))
      .subscribe({
        next: (hotels) => { this.hotels = hotels; },
        error: (err) => { this.hotelsError = err?.message || 'Failed to load hotels.'; },
      });
  }

  // ── Phase 3: Budget Estimate ──────────────────────────────────────────────
  loadBudgetEstimate() {
    if (!this.itinerary?.destination) return;
    this.budgetLoading = true;
    this.budgetError = '';
    this.budgetEstimate = null;
    this.ai.getBudgetEstimate({
      destination: this.itinerary.destination,
      duration: parseInt(this.itinerary.duration) || 3,
      travelerCount: this.itinerary.travelerCount || 1,
      travelStyle: this.itinerary.travelStyle || 'balanced',
    }).pipe(finalize(() => { this.budgetLoading = false; }))
      .subscribe({
        next: (est) => { this.budgetEstimate = est; },
        error: (err) => { this.budgetError = err?.message || 'Failed to estimate budget.'; },
      });
  }

  // ── Phase 4: Flight Info ──────────────────────────────────────────────────
  loadFlights() {
    if (!this.routeOrigin || !this.itinerary?.destination) {
      this.flightsError = 'Please provide origin city.';
      return;
    }
    this.flightsLoading = true;
    this.flightsError = '';
    this.flights = [];
    this.ai.getFlightInfo(this.routeOrigin, this.itinerary.destination)
      .pipe(finalize(() => { this.flightsLoading = false; }))
      .subscribe({
        next: (flights) => { this.flights = flights; },
        error: (err) => { this.flightsError = err?.message || 'Failed to load flights.'; },
      });
  }

  // ── Phase 4: Smart Plan ───────────────────────────────────────────────────
  loadSmartPlan() {
    if (!this.itinerary?.destination) return;
    this.smartPlanLoading = true;
    this.smartPlanError = '';
    this.smartPlan = null;
    const interests = this.smartPlanInterests
      ? this.smartPlanInterests.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    this.ai.getSmartPlan({
      destination: this.itinerary.destination,
      duration: this.smartPlanDuration,
      travelerCount: this.smartPlanTravelers,
      travelStyle: this.smartPlanTravelStyle,
      interests,
    }).pipe(finalize(() => { this.smartPlanLoading = false; }))
      .subscribe({
        next: (plan) => { this.smartPlan = plan; },
        error: (err) => { this.smartPlanError = err?.message || 'Failed to generate smart plan.'; },
      });
  }

  // ── Utility helpers ──────────────────────────────────────────────────────
  toggleDay(index: number) {
    this.openDay = this.openDay === index ? null : index;
  }

  toggleFavorite() {
    this.actionLoading = 'favorite';
    this.clearFeedback();
    this.api.toggleFavorite(this.itineraryId)
      .pipe(finalize(() => { this.actionLoading = ''; }))
      .subscribe({
        next: (res) => {
          this.itinerary.engagement.isFavorite = res.isFavorite;
          this.itinerary.engagement.favoriteCount = res.favoriteCount;
          this.actionMessage = res.message;
        },
        error: (err) => { this.errorMessage = err?.error?.message || 'Could not update your wishlist.'; },
      });
  }

  toggleBooking() {
    this.actionLoading = 'booking';
    this.clearFeedback();
    const request = this.itinerary.engagement?.hasBooked
      ? this.api.cancelBooking(this.itineraryId)
      : this.api.bookItinerary(this.itineraryId);

    request.pipe(finalize(() => { this.actionLoading = ''; })).subscribe({
      next: (res) => {
        this.itinerary.engagement.hasBooked = !this.itinerary.engagement.hasBooked;
        if (res.bookingCount !== undefined) this.itinerary.engagement.bookingCount = res.bookingCount;
        this.actionMessage = res.message;
      },
      error: (err) => { this.errorMessage = err?.error?.message || 'Could not update this booking.'; },
    });
  }

  submitReview() {
    this.actionLoading = 'review';
    this.clearFeedback();
    this.api.submitReview(this.itineraryId, this.reviewRating, this.reviewComment)
      .pipe(finalize(() => { this.actionLoading = ''; }))
      .subscribe({
        next: (res) => {
          this.itinerary.reviews = res.reviews;
          this.itinerary.engagement = { ...this.itinerary.engagement, ...res.engagement };
          this.actionMessage = res.message;
        },
        error: (err) => { this.errorMessage = err?.error?.message || 'Could not submit your review.'; },
      });
  }

  clearFeedback() {
    this.actionMessage = '';
    this.errorMessage = '';
  }

  scoreTone(score: number): string {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-200 border-emerald-400/20';
    if (score >= 60) return 'bg-amber-500/10 text-amber-100 border-amber-300/20';
    return 'bg-rose-500/10 text-rose-100 border-rose-300/20';
  }

  riskTone(severity: string): string {
    return severity === 'high'
      ? 'bg-rose-500/10 border-rose-300/20 text-rose-100'
      : 'bg-amber-500/10 border-amber-300/20 text-amber-100';
  }

  hotelTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      budget: 'savings',
      'mid-range': 'business_center',
      luxury: 'workspace_premium',
      boutique: 'spa',
    };
    return icons[type] || 'hotel';
  }

  getBudgetField(key: string): number {
    if (!this.budgetEstimate?.breakdown) return 0;
    const record = this.budgetEstimate.breakdown as Record<string, number>;
    return record[key] ?? 0;
  }
}