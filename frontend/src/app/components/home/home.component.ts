import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AiService, Attraction, TrendingDestination } from '../../services/ai.service';
import { TrendingCardsComponent } from '../trending-cards/trending-cards.component';

export interface FeaturedCard {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  duration: string;
  price: string;
  imageUrl: string;
  // AI-loaded preview fields
  attractions: Attraction[];
  attractionsLoading: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TrendingCardsComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  heroImageUrl = '';

  featuredCards: FeaturedCard[] = [
    { key: 'Kyoto Japan',    icon: 'temple_buddhist', title: 'The Zen of Kyoto',   subtitle: 'Culture, Cuisine & Traditions',     duration: '12 Days', price: '$3,200', imageUrl: '', attractions: [], attractionsLoading: false },
    { key: 'Santorini',     icon: 'sailing',          title: 'Cyclades Serenity',  subtitle: 'Luxury Yachting & Island Hopping',  duration: '7 Days',  price: '$4,850', imageUrl: '', attractions: [], attractionsLoading: false },
    { key: 'Swiss Alps',    icon: 'landscape',         title: 'Alpine Elevation',   subtitle: 'Luxury Lodges & Peak Adventures',   duration: '9 Days',  price: '$5,100', imageUrl: '', attractions: [], attractionsLoading: false },
  ];

  features = [
    { icon: 'map',                  color: '#3953bd', bg: '#dde1ff', title: 'Professional Itineraries', desc: 'Expert-level route mapping and time-management schedules tailored to your pace and style.' },
    { icon: 'auto_awesome',         color: '#754aa1', bg: '#f0dbff', title: 'AI-Powered Suggestions',   desc: 'Gemini AI curates top attractions, local tips, and personalised recommendations in seconds.' },
    { icon: 'admin_panel_settings', color: '#835100', bg: '#ffddb9', title: 'Admin Management',          desc: 'Full-suite controls for agents and group leaders. Manage multiple trips with enterprise-grade visibility.' },
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
    this.loadHeroImage();
    this.loadCardImages();
    // Pre-load attractions for all cards in background so the modal opens instantly
    this.featuredCards.forEach((_, i) => this.loadAttractionsForCard(i));
  }

  private loadHeroImage(): void {
    this.aiService.getDestinationImage('scenic travel landscape mountains ocean').subscribe(res => {
      if (res.url) { this.heroImageUrl = res.url; this.cdr.detectChanges(); }
    });
  }

  private loadCardImages(): void {
    this.featuredCards.forEach((card, i) => {
      this.aiService.getDestinationImage(card.key).subscribe(res => {
        if (res.url) { this.featuredCards[i].imageUrl = res.url; this.cdr.detectChanges(); }
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

  // ── Public handlers ───────────────────────────────────────────────────────────

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

  /** Called when a trending card is clicked on the homepage */
  onTrendingSelect(destination: string): void {
    // Create a synthetic preview card for the trending destination
    const synthetic: FeaturedCard = {
      key: destination,
      icon: 'travel_explore',
      title: destination,
      subtitle: 'Trending in 2026',
      duration: '—',
      price: '—',
      imageUrl: '',
      attractions: [],
      attractionsLoading: true,
    };
    this.previewCard = synthetic;
    this.showPreviewModal = true;
    document.body.style.overflow = 'hidden';

    // Load image and attractions in parallel
    this.aiService.getDestinationImage(destination).subscribe(res => {
      if (this.previewCard?.key === destination && res.url) {
        this.previewCard.imageUrl = res.url;
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

  /** Navigate to dashboard with destination pre-selected for planning */
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
