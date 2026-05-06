import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const bing_images: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://www.bing.com/images/async", {
      q: query,
      async: 1,
      first: ((page || 1) - 1) * 35 + 1,
      count: 35,
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        onResponse(path: string, response: any) {
          const { document } = parseHTML(response);

          return [path, { data: Array.from(
            document.querySelectorAll(
              'ul.dgControl_list li, li[class*="dgControl"]'
            )
          )
            .map((element) => {
              const metadataStr = element
                .querySelector("a.iusc")
                ?.getAttribute("m");
              if (!metadataStr) return null;

              try {
                const metadata = JSON.parse(metadataStr);
                const title =
                  element.querySelector("div.infnmpt a")?.textContent?.trim() ||
                  metadata.t ||
                  "";
                const imgFormat =
                  element
                    .querySelector("div.imgpt div span")
                    ?.textContent?.trim() || "";
                const source =
                  element
                    .querySelector("div.imgpt div.lnkw a")
                    ?.textContent?.trim() || "";

                return {
                  url: metadata.purl,
                  title,
                  content: metadata.desc || source || "",
                  thumbnail: metadata.turl,
                  engine: "bing_images",
                };
              } catch (e) {
                return null;
              }
            })
            .filter((r) => r !== null) }];
        },
      }
    )
  )?.data;
