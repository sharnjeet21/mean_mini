import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiService, TrendingDestination } from '../../services/ai.service';

@Component({
  selector: 'app-trending-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trending-cards.component.html',
})
export class TrendingCardsComponent implements OnInit {
  @Output() destinationSelected = new EventEmitter<string>();

  destinations: TrendingDestination[] = [];
  loading = false;
  error = '';
  private readonly fallbackImages = [
    '/images/santorini.jpg',
    '/images/kyoto.jpg',
    '/images/alps.jpg',
  ];

  constructor(private aiService: AiService) {}

  ngOnInit(): void {
    this.loading = true;
    this.error = '';

    this.aiService.getTrendingDestinations().subscribe({
      next: (results) => {
        this.destinations = results;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        if (err?.message?.includes('Too many requests')) {
          this.error = 'Too many requests — please wait a moment before trying again.';
        } else {
          this.error = 'Failed to load trending destinations.';
        }
      },
    });
  }

  onCardClick(name: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.destinationSelected.emit(name);
  }

  imageFor(index: number): string {
    return this.fallbackImages[index % this.fallbackImages.length];
  }
}
