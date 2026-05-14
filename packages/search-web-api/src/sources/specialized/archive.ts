import grab from "grab-url";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface.js";

export const archive: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://archive.org/advancedsearch.php", {
      q: query,
      "fl[]": "identifier,title,description,mediatype,downloads",
      "sort[]": "",
      rows: 50,
      page: page || 1,
      output: "json",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const results: EngineResult[] = [];

          if (response && response.response && response.response.docs) {
            response.response.docs.forEach((doc: any) => {
              const identifier = doc.identifier;
              const title = doc.title || identifier;
              const description = doc.description || "No description available";
              const mediatype = doc.mediatype || "unknown";
              const downloads = doc.downloads || 0;
              const url = `https://archive.org/details/${identifier}`;

              results.push({
                url,
                title,
                content: `${description} | Type: ${mediatype} | Downloads: ${downloads}`,
                thumbnail: `https://archive.org/services/img/${identifier}`,
                engine: "archive",
              });
            });
          }

          return [path, { data: results }];
        },
      }
    )
  )?.data;
