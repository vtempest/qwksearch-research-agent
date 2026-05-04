import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const google_scholar: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://scholar.google.com/scholar", {
      q: query,
      start: ((page || 1) - 1) * 10,
      hl: "en",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: "CONSENT=YES+",
        },
        responseType: "text",
        onResponse(path: string, response: any) {
          const { document } = parseHTML(response);

          return [path, { data: Array.from(
            document.querySelectorAll(".gs_r.gs_or.gs_scl")
          )
            .map((element) => {
              const titleLink = element.querySelector(".gs_rt a");
              const url = titleLink?.getAttribute("href") || "";
              const title = titleLink?.textContent?.trim() || "";
              const content =
                element.querySelector(".gs_rs")?.textContent?.trim() || "";
              const publicationInfo =
                element.querySelector(".gs_a")?.textContent?.trim() || "";

              return {
                url,
                title,
                content: publicationInfo
                  ? `${publicationInfo} - ${content}`
                  : content,
                engine: "google_scholar",
              };
            })
            .filter((r) => r.url && r.title) }];
        },
      }
    )
  )?.data;
