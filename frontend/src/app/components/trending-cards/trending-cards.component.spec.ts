import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { TrendingCardsComponent } from './trending-cards.component';

const mockAiService = {
  getTrendingDestinations: vi.fn(),
};

let component: TrendingCardsComponent;

const MOCK_DESTINATIONS = [
  { name: 'Tokyo', description: 'A vibrant metropolis blending tradition and modernity.' },
  { name: 'Paris', description: 'The city of lights and romance.' },
  { name: 'New York', description: 'The city that never sleeps.' },
  { name: 'Sydney', description: 'Iconic harbour city with stunning beaches.' },
  { name: 'Cape Town', description: 'Where mountains meet the ocean.' },
];

describe('TrendingCardsComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    component = new TrendingCardsComponent(mockAiService as any);
  });

  it('calls getTrendingDestinations() on ngOnInit and sets destinations on success', () => {
    mockAiService.getTrendingDestinations.mockReturnValue(of(MOCK_DESTINATIONS));

    component.ngOnInit();

    expect(mockAiService.getTrendingDestinations).toHaveBeenCalledOnce();
    expect(component.destinations).toEqual(MOCK_DESTINATIONS);
  });

  it('sets loading = false after successful response', () => {
    mockAiService.getTrendingDestinations.mockReturnValue(of(MOCK_DESTINATIONS));

    component.ngOnInit();

    expect(component.loading).toBe(false);
  });

  it('sets error = "Failed to load trending destinations." on generic error', () => {
    mockAiService.getTrendingDestinations.mockReturnValue(
      throwError(() => ({ status: 500, message: 'Internal server error' }))
    );

    component.ngOnInit();

    expect(component.error).toBe('Failed to load trending destinations.');
    expect(component.loading).toBe(false);
  });

  it('sets error to rate-limit message on 429 error', () => {
    mockAiService.getTrendingDestinations.mockReturnValue(
      throwError(() => new Error('Too many requests — please wait a moment before trying again.'))
    );

    component.ngOnInit();

    expect(component.error).toBe('Too many requests — please wait a moment before trying again.');
    expect(component.loading).toBe(false);
  });

  it('onCardClick("Tokyo") emits destinationSelected with "Tokyo"', () => {
    mockAiService.getTrendingDestinations.mockReturnValue(of(MOCK_DESTINATIONS));
    component.ngOnInit();

    const emitted: string[] = [];
    component.destinationSelected.subscribe((name: string) => emitted.push(name));

    component.onCardClick('Tokyo');

    expect(emitted).toContain('Tokyo');
  });

  it('destinations.length === 5 after mock response with 5 items', () => {
    mockAiService.getTrendingDestinations.mockReturnValue(of(MOCK_DESTINATIONS));

    component.ngOnInit();

    expect(component.destinations.length).toBe(5);
  });
});
