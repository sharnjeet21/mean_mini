import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AiService } from '../../services/ai.service';
import { MapCanvasComponent } from '../map-canvas/map-canvas.component';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-public-itinerary',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MapCanvasComponent],
  templateUrl: './public-itinerary.component.html'
})
export class PublicItineraryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private ai = inject(AiService);
  currencyService = inject(CurrencyService);
  private cdr = inject(ChangeDetectorRef);

  itinerary: any = null;
  loading = true;
  error = '';
  imageUrl = '';

  // Map state
  mapLat: number | null = null;
  mapLng: number | null = null;
  mapPins: any[] = [];
  mapRouteSegments: any[] = [];

  constructor() {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.api.getItinerary(id).subscribe({
        next: (res: any) => {
          this.itinerary = res;
          this.imageUrl = this.getItineraryImage(res);
          this.loading = false;
          this.loadMapData();
        },
        error: (err: any) => {
          this.error = 'Failed to load this proposal. It may be private or deleted.';
          this.loading = false;
        }
      });
    } else {
      this.error = 'Invalid itinerary link.';
      this.loading = false;
    }
  }

  loadMapData() {
    if (!this.itinerary || !this.itinerary.destination) return;
    
    this.ai.geocode(this.itinerary.destination).subscribe({
      next: (geo) => {
        this.mapLat = geo.lat;
        this.mapLng = geo.lng;
        
        const mainPin = {
          name: this.itinerary.destination,
          description: this.itinerary.title,
          lat: geo.lat,
          lng: geo.lng
        };

        // Extract unique locations in chronological order of appearance in the daily plan
        const orderedLocations: { name: string; query: string; desc: string }[] = [];
        const seenLocations = new Set<string>();

        if (this.itinerary.dailyPlan) {
          this.itinerary.dailyPlan.forEach((day: any) => {
            if (day.activities) {
              day.activities.forEach((act: any) => {
                if (act.location && act.location.trim() !== '') {
                  const loc = act.location.trim();
                  if (!seenLocations.has(loc)) {
                    seenLocations.add(loc);
                    const query = loc.toLowerCase().includes(this.itinerary.destination.toLowerCase()) 
                      ? loc 
                      : `${loc}, ${this.itinerary.destination}`;
                    orderedLocations.push({
                      name: loc,
                      query,
                      desc: act.activity || 'Activity'
                    });
                  }
                }
              });
            }
          });
        }

        if (orderedLocations.length === 0) {
          this.mapPins = [mainPin];
          this.cdr.detectChanges();
          return;
        }

        // Fetch geocodes for all ordered locations in parallel
        const geocodeObservables = orderedLocations.map(loc => 
          this.ai.geocode(loc.query)
        );

        import('rxjs').then(({ forkJoin }) => {
          forkJoin(geocodeObservables).subscribe({
            next: (results) => {
              const pins = [mainPin];
              results.forEach((locGeo, idx) => {
                pins.push({
                  name: orderedLocations[idx].name,
                  description: orderedLocations[idx].desc,
                  lat: locGeo.lat,
                  lng: locGeo.lng
                });
              });

              this.mapPins = pins;
              this.cdr.detectChanges();

              // Fetch route directions sequentially between adjacent pins (excluding the mainPin center)
              const stops = pins.slice(1);
              if (stops.length > 1) {
                const routeRequests: any[] = [];
                for (let i = 0; i < stops.length - 1; i++) {
                  routeRequests.push(
                    this.ai.getRouteDirections(
                      { lat: stops[i].lat, lng: stops[i].lng },
                      { lat: stops[i + 1].lat, lng: stops[i + 1].lng },
                      this.itinerary.transportMode || 'driving'
                    )
                  );
                }

                forkJoin(routeRequests).subscribe({
                  next: (routes) => {
                    this.mapRouteSegments = routes;
                    this.cdr.detectChanges();
                  },
                  error: (err) => {
                    console.warn('Failed to load route directions:', err);
                  }
                });
              }
            },
            error: (err) => {
              console.warn('Geocoding of daily plan stops failed:', err);
              this.mapPins = [mainPin];
              this.cdr.detectChanges();
            }
          });
        });
      },
      error: () => {
        console.warn('Map geocoding failed for', this.itinerary.destination);
      }
    });
  }

  getItineraryImage(itinerary: any): string {
    if (itinerary.imageUrl && itinerary.imageUrl.startsWith('http')) return itinerary.imageUrl;
    const desc = (itinerary.destination || itinerary.title || '').toLowerCase();
    if (desc.includes('paris')) return 'https://images.unsplash.com/photo-1502602881460-59df98cb3258';
    if (desc.includes('tokyo')) return 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf';
    if (desc.includes('swiss') || desc.includes('zurich')) return 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99';
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800'; // Default placeholder
  }
}
