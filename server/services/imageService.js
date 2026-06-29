const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
const imageCache = new Map();

async function generateKeyword(place) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return place;

  try {
    const prompt = `Convert the place name '${place}' into a short, clean keyword suitable for searching travel images. Output only the keyword, no markdown.`;
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) throw new Error('Gemini failed');
    const data = await response.json();
    const keyword = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || place;
    return keyword;
  } catch (err) {
    console.error("Gemini keyword generation failed, using fallback:", err.message);
    return place;
  }
}

async function triggerDownload(photoId) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || !photoId) return;
  try {
    // We just hit the download endpoint as required by Unsplash
    await fetch(`https://api.unsplash.com/photos/${photoId}/download?client_id=${accessKey}`);
  } catch (err) {
    console.error("Failed to trigger Unsplash download:", err.message);
  }
}

async function fetchUnsplashImage(keyword) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) throw new Error("UNSPLASH_ACCESS_KEY is missing");

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&client_id=${accessKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const errData = await response.text();
    throw new Error(`Unsplash API error: ${response.status} ${errData}`);
  }

  const data = await response.json();
  if (data.results && data.results.length > 0) {
    const photo = data.results[0];
    
    // Trigger download in background asynchronously
    triggerDownload(photo.id);

    return {
      image: photo.urls.regular || photo.urls.small,
      photographer: photo.user.name,
      profile: photo.user.links.html
    };
  }
  
  return null;
}

async function enrichWithImage(place) {
  if (!place) return null;

  // 1. Check cache
  if (imageCache.has(place)) {
    return imageCache.get(place);
  }

  try {
    // 2. Generate search keyword
    const keyword = await generateKeyword(place);
    
    // 3. Fetch image from Unsplash
    const imageData = await fetchUnsplashImage(keyword);
    
    if (imageData) {
      // 4. Cache and return
      imageCache.set(place, imageData);
      return imageData;
    }
  } catch (error) {
    console.error(`Failed to enrich image for ${place}:`, error.message);
  }

  return null; // Return null if failed so frontend can use fallback
}

module.exports = {
  enrichWithImage
};
