import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { finalize, timeout, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { DestinationSearchComponent } from '../destination-search/destination-search.component';
import { TrendingCardsComponent } from '../trending-cards/trending-cards.component';
import { getItineraryImage } from '../../utils/itinerary-image';
import { AiService, AiTravelSearchResult } from '../../services/ai.service';

export interface Stop {
  name: string;
  notes: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    DestinationSearchComponent,
    TrendingCardsComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  itineraries: any[] = [];
  loading = true;
  activeFilter = 'Date';
  filters = ['Date', 'Budget', 'Duration'];
  activeView: 'explore' | 'saved' | 'bookings' = 'explore';
  rateLimitMessage = '';
  loadError = '';
  destinationToast = '';

  showModal = false;
  saving = false;
  formError = '';
  currentStep = 1;
  readonly TOTAL_STEPS = 4;
  readonly stepLabels = ['Basics', 'Dates', 'Budget', 'Stops'];

  // AI-first itinerary creation states
  creationMode: 'ai' | 'manual' | 'clarify' | 'preview' = 'ai';
  aiPromptText = '';
  aiLoading = false;
  aiLoadingText = 'Building your trip...';
  
  // Suggestions lists
  showManualSuggestions = false;
  manualSuggestions: string[] = [];
  destinationSearchSubject = new Subject<string>();

  // For AI draft flow
  extractedIntent: any = null;
  currentDestinationAttractions: any[] = [];
  generatedDraft: any = null;
  durationConflictMessage = '';
  clarificationForm = {
    destination: '',
    duration: 4
  };

  private platformId = inject(PLATFORM_ID);

  form = this.emptyForm();

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ai: AiService,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    this.destinationSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query || query.length < 2) {
          return of([]);
        }
        return this.ai.getSuggestions(query).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe((sugs) => {
      this.manualSuggestions = sugs;
      this.showManualSuggestions = sugs.length > 0;
      this.cdr.detectChanges();
    });

    this.loadItineraries();
    const destination = this.route.snapshot.queryParamMap.get('destination') || '';
    const create = this.route.snapshot.queryParamMap.get('create') === '1';
    if ((destination || create) && this.auth.isAdmin) {
      setTimeout(() => this.openModal(destination), 200);
    } else if (destination) {
      this.destinationToast = `${destination} is ready to explore below. Save a route or ask a trip manager to publish a custom plan.`;
    }
  }

  private emptyForm(destination = '') {
    return {
      title: '',
      destination,
      startDate: '',
      endDate: '',
      duration: '',
      budget: null as number | null,
      travelerCount: 1,
      category: 'leisure',
      travelStyle: 'balanced',
      transportMode: 'mixed',
      accommodationType: 'hotel',
      budgetBreakdown: {
        transport: 0,
        accommodation: 0,
        food: 0,
        activities: 0,
        contingency: 0,
      },
      description: '',
      stops: [] as Stop[],
    };
  }

  get stats() {
    const total = this.itineraries.length;
    const destinations = new Set(this.itineraries.map((item) => item.destination)).size;
    const averageBudget = total
      ? Math.round(this.itineraries.reduce((sum, item) => sum + (item.budget || 0), 0) / total)
      : 0;

    return [
      { icon: 'map', label: 'Total Itineraries', value: total, badge: 'All' },
      { icon: 'explore', label: 'Unique Destinations', value: destinations, badge: 'Global' },
      { icon: 'payments', label: 'Avg Budget', value: `$${averageBudget.toLocaleString()}`, badge: 'Avg' },
      {
        icon: 'favorite',
        label: 'Community Saves',
        value: this.itineraries.reduce((sum, item) => sum + (item.engagement?.favoriteCount || 0), 0),
        badge: 'Live',
      },
    ];
  }

  get sortedItineraries() {
    const list = [...this.itineraries];
    if (this.activeFilter === 'Budget') return list.sort((a, b) => (a.budget || 0) - (b.budget || 0));
    if (this.activeFilter === 'Duration') return list.sort((a, b) => String(a.duration).localeCompare(String(b.duration)));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  get calculatedDuration(): string {
    if (!this.form.startDate || !this.form.endDate) return '';
    const start = new Date(this.form.startDate);
    const end = new Date(this.form.endDate);
    if (end < start) return '';
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const nights = Math.max(0, days - 1);
    return nights ? `${days} Days / ${nights} Nights` : '1 Day';
  }

  loadItineraries(): void {
    this.loading = true;
    this.loadError = '';
    const request = this.activeView === 'saved'
      ? this.api.getFavorites()
      : this.activeView === 'bookings'
        ? this.api.getUserBookings()
        : this.api.getItineraries();

    request.pipe(
      timeout(12000),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (result) => {
        this.itineraries = Array.isArray(result) ? result : [];
      },
      error: (error) => {
        this.itineraries = [];
        if (error?.status === 401) {
          this.loadError = 'Your session expired. Redirecting you to sign in…';
        } else if (error?.name === 'TimeoutError') {
          this.loadError = 'The itinerary service took too long to respond. Please retry.';
        } else {
          this.loadError = error?.error?.message || error?.message || 'Itineraries could not be loaded.';
        }
      },
    });
  }

  setView(view: 'explore' | 'saved' | 'bookings'): void {
    this.activeView = view;
    this.loadItineraries();
  }

  openModal(prefilledDestination = ''): void {
    if (!this.auth.isLoggedIn) {
      this.rateLimitMessage = 'Please log in to plan trips.';
      return;
    }
    this.form = this.emptyForm(prefilledDestination);
    this.formError = '';
    this.currentStep = 1;
    this.creationMode = 'ai';
    this.aiPromptText = prefilledDestination ? `I want to plan a trip to ${prefilledDestination}` : '';
    this.aiLoading = false;
    this.extractedIntent = null;
    this.currentDestinationAttractions = [];
    this.generatedDraft = null;
    this.durationConflictMessage = '';
    this.clarificationForm = {
      destination: prefilledDestination,
      duration: 4
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.stopLoadingTexts();
    this.showModal = false;
    this.currentStep = 1;
  }

  nextStep(): void {
    if (!this.validateStep(this.currentStep)) return;
    if (this.currentStep === 2) this.form.duration = this.calculatedDuration;
    if (this.currentStep < this.TOTAL_STEPS) this.currentStep += 1;
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep -= 1;
    this.formError = '';
  }

  validateStep(step: number): boolean {
    this.formError = '';
    if (step === 1 && (!this.form.title.trim() || !this.form.destination.trim())) {
      this.formError = 'Enter a trip title and primary destination.';
      return false;
    }
    if (step === 2) {
      if (this.form.startDate || this.form.endDate) {
        if (!this.form.startDate || !this.form.endDate) {
          this.formError = 'Select both travel dates.';
          return false;
        }
        if (!this.calculatedDuration) {
          this.formError = 'End date must be on or after the start date.';
          return false;
        }
      }
    }
    if (step === 3) {
      if (this.form.budget !== null && this.form.budget <= 0) {
        this.formError = 'Enter a valid total budget.';
        return false;
      }
    }
    return true;
  }

  updateDuration(): void {
    this.form.duration = this.calculatedDuration;
  }

  allocateBudget(): void {
    const total = Number(this.form.budget) || 0;
    const transport = Math.round(total * 0.25);
    const accommodation = Math.round(total * 0.35);
    const food = Math.round(total * 0.2);
    const activities = Math.round(total * 0.1);
    this.form.budgetBreakdown = {
      transport,
      accommodation,
      food,
      activities,
      contingency: total - transport - accommodation - food - activities,
    };
  }

  addStop(): void {
    this.form.stops.push({ name: '', notes: '' });
  }

  removeStop(index: number): void {
    this.form.stops.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  submitCreate(): void {
    if (!this.validateStep(this.currentStep)) return;
    this.form.duration = this.form.duration || this.calculatedDuration || '1 Day';
    this.saving = true;
    this.formError = '';

    const payload = {
      ...this.form,
      status: 'draft', // Converge manual flow into itinerary draft lifecycle
      budget: this.form.budget ? Number(this.form.budget) : 0,
      stops: this.form.stops.filter((stop) => stop.name.trim()),
    };

    this.api.createItinerary(payload).pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (created) => {
        this.itineraries.unshift(created);
        this.showModal = false;
      },
      error: (error) => {
        this.formError = error?.error?.message || error?.message || 'Failed to create itinerary.';
      },
    });
  }

  getCardImage(item: any): string {
    return getItineraryImage(item);
  }

  onDestinationSelected(place: string): void {
    if (this.auth.isLoggedIn) {
      this.openModal(place);
    } else {
      this.destinationToast = `${place} selected. Browse the live routes below, then save or book the one that fits.`;
    }
  }

  onRateLimitError(message: string): void {
    this.rateLimitMessage = message;
    setTimeout(() => { this.rateLimitMessage = ''; }, 5000);
  }

  onCreateItineraryRequested(result: AiTravelSearchResult): void {
    const destination = result.normalizedDestination || result.destination;
    if (!destination) return;

    if (!this.auth.isLoggedIn) {
      this.destinationToast = 'Please log in to plan trips.';
      return;
    }

    this.openModal(destination);
    
    // Parse duration if present, e.g. "4 days" -> 4
    const duration = this.parseDuration(result.suggestedDuration);
    this.aiPromptText = `I want a ${duration}-day trip to ${destination}`;
    this.currentDestinationAttractions = result.attractions || [];
    this.clarificationForm = {
      destination,
      duration
    };
  }

  // AI-first logic helpers
  private loadingTexts = [
    'Understanding your trip...',
    'Finding relevant places...',
    'Building your day plan...',
    'Structuring your itinerary...'
  ];
  private loadingTextInterval: any;

  startLoadingTexts() {
    this.stopLoadingTexts();
    let index = 0;
    this.aiLoadingText = this.loadingTexts[index];
    this.loadingTextInterval = setInterval(() => {
      index = (index + 1) % this.loadingTexts.length;
      this.aiLoadingText = this.loadingTexts[index];
      this.cdr.detectChanges();
    }, 4000);
  }

  stopLoadingTexts() {
    if (this.loadingTextInterval) {
      clearInterval(this.loadingTextInterval);
      this.loadingTextInterval = null;
    }
  }

  private parseDuration(durStr: string): number {
    const match = String(durStr || '').match(/\d+/);
    return match ? Math.max(1, Number(match[0])) : 4;
  }

  generateAiItinerary(): void {
    if (!this.aiPromptText.trim()) {
      this.formError = 'Please describe your trip intent first.';
      return;
    }

    // Detect duration conflict (e.g. 6 days and 7 nights)
    const dayMatch = this.aiPromptText.match(/(\d+)\s*day/i);
    const nightMatch = this.aiPromptText.match(/(\d+)\s*night/i);
    let hasConflict = false;
    let conflictMsg = '';
    if (dayMatch && nightMatch) {
      const days = parseInt(dayMatch[1], 10);
      const nights = parseInt(nightMatch[1], 10);
      if (nights > days) {
        hasConflict = true;
        conflictMsg = `You mentioned ${days} days and ${nights} nights. Could you confirm the trip duration?`;
      }
    }

    this.aiLoading = true;
    this.formError = '';
    this.startLoadingTexts();

    // 1. Extract intent
    this.api.extractIntent(this.aiPromptText).subscribe({
      next: (extracted) => {
        this.extractedIntent = extracted;
        
        // Check if destination and duration are present
        const hasDest = extracted.destination && extracted.destination.trim();
        const hasDur = extracted.duration && Number.isInteger(extracted.duration) && extracted.duration > 0;
        
        if (hasDest && hasDur && !hasConflict) {
          // Proceed directly to draft generation
          this.callDraftGeneration(extracted);
        } else {
          // Stop loading states for clarification
          this.stopLoadingTexts();
          this.aiLoading = false;
          this.clarificationForm = {
            destination: extracted.destination || '',
            duration: hasConflict ? Math.max(1, parseInt(dayMatch![1], 10)) : (extracted.duration || 4)
          };
          this.durationConflictMessage = conflictMsg;
          this.creationMode = 'clarify';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.stopLoadingTexts();
        this.aiLoading = false;
        this.formError = err?.error?.message || err?.message || 'Failed to extract trip intent. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  submitClarification(): void {
    if (!this.clarificationForm.destination.trim()) {
      this.formError = 'Destination is required.';
      return;
    }
    const duration = Number(this.clarificationForm.duration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 30) {
      this.formError = 'Duration must be between 1 and 30 days.';
      return;
    }

    this.formError = '';
    this.aiLoading = true;
    this.creationMode = 'ai'; // show loading screen again
    this.startLoadingTexts();

    const mergedIntent = {
      ...this.extractedIntent,
      destination: this.clarificationForm.destination.trim(),
      duration: duration
    };
    
    this.callDraftGeneration(mergedIntent);
  }

  private callDraftGeneration(intent: any): void {
    const payloadWithAttractions = {
      ...intent,
      destinationAttractions: this.currentDestinationAttractions
    };

    this.api.generateItineraryDraft(payloadWithAttractions).pipe(
      finalize(() => {
        this.stopLoadingTexts();
        this.aiLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (draft) => {
        // Save to MongoDB immediately as a private draft
        const allStops = (draft.days || []).flatMap((day: any) => day.stops || []).map((stop: any, idx: number) => ({
          name: stop.name,
          notes: stop.description || '',
          order: idx
        }));
        
        const payload = {
          title: `Trip to ${draft.destination} (AI Draft)`,
          destination: draft.destination,
          duration: `${draft.duration} Days`,
          startDate: new Date().toISOString(), // default start today
          endDate: new Date(Date.now() + (draft.duration - 1) * 86400000).toISOString(),
          budget: intent.budget || 0,
          travelerCount: intent.travelers || 1,
          travelStyle: intent.travelStyle || 'balanced',
          status: 'draft',
          description: draft.summary || '',
          stops: allStops,
          dailyPlan: (draft.days || []).map((day: any) => ({
            day: day.day,
            title: day.theme,
            activities: (day.stops || []).map((stop: any) => ({
              time: stop.suggestedTime || '10:00',
              activity: stop.name,
              description: stop.description,
              location: draft.destination,
              category: stop.category,
              suggestedDuration: stop.suggestedDuration,
              whyThisStop: stop.whyThisStop || stop.reason
            }))
          })),
          tripSummary: {
            highlights: draft.recommendations || []
          }
        };

        this.api.createItinerary(payload).subscribe({
          next: (created) => {
            this.generatedDraft = created; // Store populated database record (with _id)
            this.itineraries.unshift(created);
            this.creationMode = 'preview';
            this.cdr.detectChanges();
          },
          error: (saveErr) => {
            this.formError = 'AI generated the trip, but we failed to save the draft: ' + (saveErr?.error?.message || saveErr?.message);
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        if (err?.status === 408 || err?.name === 'TimeoutError' || String(err?.message || '').toLowerCase().includes('time out') || String(err?.message || '').toLowerCase().includes('timeout')) {
          this.formError = 'The local AI planner took too long to respond. Your trip description has been preserved. Try again.';
        } else {
          this.formError = err?.error?.message || err?.message || 'Failed to generate itinerary draft. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  onDestinationInputChange(value: string): void {
    if (!value || value.length < 2) {
      this.manualSuggestions = [];
      this.showManualSuggestions = false;
      return;
    }
    this.destinationSearchSubject.next(value);
  }

  selectManualSuggestion(suggestion: string): void {
    this.form.destination = suggestion;
    this.clarificationForm.destination = suggestion;
    this.showManualSuggestions = false;
    this.manualSuggestions = [];
    this.cdr.detectChanges();
  }
}
