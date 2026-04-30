import type { VideoResource } from "@/lib/types";

const FALLBACK_CHANNEL = "Educational Resources";

function buildFallbackVideos(topicOrQuery: string): VideoResource[] {
  return [
    {
      title: `${topicOrQuery} Full Course for Beginners`,
      videoId: "",
      channelTitle: FALLBACK_CHANNEL,
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topicOrQuery} beginner tutorial`)}`,
    },
    {
      title: `${topicOrQuery} Practical Project Walkthrough`,
      videoId: "",
      channelTitle: FALLBACK_CHANNEL,
      thumbnail: "https://img.youtube.com/vi/3JZ_D3ELwOQ/hqdefault.jpg",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topicOrQuery} project tutorial`)}`,
    },
    {
      title: `${topicOrQuery} Interview and Advanced Concepts`,
      videoId: "",
      channelTitle: FALLBACK_CHANNEL,
      thumbnail: "https://img.youtube.com/vi/L_jWHffIx5E/hqdefault.jpg",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topicOrQuery} advanced concepts`)}`,
    },
  ];
}

export async function fetchYouTubeVideos(query: string): Promise<VideoResource[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return buildFallbackVideos(query);
  }

  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodedQuery}&key=${apiKey}`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 3600,
      },
    });
    if (!response.ok) {
      throw new Error(`YouTube response ${response.status}`);
    }

    const data = (await response.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
        };
      }>;
    };

    const videos =
      data.items
        ?.map((item) => {
          const videoId = item.id?.videoId ?? "";
          if (!videoId) {
            return null;
          }
          const title = item.snippet?.title ?? "Untitled video";
          const channelTitle = item.snippet?.channelTitle ?? "Unknown channel";
          const thumbnail =
            item.snippet?.thumbnails?.high?.url ??
            item.snippet?.thumbnails?.medium?.url ??
            "";
          return {
            title,
            videoId,
            channelTitle,
            thumbnail,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          } satisfies VideoResource;
        })
        .filter((item): item is VideoResource => item !== null) ?? [];

    return videos.length > 0 ? videos : buildFallbackVideos(query);
  } catch {
    return buildFallbackVideos(query);
  }
}
