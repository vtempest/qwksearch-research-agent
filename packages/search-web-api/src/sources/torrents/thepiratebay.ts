import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";
import { parseHTML } from "linkedom";

export const thepiratebay: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://thepiratebay.org/search.php", {
      q: query,
      page: (page || 1) - 1,
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];
          const html = response.data || response;
          const { document } = parseHTML(html);

          document.querySelectorAll("#searchResult tbody tr").forEach((el) => {
            const element = el;
            const titleLink = element.querySelector("td.vertTh a.detLink");
            const magnetLink = element.querySelector('a[href^="magnet:"]');
            const title = titleLink?.textContent?.trim() || "";
            const url = magnetLink?.getAttribute("href") || "";
            const descElement = element.querySelector("font.detDesc");
            const descText = descElement?.textContent?.trim() || "";

            // Extract size, uploader, and date from description
            const sizeMatch = descText.match(/Size\s+([^,]+)/i);
            const uploaderMatch = descText.match(/ULed by\s+([^,]+)/i);
            const size = sizeMatch ? sizeMatch[1] : "Unknown";
            const uploader = uploaderMatch ? uploaderMatch[1] : "Unknown";

            // Get seeders and leechers
            const tds = element.querySelectorAll("td");
            const seeders = tds[2]?.textContent?.trim() || "";
            const leechers = tds[3]?.textContent?.trim() || "";

            if (url && title) {
              results.push({
                url,
                title,
                content: `Size: ${size}, Seeds: ${seeders}, Leeches: ${leechers}, Uploader: ${uploader}`,
                engine: "thepiratebay",
              });
            }
          });

          return [path, { data: results }];
        },
      }
    )
  )?.data;
