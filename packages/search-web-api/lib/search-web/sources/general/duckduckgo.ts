import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../search-web-types.js";

export const duckduckgo: EngineFunction = async (
  query: string,
  page?: number
) => {
  const res = await grab("https://duckduckgo.com/html", {
    method: "POST",
    body: `q=${encodeURIComponent(query)}&b=&kl=us-en`,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept-Language": "en-US,en;q=0.9",
    },
    responseType: "text",
    onResponse(path: string, htmlString: any) {
      const { document } = parseHTML(htmlString);

      const snippets = document.querySelectorAll(".result");
      console.log(`DDG: Found ${snippets.length} results`);

      const data = Array.from(snippets)
        .map((element) => {
          const link = element.querySelector(".result__title a");
          const url = link?.getAttribute("href") || "";
          const title = link?.textContent?.trim() || "";
          const content =
            element.querySelector(".result__snippet")?.textContent?.trim() ||
            "";

          return {
            url,
            title,
            content,
            engine: "duckduckgo",
          };
        })
        .filter((r) => r.url && r.title);

      console.log(`DDG: Extracted ${data.length} valid results`);
      if (data.length === 0 && htmlString.length > 0) {
        console.log("DDG: HTML sample:", htmlString.substring(0, 1000));
      }

      return [path, { data }];
    },
  });

  if (res?.error) {
    console.error(`DDG Error: ${res.error}`);
    return undefined;
  }

  return res?.data;
};
