# Requirements Document

## Introduction

This document defines requirements for an AI-powered enhancement layer added to an existing Travel Itinerary Web Application (Angular frontend, Node.js/Express backend, MongoDB). The enhancements introduce four capabilities: automatic destination image fetching, AI-based place autocomplete suggestions, trending destination recommendations, and smart itinerary attraction suggestions. All AI and third-party API calls are proxied through the backend to protect API keys.

## Glossary

- **Image_Service**: The backend Express service responsible for fetching destination images from the Unsplash API.
- **Suggestion_Service**: The backend Express service responsible for returning place autocomplete suggestions via the Google Places Autocomplete API or Gemini API.
- **Trending_Service**: The backend Express service responsible for returning trending travel destinations via the Gemini API.
- **Itinerary_Service**: The backend Express service responsible for returning attraction suggestions for a given destination via the Gemini API.
- **Cache**: An in-memory (or optional Redis) store on the backend that holds API responses to avoid redundant external calls.
- **Destination_Input**: The Angular input field where the user types a place or destination name.
- **Image_Preview**: The Angular UI component that displays the fetched destination image beside the Destination_Input.
- **Suggestion_Dropdown**: The Angular UI component that displays autocomplete place suggestions below the Destination_Input.
- **Trending_Cards**: The Angular UI component that displays trending destination cards below the search area.
- **Angular_Client**: The Angular frontend application.
- **API_Proxy**: The Express backend acting as an intermediary between the Angular_Client and external APIs.
- **Gemini_API**: Google's Gemini generative AI REST API used for suggestions and recommendations.
- **Unsplash_API**: The Unsplash image search REST API used for destination images.
- **Rate_Limiter**: A backend middleware that restricts the number of requests per client within a time window.
- **Debounce**: A frontend technique that delays triggering an API call until the user has stopped typing for a specified duration.

---

## Requirements

### Requirement 1: Destination Image Auto-Fetch

**User Story:** As a traveler, I want a relevant image to appear automatically when I type a destination name, so that I can visually confirm the place I am planning to visit.

#### Acceptance Criteria

1. WHEN the user types in the Destination_Input and no further keypress occurs within 400ms, THE Angular_Client SHALL send a GET request to `/api/image?place={destination}`.
2. WHILE the image fetch request is in progress, THE Image_Preview SHALL display a loading placeholder animation.
3. WHEN the Image_Service receives a valid place name, THE Image_Service SHALL return a relevant image URL from the Unsplash_API within 3 seconds.
4. WHEN the Image_Service returns a valid image URL, THE Image_Preview SHALL display the image beside the Destination_Input.
5. IF the Unsplash_API returns no results for the given place name, THEN THE Image_Service SHALL return a 404 response with a descriptive error message.
6. IF the Unsplash_API request fails due to a network or API error, THEN THE Image_Service SHALL return a 502 response with a descriptive error message.
7. IF the Image_Service returns an error response, THEN THE Image_Preview SHALL display a fallback placeholder image.
8. WHEN the Image_Service receives a request for a place name that exists in the Cache, THE Image_Service SHALL return the cached image URL without calling the Unsplash_API.
9. THE Image_Preview SHALL lazy-load the destination image to avoid blocking page rendering.
10. THE Angular_Client SHALL validate that the place name in the Destination_Input contains only printable characters and does not exceed 200 characters before sending the request to the API_Proxy.

---

### Requirement 2: AI-Based Place Autocomplete Suggestions

**User Story:** As a traveler, I want to see place name suggestions as I type, so that I can quickly find and select the correct destination without spelling errors.

#### Acceptance Criteria

1. WHEN the user types at least 2 characters in the Destination_Input and no further keypress occurs within 400ms, THE Angular_Client SHALL send a GET request to `/api/suggestions?q={query}`.
2. WHEN the Suggestion_Service receives a query of at least 2 characters, THE Suggestion_Service SHALL return a list of between 1 and 8 place suggestions.
3. WHEN the Suggestion_Service returns suggestions, THE Suggestion_Dropdown SHALL display the suggestions below the Destination_Input within 500ms of the response being received.
4. WHEN the Suggestion_Dropdown is visible, THE Angular_Client SHALL highlight the substring of each suggestion that matches the current query text.
5. WHEN the user selects a suggestion from the Suggestion_Dropdown, THE Angular_Client SHALL populate the Destination_Input with the selected suggestion value and close the Suggestion_Dropdown.
6. WHEN the user clears the Destination_Input, THE Angular_Client SHALL close the Suggestion_Dropdown.
7. IF the Suggestion_Service receives a query shorter than 2 characters, THEN THE Suggestion_Service SHALL return a 400 response with a descriptive error message.
8. IF the external suggestions API returns no results, THEN THE Suggestion_Service SHALL return an empty array with a 200 response.
9. IF the external suggestions API request fails, THEN THE Suggestion_Service SHALL return a 502 response with a descriptive error message.
10. WHEN the Suggestion_Service receives a request for a query that exists in the Cache, THE Suggestion_Service SHALL return the cached suggestions without calling the external API.
11. THE Suggestion_Dropdown SHALL support keyboard navigation so that the user can move between suggestions using the arrow keys and confirm a selection using the Enter key.

