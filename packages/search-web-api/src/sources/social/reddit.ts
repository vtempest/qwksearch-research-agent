import grab from "grab-url";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface.js";
import { parseHTML } from "linkedom";

export const reddit: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://old.reddit.com/search", {
      q: query,
      sort: "relevance",
      t: "all",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const html = response.data || response;
          const { document } = parseHTML(html);
          const results: EngineResult[] = [];

          document.querySelectorAll(".search-result").forEach((el) => {
            const titleLink = el.querySelector("a.search-title");
            const title = titleLink?.textContent?.trim() || "";
            const link = titleLink?.getAttribute("href");
            const content =
              el.querySelector(".search-result-body")?.textContent?.trim() ||
              "";

            if (title && link) {
              results.push({
                title,
                url: link.startsWith("http")
                  ? link
                  : `https://old.reddit.com${link}`,
                content: content || "",
                engine: "reddit",
              });
            }
          });

          return [path, { data: results }];
        },
      }
    )
  )?.data;
