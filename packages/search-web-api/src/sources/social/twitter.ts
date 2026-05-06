import grab from "grab-url";
import { EngineFunction, EngineResult } from "../../types/search-engine-interface.js";
import { parseHTML } from "linkedom";

export const twitter: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://nitter.net/search", {
      f: "tweets",
      q: query,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        responseType: "text",
        onResponse(path: string, response: any) {
          const html = response.data || response;
          const { document } = parseHTML(html);
          const results: EngineResult[] = [];

          document.querySelectorAll(".timeline-item").forEach((el) => {
            const element = el;
            const tweetLink = element.querySelector(".tweet-link");
            const username =
              element.querySelector(".username")?.textContent?.trim() || "";
            const fullname =
              element.querySelector(".fullname")?.textContent?.trim() || "";
            const content =
              element.querySelector(".tweet-content")?.textContent?.trim() ||
              "";
            const timestamp =
              element
                .querySelector(".tweet-date a")
                ?.textContent?.trim() || "";
            const stats =
              element.querySelector(".tweet-stats")?.textContent?.trim() || "";

            const href = tweetLink?.getAttribute("href");
            const url = href
              ? `https://twitter.com${href.replace("/i/web", "")}`
              : "";

            if (url && content) {
              results.push({
                url,
                title: `${fullname} (@${username})`,
                content: `${content} | ${timestamp} | ${stats}`,
                engine: "twitter",
              });
            }
          });

          return [path, { data: results }];
        },
      }
    )
  )?.data;
