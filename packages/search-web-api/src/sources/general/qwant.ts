import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const qwant: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://api.qwant.com/v3/search/web", {
      q: query,
      count: 10,
      offset: ((page || 1) - 1) * 10,
      locale: "en_US",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      onResponse(path: string, jsonData: any) {
        if (
          !jsonData ||
          !jsonData.data ||
          !jsonData.data.result ||
          !jsonData.data.result.items
        ) {
          const data = [] as any[];
          return [path, { data }];
        }

        const data = jsonData.data.result.items.map((item: any) => ({
          url: item.url,
          title: item.title,
          content: item.desc,
          engine: "qwant",
        }));

        return [path, { data }];
      },
    })
  )?.data;
