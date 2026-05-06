import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

// Multiple Invidious instances for fallback
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.privacyredirect.com",
  "https://yewtu.be",
  "https://invidious.nerdvpn.de",
  "https://inv.riverside.rocks",
];

async function tryInvidiousInstances(
  query: string,
  page: number | undefined
): Promise<any> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const result = await grab(`${instance}/api/v1/search`, {
        q: query,
        page: page || 1,
        type: "video",
        headers: {
          "User-Agent": "HonoxSearX/1.0",
        },
        timeout: 5000,
        onResponse(path: string, jsonData: any) {
          const results = [] as any[];
          const json = jsonData;

          if (Array.isArray(json)) {
            json.forEach((item: any) => {
              if (item.type === "video") {
                const duration = item.lengthSeconds
                  ? `${Math.floor(item.lengthSeconds / 60)}:${String(item.lengthSeconds % 60).padStart(2, "0")}`
                  : "";
                const views = item.viewCount
                  ? item.viewCount.toLocaleString()
                  : "";
                const published = item.publishedText || "";

                results.push({
                  url: `https://www.youtube.com/watch?v=${item.videoId}`,
                  title: item.title,
                  content: `${item.description || ""} | ${duration} | ${views} views | ${published}`.trim(),
                  thumbnail:
                    item.videoThumbnails && item.videoThumbnails.length > 0
                      ? item.videoThumbnails[0].url
                      : undefined,
                  engine: "youtube",
                });
              }
            });
          }

          const data = results;
          return [path, { data }];
        },
      });

      // If successful, return the result
      if (result?.data) {
        return result.data;
      }
    } catch (error) {
      // Try next instance
      continue;
    }
  }

  // All instances failed, return empty array
  return [];
}

export const youtube: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  return await tryInvidiousInstances(query, page);
};
