import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { DestinationSearchComponent } from './destination-search.component';

const baseAiResult = {
  type: 'destination' as const,
  destination: 'Paris',
  normalizedDestination: 'Paris, France',
  overview: 'City overview',
  suggestedDuration: '3 days',
  attractions: [],
  dayPlan: [],
  travelTips: [],
  recommendations: [],
  image: null,
};

const mockAiService = {
  getDestinationImage: vi.fn(),
  getSuggestions: vi.fn(),
  getItinerarySuggestions: vi.fn(),
  getTravelSearchResult: vi.fn(),
};

function keyEvent(key: string): KeyboardEvent {
  return { key, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}

let component: DestinationSearchComponent;

describe('DestinationSearchComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAiService.getTravelSearchResult.mockReturnValue(of(baseAiResult));
    component = new DestinationSearchComponent(mockAiService as any);
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  describe('Input validation guard', () => {
    it('does NOT push to inputSubject when input contains non-printable characters', () => {
      mockAiService.getDestinationImage.mockReturnValue(of({ url: 'https://example.com/img.jpg' }));
      mockAiService.getSuggestions.mockReturnValue(of(['Paris']));

      component.query = 'Paris\x01';
      component.onInput();

      expect(mockAiService.getDestinationImage).not.toHaveBeenCalled();
      expect(mockAiService.getSuggestions).not.toHaveBeenCalled();
    });

    it('does NOT push to inputSubject when input exceeds 200 characters', () => {
      mockAiService.getDestinationImage.mockReturnValue(of({ url: 'https://example.com/img.jpg' }));
      mockAiService.getSuggestions.mockReturnValue(of(['Paris']));

      component.query = 'A'.repeat(201);
      component.onInput();

      expect(mockAiService.getDestinationImage).not.toHaveBeenCalled();
      expect(mockAiService.getSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('selectSuggestion', () => {
    it('sets query, closes dropdown, and calls getItinerarySuggestions', () => {
      mockAiService.getItinerarySuggestions.mockReturnValue(of([]));

      component.showSuggestions = true;
      component.selectSuggestion('Paris');

      expect(component.query).toBe('Paris');
      expect(component.showSuggestions).toBe(false);
      expect(mockAiService.getItinerarySuggestions).toHaveBeenCalledWith('Paris');
      expect(mockAiService.getTravelSearchResult).toHaveBeenCalledWith('Paris');
    });

    it('emits destinationSelected with the place name', () => {
      mockAiService.getItinerarySuggestions.mockReturnValue(of([]));

      const emitted: string[] = [];
      component.destinationSelected.subscribe((place: string) => emitted.push(place));

      component.selectSuggestion('Paris');

      expect(emitted).toContain('Paris');
    });

    it('sets attractions and attractionsLoading=false on successful getItinerarySuggestions', () => {
      const attractions = [
        { name: 'Eiffel Tower', description: 'Iconic tower' },
        { name: 'Louvre', description: 'Famous museum' },
      ];
      mockAiService.getItinerarySuggestions.mockReturnValue(of(attractions));
      mockAiService.getTravelSearchResult.mockReturnValue(of({ ...baseAiResult, attractions }));

      component.selectSuggestion('Paris');

      expect(component.attractions).toEqual(attractions);
      expect(component.attractionsLoading).toBe(false);
    });

    it('sets attractionsError on non-429 error from getItinerarySuggestions', () => {
      mockAiService.getItinerarySuggestions.mockReturnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      component.selectSuggestion('Paris');

      expect(component.attractionsError).toBeTruthy();
      expect(component.attractionsLoading).toBe(false);
    });

    it('sets rateLimitError on 429 error from getItinerarySuggestions', () => {
      mockAiService.getItinerarySuggestions.mockReturnValue(
        throwError(() => new Error('Too many requests — please wait a moment before trying again.'))
      );

      component.selectSuggestion('Paris');

      expect(component.rateLimitError).toContain('Too many requests');
      expect(component.attractionsError).toBe('');
    });
  });

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      component.suggestions = ['Paris', 'Prague', 'Porto'];
      component.showSuggestions = true;
      component.activeIndex = -1;
    });

    it('ArrowDown increments activeIndex (capped at suggestions.length - 1)', () => {
      component.onKeydown(keyEvent('ArrowDown'));
      expect(component.activeIndex).toBe(0);

      component.onKeydown(keyEvent('ArrowDown'));
      expect(component.activeIndex).toBe(1);

      component.onKeydown(keyEvent('ArrowDown'));
      expect(component.activeIndex).toBe(2);

      component.onKeydown(keyEvent('ArrowDown'));
      expect(component.activeIndex).toBe(2);
    });

    it('ArrowUp decrements activeIndex (floored at -1)', () => {
      component.activeIndex = 2;

      component.onKeydown(keyEvent('ArrowUp'));
      expect(component.activeIndex).toBe(1);

      component.onKeydown(keyEvent('ArrowUp'));
      expect(component.activeIndex).toBe(0);

      component.onKeydown(keyEvent('ArrowUp'));
      expect(component.activeIndex).toBe(-1);

      component.onKeydown(keyEvent('ArrowUp'));
      expect(component.activeIndex).toBe(-1);
    });

    it('Escape sets showSuggestions = false', () => {
      component.onKeydown(keyEvent('Escape'));
      expect(component.showSuggestions).toBe(false);
    });

    it('Enter with valid activeIndex calls selectSuggestion', () => {
      mockAiService.getItinerarySuggestions.mockReturnValue(of([]));

      component.activeIndex = 1;
      component.onKeydown(keyEvent('Enter'));

      expect(mockAiService.getItinerarySuggestions).toHaveBeenCalledWith('Prague');
    });
  });

  describe('getHighlightedParts', () => {
    it('returns [{text: suggestion, highlight: false}] when query is empty', () => {
      const parts = component.getHighlightedParts('Paris', '');
      expect(parts).toEqual([{ text: 'Paris', highlight: false }]);
    });

    it('returns correct highlight parts when query matches substring', () => {
      const parts = component.getHighlightedParts('Paris, France', 'aris');
      expect(parts).toEqual([
        { text: 'P', highlight: false },
        { text: 'aris', highlight: true },
        { text: ', France', highlight: false },
      ]);
    });

    it('returns [{text: suggestion, highlight: false}] when query does not match', () => {
      const parts = component.getHighlightedParts('Paris', 'xyz');
      expect(parts).toEqual([{ text: 'Paris', highlight: false }]);
    });
  });

  describe('clearAll on empty input', () => {
    it('onInput() with empty query clears image, suggestions, attractions, and ai result', () => {
      component.imageUrl = 'https://example.com/img.jpg';
      component.suggestions = ['Paris', 'Prague'];
      component.showSuggestions = true;
      component.attractions = [{ name: 'Eiffel Tower', description: 'Tower' }];
      component.attractionsError = 'Some error';
      component.rateLimitError = 'Rate limit error';
      component.aiResult = baseAiResult;

      component.query = '';
      component.onInput();

      expect(component.imageUrl).toBeNull();
      expect(component.suggestions).toEqual([]);
      expect(component.showSuggestions).toBe(false);
      expect(component.attractions).toEqual([]);
      expect(component.attractionsError).toBe('');
      expect(component.rateLimitError).toBe('');
      expect(component.aiResult).toBeNull();
    });
  });

  describe('createItineraryFromAi', () => {
    it('emits createItineraryRequested when aiResult is an itinerary', () => {
      const emitted: any[] = [];
      component.createItineraryRequested.subscribe((value) => emitted.push(value));
      component.aiResult = {
        ...baseAiResult,
        type: 'itinerary',
        destination: 'Manali',
        normalizedDestination: 'Manali, India',
        suggestedDuration: '4 days',
      };

      component.createItineraryFromAi();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].destination).toBe('Manali');
    });
  });
});
