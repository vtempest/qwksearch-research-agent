import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";
import { parseHTML } from "linkedom";

/**
 * Bing Videos Search Engine
 *
 * Searches Bing for video content, including:
 * - Video URLs
 * - Thumbnails
 * - Duration and metadata
 */
export const bing_videos: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://www.bing.com/videos/asyncv2", {
      q: query,
      async: "content",
      first: String(((page || 1) - 1) * 35 + 1),
      count: "35",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      responseType: "text",
      onResponse(path: string, htmlString: any) {
        const { document } = parseHTML(htmlString);
        const results = [] as any[];

        // Find video result containers
        const videoElements = document.querySelectorAll(
          'div.dg_u div[id*="mc_vtvc_video"]'
        );

        for (const element of Array.from(videoElements)) {
          try {
            // Extract metadata from vrhdata attribute
            const vrhDataElement = element.querySelector("div.vrhdata");
            const vrhmAttr = vrhDataElement?.getAttribute("vrhm");

            if (!vrhmAttr) {
              continue;
            }

            const metadata = JSON.parse(vrhmAttr);

            // Extract additional info
            const metaSpans = element.querySelectorAll(
              "div.mc_vtvc_meta_block span"
            );
            const info = Array.from(metaSpans)
              .map((span) => span.textContent?.trim())
              .filter(Boolean)
              .join(" - ");

            const duration = metadata.du || "";
            const content = `${duration} - ${info}`.trim();

            // Extract thumbnail
            const thumbnailElement = element.querySelector(
              "div.mc_vtvc_th img, img"
            );
            const thumbnail = thumbnailElement?.getAttribute("src");

            const result: any = {
              url: metadata.murl || "",
              title: metadata.vt || "",
              content,
              thumbnail,
              engine: "bing_videos",
            };

            result.template = "videos";

            results.push(result);
          } catch (error) {
            // Skip malformed results
            continue;
          }
        }

        const data = results;
        return [path, { data }];
      },
    })
  )?.data;
