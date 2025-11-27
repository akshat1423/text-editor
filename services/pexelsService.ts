type PexelsPhoto = {
  src: {
    original?: string;
    large2x?: string;
    large?: string;
    medium?: string;
    small?: string;
    portrait?: string;
    landscape?: string;
    tiny?: string;
  };
  alt?: string;
  url?: string;
  photographer?: string;
  photographer_url?: string;
};

interface PexelsResponse {
  photos?: PexelsPhoto[];
}

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || "";
const PEXELS_BASE_URL = "https://api.pexels.com/v1/search";

const ensurePexelsKey = () => {
  if (!PEXELS_API_KEY) {
    throw new Error("Pexels API key is missing. Add VITE_PEXELS_API_KEY to your environment.");
  }
};

export interface PexelsImageResult {
  imageUrl: string;
  alt?: string;
  sourceUrl?: string;
  photographer?: string;
  photographerUrl?: string;
}

export const searchPexelsImage = async (query: string): Promise<PexelsImageResult> => {
  ensurePexelsKey();
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("Cannot search Pexels with an empty query.");
  }

  const url = new URL(PEXELS_BASE_URL);
  url.searchParams.set("query", trimmedQuery);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization:PEXELS_API_KEY,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Pexels request failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as PexelsResponse;
  const photo = data.photos?.[0];
  if (!photo) {
    throw new Error("No matching images were found on Pexels.");
  }

  const imageUrl = photo.src?.large2x || photo.src?.large || photo.src?.medium;
  if (!imageUrl) {
    throw new Error("Pexels returned a photo without an accessible source.");
  }

  return {
    imageUrl,
    alt: photo.alt,
    sourceUrl: photo.url,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
  };
};
