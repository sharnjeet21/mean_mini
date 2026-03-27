import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-itinerary-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './itinerary-detail.component.html',
})
export class ItineraryDetailComponent implements OnInit {
  itinerary: any = null;
  openDay: number | null = 0;
  booking = false;
  bookingSuccess = false;
  bookingError = '';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    // Mock IDs don't need API call
    if (id.startsWith('m')) {
      this.itinerary = this.mockItinerary;
      return;
    }

    this.api.getItinerary(id).subscribe({
      next: (res: any) => { this.itinerary = res?.data || res; },
      error: () => { this.itinerary = this.mockItinerary; }
    });
  }

  toggleDay(i: number) { this.openDay = this.openDay === i ? null : i; }

  bookItinerary() {
    if (!this.itinerary?._id || this.itinerary._id.startsWith('m')) {
      this.bookingError = 'Cannot book a demo itinerary. Please create a real one first.';
      return;
    }
    this.booking = true;
    this.bookingError = '';
    this.api.bookItinerary(this.itinerary._id).subscribe({
      next: () => {
        this.booking = false;
        this.bookingSuccess = true;
      },
      error: (err: any) => {
        this.booking = false;
        this.bookingError = err?.error?.message || 'Booking failed. Please try again.';
      }
    });
  }

  mockItinerary = {
    title: 'Amalfi Coast Escape',
    destination: 'Positano, Italy',
    duration: 10,
    budget: 4200,
    description: 'Experience the quintessence of Italian luxury and coastal charm. This meticulously curated 10-day itinerary balances adventurous cliffside hikes with leisurely afternoon aperitivos overlooking the Tyrrhenian Sea.',
    createdBy: 'Wanderer Team',
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
