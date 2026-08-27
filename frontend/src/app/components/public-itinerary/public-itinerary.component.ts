import { Component, OnInit, ChangeDetectorRef, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AiService } from '../../services/ai.service';
import { CurrencyService } from '../../services/currency.service';
import { MapCanvasComponent, MapPin } from '../map-canvas/map-canvas.component';

@Component({
  selector: 'app-public-itinerary',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MapCanvasComponent],
  templateUrl: './public-itinerary.component.html',
})
export class PublicItineraryComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private api      = inject(ApiService);
  private ai       = inject(AiService);
  private cdr      = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  currencyService  = inject(CurrencyService);

  itinerary: any = null;
  loading  = true;
  error    = '';
  imageUrl = '';

  // Map state
  mapLat: number | null = null;
  mapLng: number | null = null;
  mapPins: MapPin[] = [];
  mapRouteSegments: Array<Array<[number, number]>> = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error   = 'Invalid proposal link.';
      this.loading = false;
      return;
    }

    this.api.getPublicItinerary(id).subscribe({
      next: (res: any) => {
        this.itinerary = res;
        this.imageUrl  = this.resolveImage(res);
        this.loading   = false;
        this.cdr.detectChanges();
        this.loadMapData();
      },
      error: (err: any) => {
        this.error   = err?.error?.message || 'This proposal could not be loaded. It may be private or deleted.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private resolveImage(it: any): string {
    if (it.imageUrl?.startsWith('http')) return it.imageUrl;
    const dest = (it.destination || it.title || '').toLowerCase();
    if (dest.includes('paris'))               return 'https://images.unsplash.com/photo-1502602881460-59df98cb3258?w=1200&q=80';
    if (dest.includes('tokyo'))               return 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80';
    if (dest.includes('swiss') || dest.includes('zurich')) return 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1200&q=80';
    if (dest.includes('bali') || dest.includes('ubud'))    return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80';
    if (dest.includes('kyoto') || dest.includes('japan'))  return 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=80';
    if (dest.includes('india') || dest.includes('ladakh')) return 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&q=80';
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80';
  }

  private loadMapData(): void {
    if (!this.itinerary?.destination) return;

    this.ai.geocode(this.itinerary.destination).subscribe({
      next: (geo) => {
        if (!geo.lat && !geo.lng) return;

        this.mapLat = geo.lat;
        this.mapLng = geo.lng;

        const mainPin: MapPin = {
          name: this.itinerary.destination,
          description: this.itinerary.title,
          lat: geo.lat,
          lng: geo.lng,
        };

        // Collect unique locations from the daily plan
        const seen = new Set<string>();
        const locs: { name: string; query: string; desc: string }[] = [];

        (this.itinerary.dailyPlan || []).forEach((day: any) => {
          (day.activities || []).forEach((act: any) => {
            const loc = (act.location || '').trim();
            if (loc && !seen.has(loc)) {
              seen.add(loc);
              const query = loc.toLowerCase().includes(this.itinerary.destination.toLowerCase())
                ? loc
                : `${loc}, ${this.itinerary.destination}`;
              locs.push({ name: loc, query, desc: act.activity || 'Activity' });
            }
          });
        });

        if (locs.length === 0) {
          this.mapPins = [mainPin];
          this.cdr.detectChanges();
          return;
        }

        // Geocode all locations in parallel, limit to 6 to avoid rate-limiting
        const limited = locs.slice(0, 6);
        forkJoin(
          limited.map(l => this.ai.geocode(l.query).pipe(catchError(() => of({ lat: 0, lng: 0 }))))
        ).subscribe({
          next: (results) => {
            const pins: MapPin[] = [mainPin];
            results.forEach((r, i) => {
              if (r.lat || r.lng) {
                pins.push({ name: limited[i].name, description: limited[i].desc, lat: r.lat, lng: r.lng });
              }
            });
            this.mapPins = pins;

            // Build straight-line route segments between consecutive stops
            if (pins.length > 2) {
              const stops = pins.slice(1);
              forkJoin(
                stops.slice(0, -1).map((stop, i) =>
                  this.ai.getRouteDirections(
                    { lat: stop.lat, lng: stop.lng },
                    { lat: stops[i + 1].lat, lng: stops[i + 1].lng },
                    this.itinerary.transportMode || 'driving'
                  ).pipe(catchError(() => of([] as Array<[number, number]>)))
                )
              ).subscribe({
                next: (segs) => {
                  this.mapRouteSegments = segs as Array<Array<[number, number]>>;
                  this.cdr.detectChanges();
                },
              });
            } else {
              this.cdr.detectChanges();
            }
          },
          error: () => {
            this.mapPins = [mainPin];
            this.cdr.detectChanges();
          },
        });
      },
    });
  }
}
