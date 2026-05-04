import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const imgur: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://imgur.com/search/score/all", {
      q: query,
      qs: "thumbs",
      p: (page || 1) - 1,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        responseType: "text",
        onResponse(path: string, response: any) {
          const html = response?.data || response;

          if (!html || typeof html !== "string") {
            return [path, { data: [] }];
          }

          const { document } = parseHTML(html);

          return [path, { data: Array.from(
            document.querySelectorAll('div.cards div.post, div[class*="post"]')
          )
            .map((element) => {
              const link = element.querySelector("a");
              const url = link?.getAttribute("href");
              const title = link?.querySelector("img")?.getAttribute("alt") || "";
              let thumbnail = link?.querySelector("img")?.getAttribute("src") || "";

              if (!url || !thumbnail || thumbnail.length < 25) {
                return null;
              }

              const imgSrc = thumbnail.replace("b.", ".");

              return {
                url: `https://imgur.com${url}`,
                title,
                content: "",
                thumbnail,
                engine: "imgur",
              };
            })
            .filter((r) => r !== null) }];
        },
      }
    )
  )?.data;
