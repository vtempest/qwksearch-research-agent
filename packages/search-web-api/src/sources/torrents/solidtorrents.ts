import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";
import { parseHTML } from "linkedom";

export const solidtorrents: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://solidtorrents.to/search", {
      q: query,
      page: page || 1,
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const results: any[] = [];
          const data = response.data || response;

          if (!data || typeof data !== "string") {
            return [path, { data: results }];
          }

          const { document } = parseHTML(data);

          document.querySelectorAll("li.search-result").forEach((element) => {
            const elElem = element;

            const torrentfile = elElem.querySelector("a.dl-torrent")?.getAttribute("href");
            const magnet = elElem.querySelector("a.dl-magnet")?.getAttribute("href");

            if (!torrentfile || !magnet) {
              return; // skip results without torrent links
            }

            const title = elElem.querySelector("h5.title")?.textContent?.trim() || "";
            const url = elElem.querySelector("h5.title a")?.getAttribute("href");
            const category = elElem.querySelector("a.category")?.textContent?.trim() || "";

            const stats = Array.from(elElem.querySelectorAll(".stats div")).map(
              (el) => el.textContent?.trim() || ""
            );

            const content = [
              category ? `Category: ${category}` : "",
              stats[1] ? `Size: ${stats[1]}` : "",
              stats[3] ? `Seeds: ${stats[3]}` : "",
              stats[2] ? `Leeches: ${stats[2]}` : "",
              stats[4] ? `Date: ${stats[4]}` : "",
            ]
              .filter(Boolean)
              .join(" | ");

            results.push({
              url: `https://solidtorrents.to${url}`,
              title,
              content,
              engine: "solidtorrents",
            });
          });

          return [path, { data: results }];
        },
      }
    )
  )?.data;
