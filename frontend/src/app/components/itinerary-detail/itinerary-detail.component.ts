import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
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
  private cdr = inject(ChangeDetectorRef);
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

  // AI Refinement / Revision
  revisionInstruction = '';
  revisedItineraryPreview: any = null;
  revisionLoading = false;
  revisionError = '';
  changeSummary: string[] = [];
  isSavingRevision = false;

  // Manual editing state
  editMode = false;
  editItinerary: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    public auth: AuthService,
    private ai: AiService,
    private location: Location,
  ) {}

  goBack(): void {
    if (history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  get canEdit(): boolean {
    if (!this.itinerary) return false;
    const isOwner = this.itinerary.createdBy && (this.itinerary.createdBy._id || this.itinerary.createdBy) === this.auth.currentUser()?.id;
    const isAdmin = ['admin', 'superadmin'].includes(this.auth.currentUser()?.role || '');
    return !!(isOwner || isAdmin);
  }

  get canEditDetailed(): boolean {
    if (!this.itinerary) return false;
    const isOwner = this.itinerary.createdBy && (this.itinerary.createdBy._id || this.itinerary.createdBy) === this.auth.currentUser()?.id;
    const role = this.auth.currentUser()?.role || '';
    const isAdmin = ['admin', 'superadmin'].includes(role);
    const isTripManager = role === 'trip-manager';
    return !!(isAdmin || (isTripManager && isOwner));
  }

  startEditing() {
    this.editItinerary = JSON.parse(JSON.stringify(this.itinerary));
    this.editMode = true;
  }

  cancelEditing() {
    const currentJson = JSON.stringify(this.itinerary);
    const editJson = JSON.stringify(this.editItinerary);
    // Compare only content fields to see if dirty
    if (currentJson !== editJson) {
      if (!confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        return;
      }
    }
    this.editMode = false;
    this.editItinerary = null;
  }

  addDay() {
    if (!this.editItinerary) return;
    if (!this.editItinerary.dailyPlan) {
      this.editItinerary.dailyPlan = [];
    }
    const nextDayNum = this.editItinerary.dailyPlan.length + 1;
    this.editItinerary.dailyPlan.push({
      day: nextDayNum,
      title: 'New Day',
      activities: []
    });
    this.editItinerary.duration = `${nextDayNum} day` + (nextDayNum > 1 ? 's' : '');
  }

  removeDay(index: number) {
    if (!this.editItinerary || !this.editItinerary.dailyPlan) return;
    if (confirm(`Are you sure you want to remove Day ${this.editItinerary.dailyPlan[index].day || (index + 1)}?`)) {
      this.editItinerary.dailyPlan.splice(index, 1);
      this.editItinerary.dailyPlan.forEach((d: any, i: number) => {
        d.day = i + 1;
      });
      const nextDayNum = this.editItinerary.dailyPlan.length;
      this.editItinerary.duration = `${nextDayNum} day` + (nextDayNum > 1 ? 's' : '');
    }
  }

  addActivity(dayIndex: number) {
    if (!this.editItinerary || !this.editItinerary.dailyPlan) return;
    const day = this.editItinerary.dailyPlan[dayIndex];
    if (!day.activities) {
      day.activities = [];
    }
    day.activities.push({
      time: '09:00 AM',
      activity: 'New Activity',
      description: '',
      location: '',
      category: 'leisure',
      suggestedDuration: '1h',
      whyThisStop: ''
    });
  }

  removeActivity(dayIndex: number, actIndex: number) {
    if (!this.editItinerary || !this.editItinerary.dailyPlan) return;
    const day = this.editItinerary.dailyPlan[dayIndex];
    if (!day.activities) return;
    if (confirm('Are you sure you want to remove this activity?')) {
      day.activities.splice(actIndex, 1);
    }
  }

  moveActivity(dayIndex: number, actIndex: number, direction: 'up' | 'down') {
    if (!this.editItinerary || !this.editItinerary.dailyPlan) return;
    const day = this.editItinerary.dailyPlan[dayIndex];
    if (!day.activities) return;
    const targetIndex = direction === 'up' ? actIndex - 1 : actIndex + 1;
    if (targetIndex < 0 || targetIndex >= day.activities.length) return;
    
    const temp = day.activities[actIndex];
    day.activities[actIndex] = day.activities[targetIndex];
    day.activities[targetIndex] = temp;
  }

  saveChanges() {
    if (!this.editItinerary) return;
    
    if (!this.editItinerary.title || !this.editItinerary.title.trim()) {
      alert('Title cannot be empty.');
      return;
    }
    if (!this.editItinerary.destination || !this.editItinerary.destination.trim()) {
      alert('Destination cannot be empty.');
      return;
    }
    if (this.editItinerary.budget !== undefined && this.editItinerary.budget !== null && this.editItinerary.budget < 0) {
      alert('Budget cannot be negative.');
      return;
    }
    if (this.editItinerary.travelerCount !== undefined && this.editItinerary.travelerCount !== null && this.editItinerary.travelerCount < 1) {
      alert('Traveler count must be at least 1.');
      return;
    }
    if (this.editItinerary.dailyPlan) {
      for (const day of this.editItinerary.dailyPlan) {
        if (!day.title || !day.title.trim()) {
          alert(`Day ${day.day} must have a title.`);
          return;
        }
        if (day.activities) {
          for (let j = 0; j < day.activities.length; j++) {
            const act = day.activities[j];
            if (!act.activity || !act.activity.trim()) {
              alert(`Activity ${j + 1} on Day ${day.day} must have a name.`);
              return;
            }
          }
        }
      }
    }

    this.actionLoading = 'save';
    this.clearFeedback();
    
    const payload = {
      ...this.editItinerary,
      updatedAt: this.itinerary.updatedAt,
      __v: this.itinerary.__v
    };

    this.api.updateItinerary(this.itineraryId, payload)
      .pipe(finalize(() => { this.actionLoading = ''; this.cdr.detectChanges(); }))
      .subscribe({
        next: (updated) => {
          this.itinerary = updated;
          this.imageUrl = getItineraryImage(updated);
          this.editMode = false;
          this.editItinerary = null;
          this.actionMessage = 'Itinerary updated successfully.';
          this.loadAnalysis();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || err?.message || 'Failed to save changes.';
          if (err?.status === 409) {
            alert('Conflict error: ' + this.errorMessage);
          }
        }
      });
  }

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



        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'This itinerary could not be loaded.';
        this.loading = false;
        this.cdr.detectChanges();
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

  // ── AI Refinement / Revision ──────────────────────────────────────────────
  applyChip(chipText: string) {
    this.revisionInstruction = chipText;
  }

  previewRevision() {
    if (!this.revisionInstruction || !this.revisionInstruction.trim()) return;
    this.revisionLoading = true;
    this.revisionError = '';
    this.revisedItineraryPreview = null;
    this.changeSummary = [];

    this.ai.previewItineraryRevision(this.itineraryId, this.revisionInstruction)
      .pipe(finalize(() => { this.revisionLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (preview) => {
          this.revisedItineraryPreview = preview;
          this.changeSummary = this.calculateChangeSummary(this.itinerary, preview);
        },
        error: (err) => {
          if (err?.status === 408 || err?.name === 'TimeoutError' || String(err?.message || '').toLowerCase().includes('time out') || String(err?.message || '').toLowerCase().includes('timeout')) {
            this.revisionError = 'The local AI planner took too long to respond. Your edit instruction has been preserved. Try again.';
          } else {
            this.revisionError = err?.error?.message || err?.message || 'Failed to preview revision.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  applyRevision() {
    if (!this.revisedItineraryPreview) return;
    this.isSavingRevision = true;
    this.revisionError = '';

    const payload = {
      title: this.revisedItineraryPreview.title,
      destination: this.revisedItineraryPreview.destination,
      duration: this.revisedItineraryPreview.duration,
      budget: this.revisedItineraryPreview.budget,
      description: this.revisedItineraryPreview.description,
      dailyPlan: this.revisedItineraryPreview.dailyPlan,
      tripSummary: this.revisedItineraryPreview.tripSummary
    };

    this.api.updateItinerary(this.itineraryId, payload)
      .pipe(finalize(() => { this.isSavingRevision = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (updated) => {
          this.itinerary = updated;
          this.revisedItineraryPreview = null;
          this.revisionInstruction = '';
          this.changeSummary = [];
          this.imageUrl = getItineraryImage(updated);
        },
        error: (err) => {
          this.revisionError = err?.error?.message || err?.message || 'Failed to apply revision.';
        }
      });
  }

  discardRevision() {
    this.revisedItineraryPreview = null;
    this.changeSummary = [];
  }

  calculateChangeSummary(original: any, revised: any): string[] {
    const summary: string[] = [];
    if (Number(original.budget) !== Number(revised.budget)) {
      summary.push(`Budget updated from $${original.budget} to $${revised.budget}`);
    }
    if (original.travelerCount !== revised.travelerCount) {
      summary.push(`Traveler count updated from ${original.travelerCount} to ${revised.travelerCount}`);
    }
    if (original.duration !== revised.duration) {
      summary.push(`Duration updated from ${original.duration} to ${revised.duration}`);
    }
    if (original.description !== revised.description) {
      summary.push('Trip overview updated');
    }
    
    const origDays = original.dailyPlan || [];
    const revDays = revised.dailyPlan || [];
    const maxDays = Math.max(origDays.length, revDays.length);
    
    for (let i = 0; i < maxDays; i++) {
      const origDay = origDays[i];
      const revDay = revDays[i];
      if (!origDay && revDay) {
        summary.push(`Day ${revDay.day || (i + 1)} added`);
        continue;
      }
      if (origDay && !revDay) {
        summary.push(`Day ${origDay.day || (i + 1)} removed`);
        continue;
      }
      
      const origActivities = JSON.stringify(origDay.activities || []);
      const revActivities = JSON.stringify(revDay.activities || []);
      if (origDay.title !== revDay.title || origActivities !== revActivities) {
        summary.push(`Day ${origDay.day || (i + 1)} updated`);
      }
    }
    
    return summary;
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