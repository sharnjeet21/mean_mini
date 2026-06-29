/**
 * Returns a deterministic fallback image path for an itinerary.
 * Best-effort matching based on destination name.
 */

const FALLBACK_IMAGES: Record<string, string> = {
  japan: '/images/kyoto.jpg',
  kyoto: '/images/kyoto.jpg',
  greece: '/images/santorini.jpg',
  santorini: '/images/santorini.jpg',
  alps: '/images/alps.jpg',
  switzerland: '/images/alps.jpg',
};

const DEFAULT_IMAGE = '/images/alps.jpg';

function matchFallback(destination: string): string {
  const key = (destination || '').toLowerCase().trim();
  for (const [keyword, image] of Object.entries(FALLBACK_IMAGES)) {
    if (key.includes(keyword)) return image;
  }
  return DEFAULT_IMAGE;
}

export function getItineraryImage(itinerary: {
  _id?: string;
  title?: string;
  destination?: string;
}): string {
  if (itinerary?.destination) {
    return matchFallback(itinerary.destination);
  }
  return DEFAULT_IMAGE;
}

/**
 * Fetches a destination image from the AI-powered /api/image endpoint.
 * Falls back to the deterministic fallback on error.
 *
 * @param destination - The place name to look up
 * @returns Promise resolving to an image URL string
 */
export async function fetchItineraryImage(destination: string): Promise<string> {
  const fallback = matchFallback(destination);
  try {
    const baseUrl = (
      (typeof window !== 'undefined' && (window as any).__env?.apiUrl)
      || 'http://localhost:5000'
    );
    const response = await fetch(`${baseUrl}/api/v1/ai/image?place=${encodeURIComponent(destination)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    return data?.url || fallback;
  } catch {
    return fallback;
  }
}
