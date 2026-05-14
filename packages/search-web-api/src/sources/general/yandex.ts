import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const yandex: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  return (
    await grab(`https://yandex.com/search/site/`, {
      tmpl_version: "releases",
      text: query,
      web: "1",
      frame: "1",
      searchid: "3131712",
      lang: "en",
      ...((page || 1) > 1 ? { p: (page || 1) - 1 } : {}),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Cookie: "yp=1716337604.sp.family%3A0#1685406411.szm.1:1920x1080:1920x999",
      },
      responseType: "text",
      onResponse(path: string, htmlString: any) {
        const { document } = parseHTML(htmlString);

        const data = Array.from(
          document.querySelectorAll('li.serp-item, li[class*="serp-item"]')
        )
          .map((element) => {
            const link = element.querySelector(
              'a.b-serp-item__title-link, a[class*="title-link"]'
            );
            const url = link?.getAttribute("href") || "";
            const title =
              link?.querySelector("span, h3")?.textContent?.trim() || "";
            const content =
              element
                .querySelector(
                  'div.b-serp-item__text, div[class*="text"]'
                )
                ?.textContent?.trim() || "";

            return {
              url,
              title,
              content,
              engine: "yandex",
            };
          })
          .filter((r) => r.url && r.title);

        return [path, { data }];
      },
    })
  )?.data;
};
