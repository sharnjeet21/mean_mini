const ITINERARY_IMAGES = [
  '/images/santorini.jpg',
  '/images/kyoto.jpg',
  '/images/alps.jpg',
] as const;

export function getItineraryImage(itinerary: {
  _id?: string;
  title?: string;
  destination?: string;
}): string {
  const identity = `${itinerary._id || ''}|${itinerary.title || ''}|${itinerary.destination || ''}`;
  let hash = 0;

  for (let index = 0; index < identity.length; index += 1) {
    hash = ((hash << 5) - hash + identity.charCodeAt(index)) | 0;
  }

  return ITINERARY_IMAGES[Math.abs(hash) % ITINERARY_IMAGES.length];
}
