import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const pixabay: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab(`https://pixabay.com/images/search/${query}/`, {
      pagi: page || 1,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Pixabay",
          "x-bootstrap-cache-miss": "1",
          "x-fetch-bootstrap": "1",
        },
        redirect: "manual",
        onResponse(path: string, response: any) {
          const json = response?.data || response;

          if (!json || !json.page || !json.page.results) {
            return [path, { data: [] }];
          }

          return [path, { data: json.page.results
            .map((result: any) => {
              if (
                !result.mediaType ||
                !["photo", "illustration", "vector"].includes(result.mediaType)
              ) {
                return null;
              }

              const sources = result.sources || {};
              const thumbnail =
                (Object.values(sources)[0] as string) || "";
              const img_src =
                (Object.values(sources)[
                  Object.values(sources).length - 1
                ] as string) || "";

              return {
                url: `https://pixabay.com${result.href}`,
                title: result.name || "",
                content: result.description || "",
                engine: "pixabay",
                thumbnail,
                img_src,
              };
            })
            .filter((r: any) => r !== null) }];
        },
      }
    )
  )?.data;