---

### Requirement 3: Trending Destinations

**User Story:** As a traveler, I want to see a list of currently popular travel destinations, so that I can discover new places to add to my itinerary.

#### Acceptance Criteria

1. WHEN the Angular_Client loads the search page, THE Angular_Client SHALL send a GET request to `/api/trending`.
2. WHEN the Trending_Service receives a request, THE Trending_Service SHALL query the Gemini_API with the prompt "Suggest 5 trending travel destinations in 2026 with short descriptions" and return a list of exactly 5 destination objects, each containing a name and a short description of no more than 100 characters.
3. WHEN the Trending_Service returns the destination list, THE Trending_Cards SHALL render one card per destination, displaying the destination name and description.
4. WHEN the user clicks a Trending_Cards card, THE Angular_Client SHALL populate the Destination_Input with the selected destination name.
5. WHEN the Trending_Service has a valid response in the Cache that is less than 24 hours old, THE Trending_Service SHALL return the cached response without calling the Gemini_API.
6. IF the Gemini_API request fails, THEN THE Trending_Service SHALL return a 502 response with a descriptive error message.
7. IF the Trending_Service returns an error response, THEN THE Trending_Cards SHALL display a user-readable error message in place of the cards.

---

### Requirement 4: Smart Itinerary Attraction Suggestions

**User Story:** As a traveler, I want to see top attractions for a destination I have selected, so that I can build a richer itinerary without manual research.

#### Acceptance Criteria

1. WHEN the user selects a destination (either by submitting the Destination_Input or clicking a Suggestion_Dropdown item), THE Angular_Client SHALL send a GET request to `/api/itinerary-suggestions?place={destination}`.
2. WHEN the Itinerary_Service receives a valid place name, THE Itinerary_Service SHALL query the Gemini_API with the prompt "Suggest top 5 attractions in {destination} for a travel itinerary" and return a list of exactly 5 attraction objects, each containing a name and a short description of no more than 150 characters.
3. WHEN the Itinerary_Service returns the attraction list, THE Angular_Client SHALL display the attractions in a readable list below the Destination_Input.
4. WHEN the Itinerary_Service receives a request for a place name that exists in the Cache, THE Itinerary_Service SHALL return the cached attractions without calling the Gemini_API.
5. IF the Itinerary_Service receives an empty or missing place name, THEN THE Itinerary_Service SHALL return a 400 response with a descriptive error message.
6. IF the Gemini_API request fails, THEN THE Itinerary_Service SHALL return a 502 response with a descriptive error message.
7. IF the Itinerary_Service returns an error response, THEN THE Angular_Client SHALL display a user-readable error message in place of the attraction list.

---

### Requirement 5: API Proxy Security and Input Validation

**User Story:** As a system operator, I want all external API keys to remain on the server and all user input to be validated, so that the application is protected from key exposure and injection attacks.

#### Acceptance Criteria

1. THE API_Proxy SHALL read all external API keys exclusively from environment variables and SHALL never include API keys in any response sent to the Angular_Client.
2. THE API_Proxy SHALL validate that all query parameters contain only printable Unicode characters and do not exceed 200 characters before forwarding any request to an external API.
3. IF a query parameter fails validation, THEN THE API_Proxy SHALL return a 400 response with a descriptive error message and SHALL not forward the request to any external API.
4. THE API_Proxy SHALL sanitize all query parameters by stripping HTML tags and script content before using them in external API requests.

---

### Requirement 6: Rate Limiting

**User Story:** As a system operator, I want to limit the number of API requests each client can make, so that the application is protected from abuse and excessive third-party API costs.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL restrict each client IP address to a maximum of 60 requests per minute across all `/api/*` endpoints.
2. IF a client exceeds the rate limit, THEN THE Rate_Limiter SHALL return a 429 response with a descriptive error message and a `Retry-After` header indicating when the client may retry.
3. THE Angular_Client SHALL display a user-readable message when a 429 response is received, informing the user to wait before retrying.

---

### Requirement 7: Image and Suggestion Caching Round-Trip Consistency

**User Story:** As a system operator, I want cached responses to be consistent with live API responses, so that users receive accurate data regardless of whether a cache hit or miss occurs.

#### Acceptance Criteria

1. FOR ALL valid place name inputs, THE Cache SHALL store and return the same image URL structure that the Unsplash_API returns directly.
2. FOR ALL valid query inputs, THE Cache SHALL store and return the same suggestion list structure that the external suggestions API returns directly.
3. WHEN a cached entry is retrieved, THE API_Proxy SHALL include a response header `X-Cache: HIT` to indicate the response was served from cache.
4. WHEN a live API response is returned, THE API_Proxy SHALL include a response header `X-Cache: MISS` to indicate the response was fetched from the external API.
