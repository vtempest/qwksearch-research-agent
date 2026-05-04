import grab from "grab-url";
import { EngineFunction, EngineResult } from "../../engine";
import { parseHTML } from "linkedom";

export const goodreads: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://www.goodreads.com/search", {
      q: query,
      page: page || 1,
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const results: EngineResult[] = [];

          if (!response || typeof response !== "string") {
            return [path, { data: results }];
          }

          const { document } = parseHTML(response);

          document.querySelectorAll("table tr").forEach((element) => {
            const rowElem = element;

            const $link = rowElem.querySelector("a.bookTitle");
            const href = $link?.getAttribute("href");
            const title = $link?.textContent?.trim() || "";

            if (!href || !title) return;

            const thumbnail =
              rowElem.querySelector("img.bookCover")?.getAttribute("src") ||
              undefined;
            const author =
              rowElem.querySelector("a.authorName")?.textContent?.trim() || "";
            const info =
              rowElem.querySelector("span.uitext")?.textContent?.trim() || "";

            const content = [info, author ? `Author: ${author}` : ""]
              .filter(Boolean)
              .join(" | ");

            results.push({
              url: `https://www.goodreads.com${href}`,
              title,
              content,
              engine: "goodreads",
              thumbnail,
            });
          });

          return [path, { data: results }];
        },
      }
    )
  )?.data;
