import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ApiService, TripAnalysis } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AiService } from '../../services/ai.service';

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

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private ai: AiService,
    public auth: AuthService,
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
        this.loading = false;
        this.loadDestinationImage(res.destination);
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

  loadDestinationImage(destination: string) {
    if (!destination) return;
    this.ai.getDestinationImage(destination).subscribe({
      next: (res) => { this.imageUrl = res.url; },
      error: () => { this.imageUrl = ''; },
    });
  }

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
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  }

  riskTone(severity: string): string {
    return severity === 'high'
      ? 'bg-rose-50 border-rose-200 text-rose-800'
      : 'bg-amber-50 border-amber-200 text-amber-800';
  }
}
