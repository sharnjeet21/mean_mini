# Travel Intelligence Platform — Affiliate & Monetization Layer

This document outlines the monetization strategy and integration hooks for affiliate services.

---

## 1. Monetization Strategy

The platform provides decision-support tools for travel plans. By matching custom itineraries with travel inventory, the platform generates affiliate commissions through:
* **Hotel Booking Referrals**: Partnerships with Booking.com, Expedia, or local boutique hotels.
* **Flights & Transport Referrals**: Flights search redirections via Skyscanner or Kayak.
* **Tour & Attraction Booking**: Curated activities referral commissions via GetYourGuide, Viator, or Klook.

---

## 2. In-Context Affiliate Injection

Affiliate links are injected dynamically into the itinerary view based on:
1. **Activity Categories**: If a day activity is labeled "sightseeing" or "adventure", the system matches the activity title to tours in the target destination.
2. **Hotel Recommendations**: Under the accommodation tab, recommendations display estimated room rates with a "Book on Booking.com" affiliate referral link.
3. **Flight Finder**: Transit segments suggest flight connections matched to the travel dates and origin.

---

## 3. Revenue & Analytics Tracking

To monitor conversions and performance, the system tracks:
* **Clicks**: Logged events when users click on affiliate cards.
* **Conversion Rate**: Ratio of itinerary views to affiliate redirections.
* **Estimated Commissions**: Calculated commission metrics aggregated in the Platform Operations Dashboard.
