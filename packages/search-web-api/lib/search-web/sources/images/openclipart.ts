import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const openclipart: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://openclipart.org/search/", {
      query: query,
      p: page || 1,
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const html = response?.data || response;

          if (!html || typeof html !== "string") {
            return [path, { data: [] }];
          }

          const { document } = parseHTML(html);

          return [path, { data: Array.from(
            document.querySelectorAll("div.gallery div.artwork")
          )
            .map((element) => {
              const link = element.querySelector("a");
              const href = link?.getAttribute("href");
              const title = link?.querySelector("img")?.getAttribute("alt");
              const imgSrc = link?.querySelector("img")?.getAttribute("src");

              if (!href || !title || !imgSrc) {
                return null;
              }

              return {
                url: `https://openclipart.org${href}`,
                title,
                content: "",
                engine: "openclipart",
                thumbnail: `https://openclipart.org${imgSrc}`,
              };
            })
            .filter((r) => r !== null) }];
        },
      }
    )
  )?.data;
