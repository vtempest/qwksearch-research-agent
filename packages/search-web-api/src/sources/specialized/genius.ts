import grab from "grab-url";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface.js";

export const genius: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://genius.com/api/search/multi", {
      per_page: 5,
      q: query,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const results: EngineResult[] = [];

          if (response && response.response && response.response.sections) {
            response.response.sections.forEach((section: any) => {
              if (section.type === "song" || section.type === "lyric") {
                section.hits.forEach((hit: any) => {
                  if (hit.result) {
                    results.push({
                      url: hit.result.url,
                      title: hit.result.full_title,
                      content: `Artist: ${hit.result.artist_names}`,
                      thumbnail: hit.result.song_art_image_thumbnail_url,
                      engine: "genius",
                    });
                  }
                });
              }
            });
          }

          return [path, { data: results }];
        },
      }
    )
  )?.data;
