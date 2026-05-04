import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const google_images: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://www.google.com/search", {
      q: query,
      tbm: "isch",
      asearch: "isch",
      hl: "en",
      gl: "US",
      async: `_fmt:json,p:1,ijn:${(page || 1) - 1}`,
        headers: {
          "User-Agent":
            "NSTN/3.60.474802233.release Dalvik/2.1.0 (Linux; U; Android 12; US) gzip",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          Cookie: "CONSENT=YES+; SOCS=CAESBQgYEgAgAA==",
        },
        onResponse(path: string, response: any) {
          const html = response?.data || response;

          if (!html || typeof html !== "string") {
            return [path, { data: [] }];
          }

          try {
            const jsonStart = html.indexOf('{"ischj":');
            if (jsonStart === -1) {
              return [path, { data: [] }];
            }

            const jsonData = JSON.parse(html.substring(jsonStart));
            const metadata = jsonData?.ischj?.metadata || [];

            response.data = metadata
              .map((item: any) => {
                if (!item?.result || !item?.original_image) {
                  return null;
                }

                const result = item.result;
                const originalImage = item.original_image;
                const thumbnail = item.thumbnail;

                const sourceParts: string[] = [];
                if (result.site_title) {
                  sourceParts.push(result.site_title);
                }

                const author = result.iptc?.creator;
                if (author && Array.isArray(author)) {
                  sourceParts.push(`Author: ${author.join(", ")}`);
                }

                const copyright = result.iptc?.copyright_notice;
                if (copyright) {
                  sourceParts.push(copyright);
                }

                if (result.freshness_date) {
                  sourceParts.push(result.freshness_date);
                }

                const fileSize = item.gsa?.file_size;
                if (fileSize) {
                  sourceParts.push(`(${fileSize})`);
                }

                const resolution = `${originalImage.width} x ${originalImage.height}`;

                const content = [
                  item.text_in_grid?.snippet || "",
                  sourceParts.join(" | "),
                  `Resolution: ${resolution}`,
                ]
                  .filter(Boolean)
                  .join("\n");

                return {
                  url: result.referrer_url,
                  title: result.page_title || "",
                  content,
                  thumbnail: thumbnail?.url,
                  engine: "google_images",
                };
              })
              .filter((r: any) => r !== null);
          } catch (e) {
            console.error("Error parsing Google Images response:", e);
            response.data = [];
          }

          return [path, response];
        },
      }
    )
  )?.data;
