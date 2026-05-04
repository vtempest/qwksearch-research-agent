import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../search-web-types.js";

export const mojeek: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const res = await grab("https://www.mojeek.com/search", {
    q: query,
    s: 10 * ((page || 1) - 1),
    safe: 0,
    responseType: "text",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.mojeek.com/",
    },
    onResponse(path: string, htmlString: any) {
      if (!htmlString || typeof htmlString !== "string") {
        const data = [] as any[];
        return [path, { data }];
      }

      const { document } = parseHTML(htmlString);

      const snippets = document.querySelectorAll("ul.results-standard li");
      console.log(`Mojeek: Found ${snippets.length} snippets`);

      const data = Array.from(snippets)
        .map((element) => {
          const mainLink = element.querySelector("a.ob");
          const url = mainLink?.getAttribute("href") || "";
          const title = element.querySelector("h2 a")?.textContent?.trim() || "";
          const content = element.querySelector("p.s")?.textContent?.trim() || "";

          return {
            url,
            title,
            content,
            engine: "mojeek",
          };
        })
        .filter((r) => r.url && r.title);

      console.log(`Mojeek: Extracted ${data.length} valid results`);
      if (data.length === 0 && htmlString.length > 0) {
        console.log("Mojeek: HTML sample:", htmlString.substring(0, 1000));
      }

      return [path, { data }];
    },
  });

  if (res?.error) {
    console.error(`Mojeek Error: ${res.error}`);
    return undefined;
  }

  return res?.data;
};
