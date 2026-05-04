import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../search-web-types.js";

export const brave: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const res = await grab(`https://search.brave.com/search`, {
    q: query,
    p: page || 1,
    responseType: "text",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    onResponse(path: string, htmlString: any) {
      const { document } = parseHTML(htmlString);

      const snippets = document.querySelectorAll(".snippet");
      console.log(`Brave: Found ${snippets.length} snippets`);

      const data = Array.from(snippets)
        .map((element) => {
          const link = element.querySelector("a");
          const url = link?.getAttribute("href") || "";
          const title =
            element.querySelector(".search-snippet-title")?.textContent?.trim() || "";
          const content =
            element
              .querySelector(".content")
              ?.textContent?.trim() || "";

          return {
            url,
            title,
            content,
            engine: "brave",
          };
        })
        .filter((r) => r.url && r.title);

      console.log(`Brave: Extracted ${data.length} valid results`);
      if (data.length === 0 && htmlString.length > 0) {
        console.log("Brave: HTML sample:", htmlString.substring(0, 1000));
        // Save full HTML for inspection
        try {
          // fs is not imported here, but we can use global.fs if available or just log it
        } catch (e) {}
      }

      return [path, { data }];
    },
  });

  if (res?.error) {
    console.error(`Brave Error: ${res.error}`);
    return undefined;
  }

  return res?.data;
};
