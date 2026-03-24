import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Parameterized routes cannot be prerendered without getPrerenderParams
  { path: 'itinerary/:id', renderMode: RenderMode.Server },
  // All other routes prerender normally
  { path: '**', renderMode: RenderMode.Prerender },
];
