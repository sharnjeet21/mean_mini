import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ApiService, TripAnalysis } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { getItineraryImage } from '../../utils/itinerary-image';

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

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
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
        this.imageUrl = getItineraryImage(res);
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
}
