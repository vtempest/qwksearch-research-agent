import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const bing: EngineFunction = async (q: string, page?: number) =>
  Array.from(
    parseHTML(
      (
        await grab("https://www.bing.com/search", {
          q,
          first: ((page || 1) - 1) * 10 + 1,
          responseType: "text",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            Cookie: "CONSENT=YES+",
          },
        })
      )?.data
    ).document.querySelectorAll("li.b_algo")
  )
    .map((el) => {
      return {
        url: el.querySelector("h2 a")?.getAttribute("href") || "",
        title: el.querySelector("h2 a")?.textContent?.trim() || "",
        content: el.querySelector(".b_caption p")?.textContent?.trim() || "",
        engine: "bing",
      };
    })
    .filter((r) => r.url && r.title);
