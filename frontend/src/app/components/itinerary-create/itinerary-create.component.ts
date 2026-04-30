import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { AiService } from '../../services/ai.service';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, finalize, Subject, takeUntil, of } from 'rxjs';

@Component({
  selector: 'app-itinerary-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './itinerary-create.component.html',
})
export class ItineraryCreateComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  
  isLoading: boolean = false;
  activeTab: 'itinerary' | 'attractions' | 'trending' = 'itinerary';
  
  suggestions: string[] = [];
  attractions: string[] = [];
  trending: string[] = [];
  
  // Search dropdown variables
  suggestionsDropdown: string[] = [];
  isFetchingSuggestions: boolean = false;
  showDropdown: boolean = false;
  private destroy$ = new Subject<void>();
  
  error: string | null = null;

  constructor(private aiService: AiService) {}

  ngOnInit() {
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      switchMap(value => {
        if (!value || value.trim() === '') {
          this.suggestionsDropdown = [];
          this.showDropdown = false;
          return of({ data: [] });
        }
        this.isFetchingSuggestions = true;
        this.showDropdown = true;
        return this.aiService.getSuggestions(value).pipe(
          finalize(() => this.isFetchingSuggestions = false)
        );
      })
    ).subscribe({
      next: (res) => {
        this.suggestionsDropdown = res.data;
      },
      error: (err) => {
        console.error('Failed to fetch search suggestions', err);
        this.suggestionsDropdown = [];
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectSuggestion(suggestion: string) {
    this.searchControl.setValue(suggestion, { emitEvent: false });
    this.showDropdown = false;
    this.fetchSuggestions();
  }

  fetchSuggestions() {
    const destination = this.searchControl.value;
    if (!destination || !destination.trim()) {
      this.error = 'Please enter a destination';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.suggestions = [];
    this.attractions = [];
    this.activeTab = 'itinerary';
    this.showDropdown = false;

    // Fetch itinerary
    this.aiService.getItinerary(destination).subscribe({
      next: (res) => {
        this.suggestions = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to fetch AI suggestions';
        this.isLoading = false;
        console.error(err);
      }
    });

    // Fetch attractions in background
    this.aiService.getAttractions(destination).subscribe({
      next: (res) => this.attractions = res.data,
      error: (err) => console.error('Failed to fetch attractions:', err)
    });
  }

  fetchTrending() {
    this.isLoading = true;
    this.error = null;
    this.activeTab = 'trending';
    this.aiService.getTrending().subscribe({
      next: (res) => {
        this.trending = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to fetch trending destinations';
        this.isLoading = false;
        console.error(err);
      }
    });
  }
}
