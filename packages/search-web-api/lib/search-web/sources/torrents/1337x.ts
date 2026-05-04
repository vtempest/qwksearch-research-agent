import grab from "grab-url";
import { EngineFunction } from "../../engine";
import { parseHTML } from "linkedom";

export const torrent_1337x: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab(`https://1337x.to/search/${query}/${page || 1}/`, {
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];
          const html = response.data || response;
          const { document } = parseHTML(html);

          document.querySelectorAll("table.table-list tbody tr").forEach((el) => {
            const element = el;
            const links = element.querySelectorAll("td.name a");
            const link = links[1] || links[0]; // Second link is usually the torrent detail page
            const url = `https://1337x.to${link?.getAttribute("href")}`;
            const title = link?.textContent?.trim() || "";
            const seeds = element.querySelector("td.seeds")?.textContent?.trim() || "";
            const leeches = element.querySelector("td.leeches")?.textContent?.trim() || "";
            const size = element.querySelector("td.size")?.textContent?.trim() || "";

            if (url && title) {
              results.push({
                url,
                title,
                content: `Size: ${size}, Seeds: ${seeds}, Leeches: ${leeches}`,
                engine: "1337x",
              });
            }
          });

          return [path, { data: results }];
        },
      }
    )
  )?.data;
