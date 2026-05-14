import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const vimeo: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab(`https://vimeo.com/search`, {
      q: query,
      page: page || 1,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      responseType: "text",
      onResponse(path: string, htmlString: any) {
        const results = [] as any[];
        const html = htmlString;

        // If extractResponseData returned empty (due to error), return empty results
        if (!html || typeof html !== "string") {
          const data = results;
          return [path, { data }];
        }

        try {
          // Extract JSON data from the page
          const dataMatch = html.match(/var data = ({.*?});/s);
          if (!dataMatch) {
            const data = results;
            return [path, { data }];
          }

          const parsedData = JSON.parse(dataMatch[1]);
          const filteredData = parsedData?.filtered?.data || [];

          for (const resultItem of filteredData) {
            const type = resultItem.type;
            const result = resultItem[type];

            if (!result) continue;

            const videoId = result.uri?.split("/").pop();
            if (!videoId) continue;

            const url = `https://vimeo.com/${videoId}`;
            const title = result.name || "";
            const thumbnail =
              result.pictures?.sizes?.slice(-1)[0]?.link || "";
            const publishedDate = result.created_time || "";

            results.push({
              url,
              title,
              content: publishedDate
                ? `Published: ${publishedDate.split("T")[0]}`
                : "",
              thumbnail,
              engine: "vimeo",
            });
          }
        } catch (e) {
          console.error("Error parsing Vimeo response:", e);
        }

        const data = results;
        return [path, { data }];
      },
    })
  )?.data;
