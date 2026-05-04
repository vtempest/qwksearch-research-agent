import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const baidu: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab(`https://www.baidu.com/s`, {
      wd: query,
      rn: 10,
      pn: ((page || 1) - 1) * 10,
      headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Cookie: "BAIDUID=1234567890:FG=1",
        },
        responseType: "text",
        onResponse(path: string, htmlString: any) {
          const { document } = parseHTML(htmlString);

          const data = Array.from(
            document.querySelectorAll(
              "#content_left > div.result, div.c-container"
            )
          )
            .map((element) => {
              const titleLink = element.querySelector("h3 a, h3.c-title a");
              const url = titleLink?.getAttribute("href") || "";
              const title = titleLink?.textContent?.trim() || "";

              if (!url || !title) {
                return null;
              }

              const content =
                element
                  .querySelector(
                    "div.c-abstract, div.c-span9, span.content-right_2s-H4"
                  )
                  ?.textContent?.trim() || "";
              const timestamp =
                element
                  .querySelector("span.c-color-gray2, span.newTimeFactor_2s-H4")
                  ?.textContent?.trim() || "";

              return {
                url,
                title,
                content: timestamp ? `${timestamp}\n${content}` : content,
                engine: "baidu",
              };
            })
            .filter((r) => r !== null && r.url && r.title);

          return [path, { data }];
        },
      }
    )
  )?.data;
