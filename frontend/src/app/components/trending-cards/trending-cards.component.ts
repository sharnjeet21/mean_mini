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
  rateLimitWarning = '';

  constructor(private aiService: AiService) {}

  ngOnInit(): void {
    this.loading = true;
    this.rateLimitWarning = '';

    this.aiService.getTrendingDestinations().subscribe({
      next: (results) => {
        this.destinations = results;
        this.loading = false;
      },
      // Only a 429 reaches here (other errors are caught inside AiService and return fallback)
      error: (err) => {
        this.loading = false;
        if (err?.message?.includes('Too many requests')) {
          this.rateLimitWarning = err.message;
        }
      },
    });
  }

  onCardClick(name: string): void {
    this.destinationSelected.emit(name);
  }
}
