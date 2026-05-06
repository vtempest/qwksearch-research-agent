import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";
import { parseHTML } from "linkedom";

export const bing_news: EngineFunction = async (
  q: string,
  page: number | undefined
) =>
  (
    await grab('https://www.bing.com/news/infinitescrollajax', {
      q,
      InfiniteScroll: "1",
      first: String(((page || 1) - 1) * 10 + 1),
      SFX: String((page || 1) - 1),
      form: "PTFTNR",
      setlang: "en",
      cc: "US",
      responseType: "text",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      onResponse(path: string, htmlString: any) {
        const html = htmlString;
        const { document } = parseHTML(html);
        const results: any[] = [];

        // Parse news items from Bing News
        document
          .querySelectorAll('div.newsitem, div[class*="newsitem"]')
          .forEach((el) => {
            const element = el;

            const link = element.querySelector('a.title, a[class*="title"]');
            if (!link) return;

            const url = link.getAttribute("href");
            const title = link.textContent?.trim() || "";
            const content =
              element
                .querySelector('div.snippet, div[class*="snippet"]')
                ?.textContent?.trim() || "";

            if (!url || !title) {
              return; // continue to next iteration
            }

            // Extract metadata (source, time, author)
            const metadata: string[] = [];
            const source = element.querySelector(
              'div.source, div[class*="source"]'
            );

            if (source) {
              const ariaLabel = source
                .querySelector("span[aria-label]")
                ?.getAttribute("aria-label");
              const author = link.getAttribute("data-author");

              if (ariaLabel) {
                metadata.push(ariaLabel);
              }
              if (author) {
                metadata.push(author);
              }
            }

            // Extract thumbnail
            let thumbnail =
              element
                .querySelector('a.imagelink img, a[class*="imagelink"] img')
                ?.getAttribute("src") || undefined;
            if (thumbnail && !thumbnail.startsWith("https://www.bing.com")) {
              thumbnail = "https://www.bing.com/" + thumbnail;
            }

            const metadataStr = metadata.length > 0 ? metadata.join(" | ") : "";
            const fullContent = metadataStr
              ? `${metadataStr}\n${content}`
              : content;

            results.push({
              url,
              title,
              content: fullContent,
              engine: "bing_news",
            });
          });

        const data = results;
        return [path, { data }];
      },
    }
    )
  )?.data;
