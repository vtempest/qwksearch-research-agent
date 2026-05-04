import grab from "grab-url";
import { EngineFunction } from "../../engine";
import { parseHTML } from "linkedom";

export const eztv: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab(`https://eztv.re/search/${query}`, {
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];
          const html = response.data || response;
          const { document } = parseHTML(html);

          document.querySelectorAll("table.forum_header_border tr.forum_header_border").forEach((el) => {
            const element = el;
            const titleColumn = element.querySelectorAll("td")[1];
            const titleLink = titleColumn?.querySelector("a.epinfo");
            const magnetLink = element.querySelector("a.magnet");
            const title = titleLink?.textContent?.trim() || "";
            const url = magnetLink?.getAttribute("href") || "";

            // Get torrent metadata
            const tds = element.querySelectorAll("td");
            const size = tds[3]?.textContent?.trim() || "";
            const date = tds[4]?.textContent?.trim() || "";
            const seeds = tds[5]?.textContent?.trim() || "";

            if (url && title) {
              results.push({
                url,
                title,
                content: `Size: ${size}, Seeds: ${seeds}, Released: ${date}`,
                engine: "eztv",
              });
            }
          });

          return [path, { data: results }];
        },
      }
    )
  )?.data;
