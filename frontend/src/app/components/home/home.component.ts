import { Component, OnInit, OnDestroy, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../services/auth.service';
import { AiService, Attraction } from '../../services/ai.service';
import { TrendingCardsComponent } from '../trending-cards/trending-cards.component';

export interface FeaturedCard {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  duration: string;
  price: string;
  image: string;
  imageUrl: string;
  accent: string;
  attractions: Attraction[];
  attractionsLoading: boolean;
}

// Slide config — images fetched from Unsplash, fallback gradient used until loaded
const SLIDE_QUERIES = [
  'aerial beach ocean tropical travel',
  'mountain alpine sunset landscape',
  'ancient temple japan culture',
  'european city river architecture',
  'safari africa wildlife sunset',
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatChipsModule, TrendingCardsComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  // ── Slideshow state ───────────────────────────────────────────────────────────
  slideUrls: string[] = [];
  activeSlide = 0;
  private slideshowTimer: any = null;
  readonly SLIDE_INTERVAL_MS = 5000;

  featuredCards: FeaturedCard[] = [
    { key: 'Kyoto Japan', icon: 'temple_buddhist', title: 'The Zen of Kyoto', subtitle: 'Lantern-lit lanes, temple mornings and a food-first route.', duration: '12 days', price: '$3,200', image: '/images/kyoto.jpg', imageUrl: '/images/kyoto.jpg', accent: '#ff9b7d', attractions: [], attractionsLoading: false },
    { key: 'Santorini', icon: 'sailing', title: 'Cyclades Serenity', subtitle: 'Sun-washed villages, hidden coves and slow island days.', duration: '7 days', price: '$4,850', image: '/images/santorini.jpg', imageUrl: '/images/santorini.jpg', accent: '#7ae0c3', attractions: [], attractionsLoading: false },
    { key: 'Swiss Alps', icon: 'landscape', title: 'Alpine Elevation', subtitle: 'Glass-blue lakes, mountain rail and cinematic lodges.', duration: '9 days', price: '$5,100', image: '/images/alps.jpg', imageUrl: '/images/alps.jpg', accent: '#ffc96b', attractions: [], attractionsLoading: false },
  ];

  features = [
    { icon: 'route', title: 'Plans that breathe', desc: 'Routes adapt to your pace, budget and travel style without turning every day into a checklist.' },
    { icon: 'neurology', title: 'Explainable intelligence', desc: 'See feasibility, budget quality and planning risks before they become expensive surprises.' },
    { icon: 'travel', title: 'One calm workspace', desc: 'Discover, compare, save, book and review itineraries without losing the story of the trip.' },
  ];

  stats = [
    { value: '42K+', label: 'routes explored' },
    { value: '91%', label: 'plan confidence' },
    { value: '4.9', label: 'traveler rating' },
  ];

  // ── Preview modal ─────────────────────────────────────────────────────────────
  showPreviewModal = false;
  previewCard: FeaturedCard | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private aiService: AiService,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadSlideshow();
    this.loadCardImages();
    this.featuredCards.forEach((_, i) => this.loadAttractionsForCard(i));
  }

  ngOnDestroy(): void {
    this.clearSlideshow();
  }

  // ── Slideshow ─────────────────────────────────────────────────────────────────

  private loadSlideshow(): void {
    // Initialize with empty slots so the gradient shows first
    this.slideUrls = new Array(SLIDE_QUERIES.length).fill('');

    SLIDE_QUERIES.forEach((query, i) => {
      this.aiService.getDestinationImage(query).subscribe(res => {
        if (res.url) {
          this.slideUrls[i] = res.url;
          // Start timer only after the first image arrives
          if (i === 0 && !this.slideshowTimer) this.startSlideshow();
          this.cdr.detectChanges();
        }
      });
    });
  }

  private startSlideshow(): void {
    this.slideshowTimer = setInterval(() => {
      this.nextSlide();
    }, this.SLIDE_INTERVAL_MS);
  }

  private clearSlideshow(): void {
    if (this.slideshowTimer) { clearInterval(this.slideshowTimer); this.slideshowTimer = null; }
  }

  nextSlide(): void {
    this.activeSlide = (this.activeSlide + 1) % SLIDE_QUERIES.length;
    this.cdr.detectChanges();
  }

  goToSlide(i: number): void {
    this.clearSlideshow();
    this.activeSlide = i;
    this.cdr.detectChanges();
    this.startSlideshow(); // restart timer from this slide
  }

  get currentHeroUrl(): string {
    return this.slideUrls[this.activeSlide] || '';
  }

  // ── Card images ───────────────────────────────────────────────────────────────

  private loadCardImages(): void {
    this.featuredCards.forEach((card, i) => {
      this.aiService.getDestinationImage(card.key).subscribe(res => {
        if (res.url) {
          this.featuredCards[i].imageUrl = res.url;
          this.featuredCards[i].image = res.url;
          this.cdr.detectChanges();
        }
      });
    });
  }

  private loadAttractionsForCard(index: number): void {
    const card = this.featuredCards[index];
    card.attractionsLoading = true;
    this.aiService.getItinerarySuggestions(card.key).subscribe({
      next: (results) => {
        this.featuredCards[index].attractions = results;
        this.featuredCards[index].attractionsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.featuredCards[index].attractionsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Preview modal ─────────────────────────────────────────────────────────────

  openPreview(card: FeaturedCard): void {
    this.previewCard = card;
    this.showPreviewModal = true;
    document.body.style.overflow = 'hidden';
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.previewCard = null;
    document.body.style.overflow = '';
  }

  onTrendingSelect(destination: string): void {
    const synthetic: FeaturedCard = {
      key: destination,
      icon: 'travel_explore',
      title: destination,
      subtitle: 'Trending in 2026',
      duration: '—',
      price: '—',
      image: '/images/alps.jpg',
      imageUrl: '',
      accent: '#7ae0c3',
      attractions: [],
      attractionsLoading: true,
    };
    this.previewCard = synthetic;
    this.showPreviewModal = true;
    document.body.style.overflow = 'hidden';

    this.aiService.getDestinationImage(destination).subscribe(res => {
      if (this.previewCard?.key === destination && res.url) {
        this.previewCard.imageUrl = res.url;
        this.previewCard.image = res.url;
        this.cdr.detectChanges();
      }
    });
    this.aiService.getItinerarySuggestions(destination).subscribe({
      next: (results) => {
        if (this.previewCard?.key === destination) {
          this.previewCard.attractions = results;
          this.previewCard.attractionsLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        if (this.previewCard?.key === destination) {
          this.previewCard.attractionsLoading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  planThisTrip(): void {
    const dest = this.previewCard?.key || '';
    this.closePreview();
    this.router.navigate([this.auth.isLoggedIn ? '/dashboard' : '/register'], {
      queryParams: dest ? { destination: dest } : {}
    });
  }

  onStartPlanning(): void {
    this.router.navigate([this.auth.isLoggedIn ? '/dashboard' : '/register']);
  }
}
