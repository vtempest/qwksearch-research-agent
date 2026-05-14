import grab from "grab-url";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface.js";

export const wikipedia: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://en.wikipedia.org/w/api.php", {
      action: "query",
      list: "search",
      srsearch: query,
      format: "json",
      sroffset: ((page || 1) - 1) * 10,
        headers: {
          "User-Agent": "HonoxSearX/1.0 (mailto:admin@example.com)",
        },
        onResponse(path: string, response: any) {
          const results: EngineResult[] = (
            response.query?.search || []
          ).map((item: any) => ({
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
              item.title.replace(/ /g, "_")
            )}`,
            title: item.title,
            content: item.snippet.replace(/<[^>]+>/g, ""),
            engine: "wikipedia",
          }));

          return [path, { data: results }];
        },
      }
    )
  )?.data;
