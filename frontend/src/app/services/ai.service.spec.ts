import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { AiService } from './ai.service';

// Mock HttpClient
const mockHttp = {
  get: vi.fn(),
};

// Create service instance directly
const service = new AiService(mockHttp as any);

const RATE_LIMIT_MSG = 'Too many requests — please wait a moment before trying again.';

describe('AiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getDestinationImage ───────────────────────────────────────────────────

  describe('getDestinationImage(place)', () => {
    it('calls http.get with correct URL containing /api/image and params place=Paris', () => {
      mockHttp.get.mockReturnValue(of({ url: 'https://example.com/paris.jpg' }));

      service.getDestinationImage('Paris').subscribe();

      expect(mockHttp.get).toHaveBeenCalledOnce();
      const [url, options] = mockHttp.get.mock.calls[0];
      expect(url).toContain('/api/image');
      expect((options.params as HttpParams).toString()).toContain('place=Paris');
    });

    it('returns the { url } object from the response', () => {
      const mockResponse = { url: 'https://example.com/paris.jpg' };
      mockHttp.get.mockReturnValue(of(mockResponse));

      let result: any;
      service.getDestinationImage('Paris').subscribe((res) => (result = res));

      expect(result).toEqual(mockResponse);
    });

    it('maps 429 error to rate-limit message', () => {
      mockHttp.get.mockReturnValue(throwError(() => ({ status: 429 })));

      let error: any;
      service.getDestinationImage('Paris').subscribe({
        error: (err) => (error = err),
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(RATE_LIMIT_MSG);
    });

    it('re-throws non-429 errors as-is', () => {
      const originalError = { status: 500, message: 'Server error' };
      mockHttp.get.mockReturnValue(throwError(() => originalError));

      let error: any;
      service.getDestinationImage('Paris').subscribe({
        error: (err) => (error = err),
      });

      expect(error).toBe(originalError);
    });
  });

  // ─── getSuggestions ────────────────────────────────────────────────────────

  describe('getSuggestions(query)', () => {
    it('calls http.get with correct URL containing /api/suggestions and params q=Paris', () => {
      mockHttp.get.mockReturnValue(of({ suggestions: ['Paris, France'] }));

      service.getSuggestions('Paris').subscribe();

      expect(mockHttp.get).toHaveBeenCalledOnce();
      const [url, options] = mockHttp.get.mock.calls[0];
      expect(url).toContain('/api/suggestions');
      expect((options.params as HttpParams).toString()).toContain('q=Paris');
    });

    it('extracts suggestions array from response body { suggestions: [...] }', () => {
      const suggestions = ['Paris, France', 'Paris, Texas'];
      mockHttp.get.mockReturnValue(of({ suggestions }));

      let result: any;
      service.getSuggestions('Paris').subscribe((res) => (result = res));

      expect(result).toEqual(suggestions);
    });

    it('maps 429 error to rate-limit message', () => {
      mockHttp.get.mockReturnValue(throwError(() => ({ status: 429 })));

      let error: any;
      service.getSuggestions('Paris').subscribe({
        error: (err) => (error = err),
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(RATE_LIMIT_MSG);
    });
  });

  // ─── getTrendingDestinations ───────────────────────────────────────────────

  describe('getTrendingDestinations()', () => {
    it('calls http.get with correct URL containing /api/trending (no params)', () => {
      mockHttp.get.mockReturnValue(of({ destinations: [] }));

      service.getTrendingDestinations().subscribe();

      expect(mockHttp.get).toHaveBeenCalledOnce();
      const [url, options] = mockHttp.get.mock.calls[0];
      expect(url).toContain('/api/trending');
      // No params should be passed
      expect(options).toBeUndefined();
    });

    it('extracts destinations array from response body', () => {
      const destinations = [
        { name: 'Tokyo', description: 'A vibrant city' },
        { name: 'Paris', description: 'City of lights' },
      ];
      mockHttp.get.mockReturnValue(of({ destinations }));

      let result: any;
      service.getTrendingDestinations().subscribe((res) => (result = res));

      expect(result).toEqual(destinations);
    });
  });

  // ─── getItinerarySuggestions ───────────────────────────────────────────────

  describe('getItinerarySuggestions(place)', () => {
    it('calls http.get with correct URL containing /api/itinerary-suggestions and params place=Paris', () => {
      mockHttp.get.mockReturnValue(of({ attractions: [] }));

      service.getItinerarySuggestions('Paris').subscribe();

      expect(mockHttp.get).toHaveBeenCalledOnce();
      const [url, options] = mockHttp.get.mock.calls[0];
      expect(url).toContain('/api/itinerary-suggestions');
      expect((options.params as HttpParams).toString()).toContain('place=Paris');
    });

    it('extracts attractions array from response body', () => {
      const attractions = [
        { name: 'Eiffel Tower', description: 'Iconic iron lattice tower' },
        { name: 'Louvre Museum', description: 'World-famous art museum' },
      ];
      mockHttp.get.mockReturnValue(of({ attractions }));

      let result: any;
      service.getItinerarySuggestions('Paris').subscribe((res) => (result = res));

      expect(result).toEqual(attractions);
    });
  });
});
