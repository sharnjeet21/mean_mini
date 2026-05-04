import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  heroImageUrl = '';

  featuredCards = [
    { key: 'Kyoto',      icon: 'temple_buddhist', title: 'The Zen of Kyoto',    subtitle: 'Culture, Cuisine & Traditions',          duration: '12 Days', price: '$3,200', imageUrl: '' },
    { key: 'Santorini',  icon: 'sailing',          title: 'Cyclades Serenity',  subtitle: 'Luxury Yachting & Island Hopping',        duration: '7 Days',  price: '$4,850', imageUrl: '' },
    { key: 'Swiss Alps', icon: 'landscape',         title: 'Alpine Elevation',   subtitle: 'Luxury Lodges & Peak Adventures',         duration: '9 Days',  price: '$5,100', imageUrl: '' },
  ];

  features = [
    { icon: 'map',                  title: 'Professional Itineraries', desc: 'Access expert-level route mapping and time-management schedules tailored to your pace and style.' },
    { icon: 'bolt',                 title: 'One-Click Booking',         desc: 'Seamlessly transition from planning to reality. Book flights, stays, and activities in a single, unified flow.' },
    { icon: 'admin_panel_settings', title: 'Admin Management',          desc: 'Full-suite controls for agents and group leaders. Manage multiple trips with enterprise-grade visibility.' },
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private aiService: AiService,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadImages();
  }

  private loadImages(): void {
    // Hero background
    this.aiService.getDestinationImage('travel mountains ocean adventure').subscribe(res => {
      if (res.url) this.heroImageUrl = res.url;
    });

    // Featured cards
    this.featuredCards.forEach((card, i) => {
      this.aiService.getDestinationImage(card.key).subscribe(res => {
        if (res.url) this.featuredCards[i].imageUrl = res.url;
      });
    });
  }

  onStartPlanning() {
    this.router.navigate([this.auth.isLoggedIn ? '/dashboard' : '/register']);
  }
}
