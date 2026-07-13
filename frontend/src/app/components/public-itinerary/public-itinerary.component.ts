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
        
        let pins = [{
          name: this.itinerary.destination,
          description: this.itinerary.title,
          lat: geo.lat,
          lng: geo.lng
        }];

        // Extract locations from daily plan, appending the destination to prevent geocoding hallucinations
        const locationsToGeocode = new Map<string, { query: string; desc: string }>(); 
        if (this.itinerary.dailyPlan) {
          this.itinerary.dailyPlan.forEach((day: any) => {
            if (day.activities) {
              day.activities.forEach((act: any) => {
                if (act.location && act.location.trim() !== '') {
                  const loc = act.location.trim();
                  // Append destination if it's not already in the location string
                  const query = loc.toLowerCase().includes(this.itinerary.destination.toLowerCase()) 
                    ? loc 
                    : `${loc}, ${this.itinerary.destination}`;
                  locationsToGeocode.set(loc, { query, desc: act.activity || 'Activity' });
                }
              });
            }
          });
        }

        if (locationsToGeocode.size === 0) {
          this.mapPins = pins;
          this.cdr.detectChanges();
          return;
        }

        let pending = locationsToGeocode.size;
        locationsToGeocode.forEach((data, loc) => {
          this.ai.geocode(data.query).subscribe({
            next: (locGeo) => {
              pins.push({
                name: loc,
                description: data.desc,
                lat: locGeo.lat,
                lng: locGeo.lng
              });
              pending--;
              if (pending === 0) {
                this.mapPins = [...pins];
                this.cdr.detectChanges();
              }
            },
            error: () => {
              pending--;
              if (pending === 0) {
                this.mapPins = [...pins];
                this.cdr.detectChanges();
              }
            }
          });
        });
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
