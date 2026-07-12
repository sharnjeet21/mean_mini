import { Component, Input, OnInit, PLATFORM_ID, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-canvas.component.html',
  styles: [`
    .map-container {
      height: 100%;
      width: 100%;
      min-height: 350px;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  `]
})
export class MapCanvasComponent implements OnInit, OnChanges {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Input() pins: { name: string; description: string; lat: number; lng: number }[] = [];

  private platformId = inject(PLATFORM_ID);
  private map: any = null;
  private markers: any[] = [];
  private L: any = null;

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.L = await import('leaflet');
      this.initMap();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.map || !this.L) return;

    if (changes['lat'] || changes['lng']) {
      this.updateViewport();
    }
    if (changes['pins']) {
      this.updatePins();
    }
  }

  private initMap(): void {
    const defaultLat = this.lat || 20.5937; // default India center
    const defaultLng = this.lng || 78.9629;
    const initialZoom = this.lat ? 12 : 5;

    this.map = this.L.map('map-element', {
      center: [defaultLat, defaultLng],
      zoom: initialZoom,
      zoomControl: false
    });

    this.L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Use OpenStreetMap / Mapbox tiles
    this.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(this.map);

    this.updatePins();
  }

  private updateViewport(): void {
    if (this.lat && this.lng) {
      this.map.setView([this.lat, this.lng], 12, { animate: true });
    }
  }

  private updatePins(): void {
    if (!this.map || !this.L) return;

    // Clear existing markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    this.pins.forEach(pin => {
      // Use clean circular canvas markers for a premium dark layout
      const marker = this.L.circleMarker([pin.lat, pin.lng], {
        radius: 8,
        fillColor: '#7ae0c3',
        color: '#05201f',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(this.map);

      marker.bindPopup(`
        <div style="color: #0c1c24; font-family: sans-serif; padding: 2px;">
          <strong style="display:block;font-size:13px;margin-bottom:4px;">${pin.name}</strong>
          <span style="font-size:11px;color:#4f6b7a;line-height:1.4;">${pin.description}</span>
        </div>
      `);

      this.markers.push(marker);
    });

    // Auto-fit bounds if we have multiple pins
    if (this.pins.length > 0) {
      const group = this.L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }
}
