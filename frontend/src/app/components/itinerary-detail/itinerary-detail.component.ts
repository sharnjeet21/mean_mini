import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-itinerary-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './itinerary-detail.component.html',
})
export class ItineraryDetailComponent implements OnInit {
  itinerary: any = null;
  openDay: number | null = 0;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<any>(`http://localhost:5000/api/itineraries/${id}`).subscribe({
      next: (res) => { this.itinerary = res.data || res; },
      error: () => { this.itinerary = this.mockItinerary; }
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
