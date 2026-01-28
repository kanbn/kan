export function extractVideoId(url: string): string | null {
  if (!url) return null;
  url = url.trim();

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/.exec(url);
  if (watchMatch) return watchMatch[1] ?? null;

  // youtu.be/VIDEO_ID
  const shortMatch = /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(url);
  if (shortMatch) return shortMatch[1] ?? null;

  // youtube.com/embed/VIDEO_ID
  const embedMatch = /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/.exec(url);
  if (embedMatch) return embedMatch[1] ?? null;

  return null;
}

/**
 * Check if a URL is a valid YouTube link
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  const videoId = extractVideoId(url);
  return videoId !== null;
}

/**
 * Fetch YouTube video metadata using oEmbed API
 * Returns title, author, thumbnail URL, etc.
 * No API key required
 */
export async function fetchYouTubeMetadata(url: string): Promise<{
  title: string;
  author_name: string;
  thumbnail_url: string;
} | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      title: string;
      author_name: string;
      thumbnail_url: string;
    };
    return {
      title: data.title || "YouTube Video",
      author_name: data.author_name || "",
      thumbnail_url: data.thumbnail_url || "",
    };
  } catch (error) {
    console.error("Failed to fetch YouTube metadata:", error);
    return null;
  }
}
