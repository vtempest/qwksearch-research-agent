import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const unsplash: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://unsplash.com/napi/search/photos", {
      query: query,
      per_page: 20,
      page: page || 1,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const json = response?.data || response;

          if (!json || !json.results) {
            return [path, { data: [] }];
          }

          return [path, { data: json.results.map((item: any) => ({
            url: item.links.html,
            title:
              item.description ||
              item.alt_description ||
              "Unsplash Image",
            content: `By ${item.user.name}`,
            thumbnail: item.urls.small,
            engine: "unsplash",
          })) }];
        },
      }
    )
  )?.data;
