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
  @Input() routeSegments: any[] = [];

  private platformId = inject(PLATFORM_ID);
  private map: any = null;
  private markers: any[] = [];
  private routeLayers: any[] = [];
  private L: any = null;

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.L = await import('leaflet');
      const maplibregl = await import('maplibre-gl');
      (window as any).maplibregl = maplibregl.default || maplibregl;
      await import('@maplibre/maplibre-gl-leaflet');
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
    if (changes['routeSegments']) {
      this.updateRoutes();
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

    // Define OpenFreeMap Basemaps using MapLibre vector tiles
    const darkMap = this.L.maplibreGL({
      style: 'https://tiles.openfreemap.org/styles/dark',
      attribution: '&copy; <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
    });

    const libertyMap = this.L.maplibreGL({
      style: 'https://tiles.openfreemap.org/styles/liberty',
      attribution: '&copy; <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
    });

    const positronMap = this.L.maplibreGL({
      style: 'https://tiles.openfreemap.org/styles/positron',
      attribution: '&copy; <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
    });

    // Default to darkMap
    darkMap.addTo(this.map);

    const baseMaps = {
      "Dark View": darkMap,
      "Detailed View": libertyMap,
      "Light View": positronMap
    };
    
    // Add Layer Control
    this.L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.map);

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
    
    // Clear implicit route lines if they exist
    if ((this as any)._implicitRouteLine) {
      (this as any)._implicitRouteLine.remove();
      (this as any)._implicitRouteLine = null;
    }

    const latlngs: any[] = [];

    this.pins.forEach(pin => {
      latlngs.push([pin.lat, pin.lng]);
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

    // Draw route path connecting pins if there are multiple pins
    if (this.pins.length > 1) {
      (this as any)._implicitRouteLine = this.L.polyline(latlngs, {
        color: '#ffc96b',
        weight: 3,
        opacity: 0.8,
        dashArray: '6, 8',
        lineCap: 'round'
      }).addTo(this.map);
    }

    // Auto-fit bounds if we have multiple pins
    if (this.pins.length > 0) {
      const group = this.L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  private updateRoutes(): void {
    if (!this.map || !this.L) return;

    // Clear existing route layers
    this.routeLayers.forEach(layer => layer.remove());
    this.routeLayers = [];

    if (!this.routeSegments || this.routeSegments.length === 0) return;

    this.routeSegments.forEach(segment => {
      if (segment && segment.geometry) {
        const layer = this.L.geoJSON(segment.geometry, {
          style: {
            color: '#ffc96b',
            weight: 4,
            opacity: 0.9,
            dashArray: '6, 8',
            lineCap: 'round'
          }
        }).bindPopup(`
          <div style="color: #0c1c24; font-family: sans-serif; padding: 2px;">
            <strong style="display:block;font-size:12px;">${segment.originName} &rarr; ${segment.destinationName}</strong>
            <span style="font-size:11px;color:#4f6b7a;">${segment.mode}: ${segment.durationMin} mins (${segment.distanceKm} km)</span>
          </div>
        `).addTo(this.map);
        this.routeLayers.push(layer);
      }
    });
  }
}
