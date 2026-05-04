import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-itinerary-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './itinerary-detail.component.html',
})
export class ItineraryDetailComponent implements OnInit {
  itinerary: any = null;
  loading = true;
  openDay: number | null = 0;
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    // Skip HTTP call on server — no auth token available
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.itinerary = this.mockItinerary;
      this.loading = false;
      return;
    }
    this.http.get<any>(`${environment.apiUrl}/api/itinerary/${id}`).subscribe({
      next: (res) => {
        // Backend returns the document directly (not wrapped in { data: ... })
        this.itinerary = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load itinerary:', err);
        this.itinerary = this.mockItinerary;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleDay(i: number) { this.openDay = this.openDay === i ? null : i; }

  mockItinerary = {
    title: 'Amalfi Coast Escape',
    destination: 'Positano, Italy',
    duration: 10,
    budget: 4200,
    description: 'Experience the quintessence of Italian luxury and coastal charm. This meticulously curated 10-day itinerary balances adventurous cliffside hikes with leisurely afternoon aperitivos overlooking the Tyrrhenian Sea.',
    createdBy: 'Elena Rossi',
    days: [
      { title: 'Arrival & Sorrento Sunset', summary: 'Arrival at Naples Airport, private transfer to Sorrento hotel.' },
      { title: 'Positano Vertical Exploration', summary: 'Scenic drive to Positano followed by a private walking tour.' },
      { title: 'Capri Island Glitz', summary: 'Hydrofoil to Capri, boat tour around the Faraglioni rocks.' },
    ],
    tips: [
      'Book the ferry to Capri at least 48 hours in advance during peak season.',
      'Comfortable walking shoes are non-negotiable for the "vertical city" of Positano.',
      'Tipping is usually a modest "coperto" included in the bill.',
    ],
    highlights: ['PRIVATE BOAT TOUR', 'MICHELIN DINING', 'PATH OF THE GODS HIKE', 'LIMONCELLO TASTING'],
  };
}
