import {
  Component, Input, OnChanges, OnDestroy, SimpleChanges,
  ElementRef, AfterViewInit, PLATFORM_ID, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export interface MapPin {
  lat: number;
  lng: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full relative">
      <div #mapEl class="w-full h-full rounded-3xl"></div>
      <div *ngIf="!mapReady"
           class="absolute inset-0 flex items-center justify-center bg-white/5 rounded-3xl">
        <span class="material-symbols-outlined text-4xl text-[#7ae0c3] opacity-60">map</span>
      </div>
    </div>
  `,
})
export class MapCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lat = 0;
  @Input() lng = 0;
  @Input() pins: MapPin[] = [];
  @Input() routeSegments: Array<Array<[number, number]>> = [];

  private platformId = inject(PLATFORM_ID);
  private elRef = inject(ElementRef);

  private mapInstance: any = null;
  private markersLayer: any = null;
  private routeLayer: any = null;
  mapReady = false;

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapInstance) return;
    if (changes['pins'] || changes['routeSegments']) {
      this.updateOverlays();
    }
    if (changes['lat'] || changes['lng']) {
      this.mapInstance.setView([this.lat, this.lng], 12);
    }
  }

  ngOnDestroy(): void {
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }

  private async initMap(): Promise<void> {
    try {
      const L = await import('leaflet');

      const container = this.elRef.nativeElement.querySelector('div[id], div') as HTMLElement;
      const mapEl = this.elRef.nativeElement.querySelector('[class*="rounded"]') as HTMLElement;
      if (!mapEl) return;

      // Fix Leaflet default icon path in bundled apps
      (L as any).Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      this.mapInstance = L.map(mapEl, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([this.lat || 20, this.lng || 0], this.lat ? 12 : 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(this.mapInstance);

      this.markersLayer = L.layerGroup().addTo(this.mapInstance);
      this.routeLayer = L.layerGroup().addTo(this.mapInstance);

      this.mapReady = true;
      this.updateOverlays();
    } catch (err) {
      console.warn('[MapCanvas] Failed to initialize map:', err);
    }
  }

  private async updateOverlays(): Promise<void> {
    if (!this.mapInstance) return;
    const L = await import('leaflet');

    this.markersLayer.clearLayers();
    this.routeLayer.clearLayers();

    const validPins = (this.pins || []).filter(p => p.lat !== 0 || p.lng !== 0);

    validPins.forEach((pin, idx) => {
      const color = idx === 0 ? '#7ae0c3' : '#ff8d70';
      const icon = L.divIcon({
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:${color};border:2px solid #fff;
          transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.3)">
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        className: '',
      });

      L.marker([pin.lat, pin.lng], { icon })
        .bindPopup(`<strong>${pin.name}</strong>${pin.description ? `<br><small>${pin.description}</small>` : ''}`)
        .addTo(this.markersLayer);
    });

    // Draw route polylines
    (this.routeSegments || []).forEach(segment => {
      if (segment && segment.length >= 2) {
        L.polyline(segment as any, {
          color: '#7ae0c3',
          weight: 3,
          opacity: 0.7,
          dashArray: '6 4',
        }).addTo(this.routeLayer);
      }
    });

    // Fit bounds to all pins
    if (validPins.length > 1) {
      const bounds = L.latLngBounds(validPins.map(p => [p.lat, p.lng] as [number, number]));
      this.mapInstance.fitBounds(bounds, { padding: [40, 40] });
    } else if (validPins.length === 1) {
      this.mapInstance.setView([validPins[0].lat, validPins[0].lng], 12);
    }
  }
}
