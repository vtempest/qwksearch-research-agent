import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const wikidata: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://www.wikidata.org/w/api.php", {
      action: "wbsearchentities",
      search: query,
      language: "en",
      format: "json",
      limit: 20,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        onResponse(path: string, response: any) {
          if (!response || !response.search) {
            return [path, { data: [] }];
          }

          return [path, { data: response.search.map((item: any) => {
            const id = item.id;
            const title = item.label || id;
            const description = item.description || "No description available";
            const url = item.url || `https://www.wikidata.org/wiki/${id}`;

            return {
              url,
              title,
              content: description,
              engine: "wikidata",
            };
          }) }];
        },
      }
    )
  )?.data;
