import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { finalize, timeout, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { DestinationSearchComponent } from '../../destination-search/destination-search.component';
import { getItineraryImage } from '../../../utils/itinerary-image';
import { AiService, AiTravelSearchResult } from '../../../services/ai.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmService } from '../../../services/confirm.service';
import { modalFadeScale, overlayFade, fadeText } from '../../../utils/animations';

export interface Stop {
  name: string;
  notes: string;
}

@Component({
  selector: 'app-agency-trips',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './agency-trips.component.html',
  animations: [modalFadeScale, overlayFade, fadeText],
})
export class AgencyTripsComponent implements OnInit {
  itineraries: any[] = [];
  loading = true;
  errorMessage = '';

  // Workspace list filters
  managerSearchTerm = '';
  managerActiveTab: 'all' | 'draft' | 'published' = 'all';

  // AI-first itinerary creation modal states
  showModal = false;
  saving = false;
  formError = '';
  currentStep = 1;
  readonly TOTAL_STEPS = 4;
  readonly stepLabels = ['Basics', 'Dates', 'Budget', 'Stops'];

  creationMode: 'ai' | 'manual' | 'clarify' | 'preview' = 'ai';
  aiPromptText = '';
  aiLoading = false;
  aiLoadingText = 'Building your trip...';

  // Manual configuration inputs / suggestions
  showManualSuggestions = false;
  manualSuggestions: string[] = [];
  destinationSearchSubject = new Subject<string>();

  // Extracted travel intent states
  extractedIntent: any = null;
  currentDestinationAttractions: any[] = [];
  generatedDraft: any = null;
  durationConflictMessage = '';
  clarificationForm = {
    destination: '',
    duration: 4
  };

  form = this.emptyForm();

  auth = inject(AuthService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ai = inject(AiService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  ngOnInit(): void {
    this.loadItineraries();

    // Watch query params to open creation modal if `create=1` is specified
    this.route.queryParams.subscribe((params) => {
      const destination = params['destination'] || '';
      const create = params['create'] === '1';
      if (create) {
        // Clear param to avoid re-opening modal on refresh
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { create: null, destination: null },
          queryParamsHandling: 'merge'
        });
        setTimeout(() => this.openModal(destination), 200);
      }
    });

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
  }

  get ownedItineraries(): any[] {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return [];
    return this.itineraries.filter((item) => {
      const creatorId = item.createdBy?._id || item.createdBy?.id || item.createdBy;
      return creatorId && creatorId.toString() === userId.toString();
    });
  }

  get filteredOwnedItineraries(): any[] {
    const query = this.managerSearchTerm.trim().toLowerCase();
    return this.ownedItineraries.filter((item) => {
      const statusMatches = this.managerActiveTab === 'all'
        || (this.managerActiveTab === 'draft' && item.status === 'draft')
        || (this.managerActiveTab === 'published' && item.status === 'published');
      const searchMatches = !query
        || item.title?.toLowerCase().includes(query)
        || item.destination?.toLowerCase().includes(query)
        || item.description?.toLowerCase().includes(query);
      return statusMatches && searchMatches;
    });
  }

  get managerStats() {
    const owned = this.ownedItineraries;
    const drafts = owned.filter((item) => item.status === 'draft').length;
    const published = owned.filter((item) => item.status === 'published').length;
    const total = owned.length;

    return [
      { icon: 'draft', label: 'Drafts', value: drafts, badge: 'Draft' },
      { icon: 'publish', label: 'Published', value: published, badge: 'Live' },
      { icon: 'folder', label: 'Total itineraries', value: total, badge: 'All' }
    ];
  }

  loadItineraries(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getMyItineraries().pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (result) => {
        this.itineraries = Array.isArray(result) ? result : [];
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load itineraries.';
      }
    });
  }

  async updateItineraryStatus(item: any, newStatus: string): Promise<void> {
    const action = newStatus === 'published' ? 'Publish' : 'Archive';
    const confirmed = await this.confirmService.confirm({
      title: `${action} Itinerary`,
      message: `Are you sure you want to ${action.toLowerCase()} "${item.title}"?`,
      confirmText: action,
      cancelText: 'Cancel',
      type: 'info'
    });
    if (!confirmed) return;

    this.toastService.info(`${action === 'Publish' ? 'Publishing' : 'Archiving'} itinerary...`, 2000);

    this.api.updateItinerary(item._id, { status: newStatus }).subscribe({
      next: (updated) => {
        const index = this.itineraries.findIndex((current) => current._id === item._id);
        if (index >= 0) {
          this.itineraries[index] = updated;
          this.cdr.detectChanges();
        }
        this.toastService.success(`Itinerary successfully ${newStatus === 'published' ? 'published' : 'archived'}.`);
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Failed to update itinerary status.');
      }
    });
  }

  async deleteItinerary(id: string): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Itinerary',
      message: 'Are you sure you want to permanently delete this itinerary? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    this.api.deleteItinerary(id).subscribe({
      next: () => {
        this.itineraries = this.itineraries.filter((item) => item._id !== id);
        this.toastService.success('Itinerary deleted successfully.');
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Delete failed.');
      }
    });
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

  getCardImage(item: any): string {
    return getItineraryImage(item);
  }

  openModal(prefilledDestination = ''): void {
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

  async closeModal(): Promise<void> {
    if (this.generatedDraft || this.form.title.trim() || this.form.destination.trim() || this.aiPromptText.trim()) {
      const confirmed = await this.confirmService.confirm({
        title: 'Discard Draft',
        message: 'Are you sure you want to discard this trip plan? All unsaved data will be lost.',
        confirmText: 'Discard',
        cancelText: 'Keep Planning',
        type: 'danger'
      });
      if (!confirmed) return;
    }
    this.stopLoadingTexts();
    this.showModal = false;
    this.currentStep = 1;
    this.generatedDraft = null;
    this.extractedIntent = null;
    this.cdr.detectChanges();
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

  get calculatedDuration(): string {
    if (!this.form.startDate || !this.form.endDate) return '';
    const start = new Date(this.form.startDate);
    const end = new Date(this.form.endDate);
    if (end < start) return '';
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const nights = Math.max(0, days - 1);
    return nights ? `${days} Days / ${nights} Nights` : '1 Day';
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
      status: 'draft',
      budget: this.form.budget ? Number(this.form.budget) : undefined,
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
        this.toastService.success('Draft itinerary successfully created!');
        this.showModal = false;
      },
      error: (error) => {
        const errMsg = error?.error?.message || error?.message || 'Failed to create itinerary.';
        this.formError = errMsg;
        this.toastService.error(errMsg);
      },
    });
  }

  // AI Planner methods
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

    this.api.extractIntent(this.aiPromptText).subscribe({
      next: (extracted) => {
        this.extractedIntent = extracted;
        const hasDest = extracted.destination && extracted.destination.trim();
        const hasDur = extracted.duration && Number.isInteger(extracted.duration) && extracted.duration > 0;
        
        if (hasDest && hasDur && !hasConflict) {
          this.callDraftGeneration(extracted);
        } else {
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
        const msg = err?.error?.message || err?.message || 'Failed to extract trip intent. Please try again.';
        this.formError = msg;
        this.toastService.error(msg);
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
    this.creationMode = 'ai';
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
        const allStops = (draft.days || []).flatMap((day: any) => day.stops || []).map((stop: any, idx: number) => ({
          name: stop.name,
          notes: stop.description || '',
          order: idx
        }));
        
        const actualDuration = Math.max(1, (draft.days || []).length);
        
        const payload = {
          title: `Trip to ${draft.destination} (AI Draft)`,
          destination: draft.destination,
          duration: `${actualDuration} Days`,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + (actualDuration - 1) * 86400000).toISOString(),
          budget: intent.budget || undefined,
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
            this.generatedDraft = created;
            this.itineraries.unshift(created);
            this.creationMode = 'preview';
            this.toastService.success('AI itinerary draft created successfully!');
            this.cdr.detectChanges();
          },
          error: (saveErr) => {
            const msg = 'AI generated the trip, but we failed to save the draft: ' + (saveErr?.error?.message || saveErr?.message);
            this.formError = msg;
            this.toastService.error(msg);
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        let msg = '';
        if (err?.status === 408 || err?.name === 'TimeoutError' || String(err?.message || '').toLowerCase().includes('timeout')) {
          msg = 'The local AI planner took too long to respond. Your trip description has been preserved. Try again.';
        } else {
          msg = err?.error?.message || err?.message || 'Failed to generate itinerary draft. Please try again.';
        }
        this.formError = msg;
        this.toastService.error(msg);
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
