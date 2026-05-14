import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

// Public Invidious instances - user can configure their own
const DEFAULT_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://invidious.private.coffee",
  "https://inv.nadeko.net",
];

export const invidious: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const baseUrl = DEFAULT_INSTANCES[0];

  return (
    await grab(`${baseUrl}/api/v1/search`, {
      q: query,
      page: page || 1,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 10000,
      onResponse(path: string, jsonData: any) {
        const results = [] as any[];
        const json = jsonData;

        if (!json || !Array.isArray(json)) {
          const data = results;
          return [path, { data }];
        }

        for (const result of json) {
          if (result.type !== "video") {
            continue;
          }

          const videoId = result.videoId;
          if (!videoId) continue;

          const url = `${baseUrl}/watch?v=${videoId}`;

          // Find thumbnail
          const thumbs = result.videoThumbnails || [];
          let thumbnail = "";
          const sdThumb = thumbs.find((t: any) => t.quality === "sddefault");
          if (sdThumb) {
            thumbnail = sdThumb.url;
            // Handle partial URLs
            if (thumbnail && !thumbnail.startsWith("http")) {
              thumbnail = baseUrl + thumbnail;
            }
          }

          // Format duration
          const lengthSeconds = result.lengthSeconds || 0;
          const hours = Math.floor(lengthSeconds / 3600);
          const minutes = Math.floor((lengthSeconds % 3600) / 60);
          const seconds = lengthSeconds % 60;
          const length =
            hours > 0
              ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
              : `${minutes}:${seconds.toString().padStart(2, "0")}`;

          const content = [
            result.description || "",
            result.author ? `By: ${result.author}` : "",
            result.viewCount ? `Views: ${result.viewCount.toLocaleString()}` : "",
            length ? `Duration: ${length}` : "",
          ]
            .filter(Boolean)
            .join(" | ");

          results.push({
            url,
            title: result.title || "",
            content,
            engine: "invidious",
            thumbnail,
            iframe_src: `${baseUrl}/embed/${videoId}`,
          });
        }

        const data = results;
        return [path, { data }];
      },
    })
  )?.data;
};
