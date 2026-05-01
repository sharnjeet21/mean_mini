# Tasks: AI Travel Enhancements

## Task List

- [x] 1. Backend infrastructure: rate limiter, input validator, in-memory cache
  - [x] 1.1 Create `server/middleware/rateLimiter.js` — per-IP 60 req/min window using `Map`, returns 429 + `Retry-After` on exceed
  - [x] 1.2 Create `server/middleware/inputValidator.js` — validates printable Unicode, max 200 chars, strips HTML/script tags; attaches sanitized value to `req.sanitized`
  - [x] 1.3 Create `server/utils/inMemoryCache.js` — `InMemoryCache` class with `get`, `set`, `has` methods and per-entry TTL using `Map`
  - [x] 1.4 Add `UNSPLASH_ACCESS_KEY` and `GEMINI_API_KEY` to `.env` (placeholder values) and document in README

- [x] 2. Backend: destination image route (`GET /api/image`)
  - [x] 2.1 Create `server/routes/aiRoutes.js` with the `/image` handler: apply `rateLimiter` and `validateQueryParam('place')`, check cache, call Unsplash API, store result, return `{ url }` with `X-Cache` header
  - [x] 2.2 Handle Unsplash no-results → 404; Unsplash error → 502
  - [x] 2.3 Register `aiRoutes` in `server/server.js` under `/api` with `apiCors`

- [x] 3. Backend: AI suggestions route (`GET /api/suggestions`)
  - [x] 3.1 Add `/suggestions` handler to `aiRoutes.js`: apply `rateLimiter` and `validateQueryParam('q')`, enforce min-length 2 (400 if shorter), check cache, call Gemini API, parse JSON array, return `{ suggestions }` with `X-Cache` header
  - [x] 3.2 Handle Gemini no-results → `{ suggestions: [] }` 200; Gemini error → 502

- [x] 4. Backend: trending destinations route (`GET /api/trending`)
  - [x] 4.1 Add `/trending` handler to `aiRoutes.js`: apply `rateLimiter`, check cache (24h TTL), call Gemini API with trending prompt, parse and validate exactly 5 destination objects (name + description ≤ 100 chars), return `{ destinations }` with `X-Cache` header
  - [x] 4.2 Handle Gemini error → 502

- [x] 5. Backend: itinerary attraction suggestions route (`GET /api/itinerary-suggestions`)
  - [x] 5.1 Add `/itinerary-suggestions` handler to `aiRoutes.js`: apply `rateLimiter` and `validateQueryParam('place')`, check cache, call Gemini API with attractions prompt, parse and validate exactly 5 attraction objects (name + description ≤ 150 chars), return `{ attractions }` with `X-Cache` header
  - [x] 5.2 Handle empty/missing place → 400; Gemini error → 502

- [x] 6. Frontend: `AiService`
  - [x] 6.1 Create `frontend/src/app/services/ai.service.ts` with methods `getDestinationImage(place)`, `getSuggestions(query)`, `getTrendingDestinations()`, `getItinerarySuggestions(place)` — all using `HttpClient`, calling `environment.apiUrl + '/api/...'`
  - [x] 6.2 Define and export `TrendingDestination` and `Attraction` interfaces in the service file
  - [x] 6.3 Handle 429 responses in `AiService` by mapping to a user-readable error observable

- [x] 7. Frontend: `DestinationSearchComponent`
  - [x] 7.1 Create `frontend/src/app/components/destination-search/destination-search.component.ts` as a standalone component with a text input, 400 ms debounce via `Subject` + `debounceTime`, client-side validation (printable chars, max 200), and `@Output() destinationSelected: EventEmitter<string>`
  - [x] 7.2 On valid input (≥1 char after debounce): call `AiService.getDestinationImage()` and `AiService.getSuggestions()` (min 2 chars for suggestions)
  - [x] 7.3 Render `Image_Preview` with loading skeleton, fetched image (lazy-load), and fallback placeholder on error
  - [x] 7.4 Render `Suggestion_Dropdown` with matched-substring highlighting, keyboard navigation (ArrowUp/ArrowDown/Enter/Escape), and close-on-clear behavior
  - [x] 7.5 On destination selection (click or Enter): call `AiService.getItinerarySuggestions()`, render attraction list below input, emit `destinationSelected`
  - [x] 7.6 Display user-readable error states for image errors, attraction errors, and 429 responses
  - [x] 7.7 Create `frontend/src/app/components/destination-search/destination-search.component.html` with Tailwind CSS styling consistent with existing dashboard design

