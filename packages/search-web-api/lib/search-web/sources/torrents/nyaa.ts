import grab from "grab-url";
import { EngineFunction } from "../../engine";
import { parseHTML } from "linkedom";

export const nyaa: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://nyaa.si/", {
      f: 0,
      c: "0_0",
      q: query,
      p: page || 1,
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];
          const html = response.data || response;
          const { document } = parseHTML(html);

          document.querySelectorAll("table.torrent-list tbody tr").forEach((el) => {
            const element = el;
            const tds = element.querySelectorAll("td");
            const category = tds[0]?.textContent?.trim() || "";
            const titleColumn = tds[1];
            // find 'a' elements in titleColumn, filter out .comments
            const titleLink = titleColumn?.querySelector("a:not(.comments)"); // Assuming simple check or just taking first non-comment
            const magnetLink = element.querySelector('a[href^="magnet:"]');
            const title = titleLink?.textContent?.trim() || "";
            const url = magnetLink?.getAttribute("href") || "";

            // Get torrent metadata
            const size = tds[3]?.textContent?.trim() || "";
            const seeders = tds[5]?.textContent?.trim() || "";
            const leechers = tds[6]?.textContent?.trim() || "";
            const downloads = tds[7]?.textContent?.trim() || "";

            if (url && title) {
              results.push({
                url,
                title,
                content: `Category: ${category}, Size: ${size}, Seeds: ${seeders}, Leeches: ${leechers}, Downloads: ${downloads}`,
                engine: "nyaa",
              });
            }
          });

          return [path, { data: results }];
        },
      }
    )
  )?.data;
