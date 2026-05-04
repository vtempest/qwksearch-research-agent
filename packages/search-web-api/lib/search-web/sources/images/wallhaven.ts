import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const wallhaven: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://wallhaven.cc/api/v1/search", {
      q: query,
      page: page || 1,
      purity: 100,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        onResponse(path: string, response: any) {
          const json = response?.data || response;

          if (!json || !json.data) {
            return [path, { data: [] }];
          }

          return [path, { data: json.data.map((result: any) => {
            const fileSize = result.file_size
              ? `${(result.file_size / 1024 / 1024).toFixed(2)} MB`
              : "";
            const content = [
              `${result.category} / ${result.purity}`,
              result.resolution ? `Resolution: ${result.resolution}` : "",
              fileSize ? `Size: ${fileSize}` : "",
              result.file_type ? `Format: ${result.file_type}` : "",
            ]
              .filter(Boolean)
              .join(" | ");

            return {
              url: result.url,
              title: result.resolution || "Wallpaper",
              content,
              engine: "wallhaven",
              img_src: result.path,
              thumbnail: result.thumbs?.small || result.thumbs?.original,
            };
          }) }];
        },
      }
    )
  )?.data;