- [x] 8. Frontend: `TrendingCardsComponent`
  - [x] 8.1 Create `frontend/src/app/components/trending-cards/trending-cards.component.ts` as a standalone component; call `AiService.getTrendingDestinations()` on `ngOnInit`; emit `@Output() destinationSelected: EventEmitter<string>` on card click
  - [x] 8.2 Create `frontend/src/app/components/trending-cards/trending-cards.component.html` rendering one card per destination (name + description), loading skeleton, and error state with Tailwind CSS

- [x] 9. Frontend: integrate AI components into `DashboardComponent`
  - [x] 9.1 Import and embed `DestinationSearchComponent` and `TrendingCardsComponent` in `DashboardComponent`
  - [x] 9.2 Listen to `destinationSelected` events from both child components and populate `form.destination` in the itinerary creation form
  - [x] 9.3 Display 429 rate-limit message in the dashboard when received from any AI service call

- [x] 10. Backend property-based tests
  - [x] 10.1 Install `fast-check` as a dev dependency in the root `package.json`
  - [x] 10.2 Write property test for **Property 1** (input validation rejects invalid params): generate strings with HTML, non-printable chars, and length > 200; assert 400 and external API mock never called — tag: `Feature: ai-travel-enhancements, Property 1`
  - [x] 10.3 Write property test for **Property 2** (cache round-trip for image URLs): generate valid place names, call image route twice, assert same URL and `X-Cache: HIT` on second call — tag: `Feature: ai-travel-enhancements, Property 2`
  - [x] 10.4 Write property test for **Property 3** (cache round-trip for suggestions): generate valid queries, call suggestions route twice, assert identical arrays and `X-Cache: HIT` — tag: `Feature: ai-travel-enhancements, Property 3`
  - [x] 10.5 Write property test for **Property 4** (X-Cache header invariant): for each route, assert first call has `X-Cache: MISS` and second has `X-Cache: HIT`, never both — tag: `Feature: ai-travel-enhancements, Property 4`
  - [x] 10.6 Write property test for **Property 5** (rate limiter per-IP cap): generate N > 60 requests from same IP; assert first 60 succeed and remainder return 429 with `Retry-After` — tag: `Feature: ai-travel-enhancements, Property 5`
  - [x] 10.7 Write property test for **Property 6** (suggestion count bounds): generate valid queries with mocked Gemini; assert response array length is always 1–8 — tag: `Feature: ai-travel-enhancements, Property 6`
  - [x] 10.8 Write property test for **Property 7** (trending structure invariant): generate mocked Gemini responses; assert exactly 5 objects with non-empty name and description ≤ 100 chars — tag: `Feature: ai-travel-enhancements, Property 7`
  - [x] 10.9 Write property test for **Property 8** (itinerary attraction structure invariant): generate valid place names with mocked Gemini; assert exactly 5 objects with non-empty name and description ≤ 150 chars — tag: `Feature: ai-travel-enhancements, Property 8`

- [x] 11. Backend unit tests
  - [x] 11.1 Write unit tests for `rateLimiter`: under-limit, at-limit, over-limit, different IPs are independent
  - [x] 11.2 Write unit tests for `inputValidator`: valid input passes, HTML injection rejected, non-printable chars rejected, oversized string rejected, sanitized value attached to `req.sanitized`
  - [x] 11.3 Write unit tests for `inMemoryCache`: set/get round-trip, TTL expiry, miss after expiry, hit before expiry
  - [x] 11.4 Write unit tests for each AI route handler: mock `fetch`, verify response shape, status codes, and `X-Cache` headers for both cache-hit and cache-miss paths

- [x] 12. Frontend unit tests (Vitest)
  - [x] 12.1 Write unit tests for `AiService`: mock `HttpClient`; verify correct URLs, query params, and error mapping for all four methods
  - [x] 12.2 Write unit tests for `DestinationSearchComponent`: debounce timing, suggestion selection, keyboard navigation, input validation guard, image loading/error states, attraction list rendering
  - [x] 12.3 Write unit tests for `TrendingCardsComponent`: renders correct card count, emits `destinationSelected` on click, shows error state on failure
