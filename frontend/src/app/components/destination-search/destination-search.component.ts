import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { AiService, Attraction } from '../../services/ai.service';

interface HighlightPart {
  text: string;
  highlight: boolean;
}

@Component({
  selector: 'app-destination-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './destination-search.component.html',
})
export class DestinationSearchComponent implements OnInit, OnDestroy {
  @Output() destinationSelected = new EventEmitter<string>();

  // Input state
  query = '';
  private readonly PRINTABLE_REGEX = /^[\x20-\x7E\u00A0-\uFFFF]*$/;
  private readonly MAX_LENGTH = 200;

  // Image state
  imageLoading = false;
  imageUrl: string | null = null;
  imageError = false;

  // Suggestion state
  suggestions: string[] = [];
  showSuggestions = false;
  activeIndex = -1;

  // Attraction state
  attractions: Attraction[] = [];
  attractionsLoading = false;
  attractionsError = '';

  // Error state
  rateLimitError = '';

  // RxJS
  private inputSubject = new Subject<string>();
  private subscriptions = new Subscription();

  constructor(private aiService: AiService) {}

  ngOnInit(): void {
    // Debounced input pipeline for image (≥1 char) and suggestions (≥2 chars)
    const debouncedInput$ = this.inputSubject.pipe(debounceTime(400));

    const imageSub = debouncedInput$
      .pipe(
        switchMap((value) => {
          if (!this.isValid(value) || value.length < 1) {
            this.clearImage();
            return [];
          }
          this.imageLoading = true;
          this.imageError = false;
          this.imageUrl = null;
          this.rateLimitError = '';
          return this.aiService.getDestinationImage(value);
        })
      )
      .subscribe({
        next: (res) => {
          this.imageLoading = false;
          this.imageUrl = res.url;
          this.imageError = false;
        },
        error: (err) => {
          this.imageLoading = false;
          this.imageError = true;
          if (err?.message?.includes('Too many requests')) {
            this.rateLimitError = 'Too many requests — please wait a moment before trying again.';
          }
        },
      });

    const suggestionSub = debouncedInput$
      .pipe(
        switchMap((value) => {
          if (!this.isValid(value) || value.length < 2) {
            this.suggestions = [];
            this.showSuggestions = false;
            return [];
          }
          return this.aiService.getSuggestions(value);
        })
      )
      .subscribe({
        next: (results) => {
          this.suggestions = results;
          this.showSuggestions = results.length > 0;
          this.activeIndex = -1;
        },
        error: (err) => {
          this.suggestions = [];
          this.showSuggestions = false;
          if (err?.message?.includes('Too many requests')) {
            this.rateLimitError = 'Too many requests — please wait a moment before trying again.';
          }
        },
      });

    this.subscriptions.add(imageSub);
    this.subscriptions.add(suggestionSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onInput(): void {
    const value = this.query.trim();

    if (!value) {
      this.clearAll();
      return;
    }

    if (!this.isValid(this.query)) {
      return;
    }

    this.inputSubject.next(value);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.showSuggestions) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, this.suggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.activeIndex >= 0 && this.activeIndex < this.suggestions.length) {
          this.selectSuggestion(this.suggestions[this.activeIndex]);
        }
        break;
      case 'Escape':
        this.showSuggestions = false;
        this.activeIndex = -1;
        break;
    }
  }

  selectSuggestion(place: string): void {
    this.query = place;
    this.showSuggestions = false;
    this.activeIndex = -1;
    this.attractionsError = '';
    this.rateLimitError = '';
    this.attractionsLoading = true;
    this.attractions = [];

    this.aiService.getItinerarySuggestions(place).subscribe({
      next: (results) => {
        this.attractions = results;
        this.attractionsLoading = false;
      },
      error: (err) => {
        this.attractionsLoading = false;
        if (err?.message?.includes('Too many requests')) {
          this.rateLimitError = 'Too many requests — please wait a moment before trying again.';
          this.attractionsError = '';
        } else {
          this.attractionsError = 'Failed to load attractions. Please try again.';
        }
      },
    });

    this.destinationSelected.emit(place);
  }

  getHighlightedParts(suggestion: string, query: string): HighlightPart[] {
    if (!query) {
      return [{ text: suggestion, highlight: false }];
    }

    const lowerSuggestion = suggestion.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerSuggestion.indexOf(lowerQuery);

    if (index === -1) {
      return [{ text: suggestion, highlight: false }];
    }

    const parts: HighlightPart[] = [];

    if (index > 0) {
      parts.push({ text: suggestion.slice(0, index), highlight: false });
    }

    parts.push({ text: suggestion.slice(index, index + query.length), highlight: true });

    if (index + query.length < suggestion.length) {
      parts.push({ text: suggestion.slice(index + query.length), highlight: false });
    }

    return parts;
  }

  private isValid(value: string): boolean {
    return this.PRINTABLE_REGEX.test(value) && value.length <= this.MAX_LENGTH;
  }

  private clearImage(): void {
    this.imageLoading = false;
    this.imageUrl = null;
    this.imageError = false;
  }

  private clearAll(): void {
    this.clearImage();
    this.suggestions = [];
    this.showSuggestions = false;
    this.activeIndex = -1;
    this.attractions = [];
    this.attractionsError = '';
    this.rateLimitError = '';
  }
}
