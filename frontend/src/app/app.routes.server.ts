import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Auth-protected routes — render client-side only (no token available on server)
  { path: 'itinerary/:id', renderMode: RenderMode.Client },
  { path: 'dashboard', renderMode: RenderMode.Client },
  // All other routes prerender normally
  { path: '**', renderMode: RenderMode.Prerender },
];
