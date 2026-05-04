import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const yahoo: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://search.yahoo.com/search", {
      p: query,
      b: ((page || 1) - 1) * 7 + 1,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        responseType: "text",
        onResponse(path: string, htmlString: any) {
          const { document } = parseHTML(htmlString);

          const data = Array.from(document.querySelectorAll(".algo-sr"))
            .map((element) => {
              const link = element.querySelector("a");
              const url = link?.getAttribute("href") || "";
              const title = link?.textContent?.trim() || "";
              const content =
                element.querySelector(".compText")?.textContent?.trim() || "";

              return {
                url,
                title,
                content,
                engine: "yahoo",
              };
            })
            .filter((r) => r.url && r.title);

          return [path, { data }];
        },
      }
    )
  )?.data;
