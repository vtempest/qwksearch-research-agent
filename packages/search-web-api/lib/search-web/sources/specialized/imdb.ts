import grab from "grab-url";
import { EngineFunction, EngineResult } from "../../engine";
import { parseHTML } from "linkedom";

export const imdb: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://www.imdb.com/find/", {
      q: query,
      s: "all",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        responseType: "text",
        onResponse(path: string, response: any) {
          const html =
            typeof response === "string"
              ? response
              : response?.data || response || "";
          const { document } = parseHTML(html);
          const results: EngineResult[] = [];

          document
            .querySelectorAll(".ipc-metadata-list-summary-item")
            .forEach((el) => {
              const element = el;
              const link = element.querySelector(
                "a.ipc-metadata-list-summary-item__t"
              );
              const url = `https://www.imdb.com${link?.getAttribute("href")}`;
              const title = link?.textContent?.trim() || "";
              const content =
                element
                  .querySelector(".ipc-metadata-list-summary-item__li")
                  ?.textContent?.trim() || "";
              const thumbnail =
                element.querySelector("img")?.getAttribute("src") || "";

              if (url && title) {
                results.push({
                  url,
                  title,
                  content,
                  thumbnail,
                  engine: "imdb",
                });
              }
            });

          return [path, { data: results }];
        },
      }
    )
  )?.data;
