import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const crossref: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://api.crossref.org/works", {
      query: query,
      offset: 20 * ((page || 1) - 1),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        onResponse(path: string, response: any) {
          if (!response || !response.message || !response.message.items) {
            return [path, { data: [] }];
          }

          return [path, { data: response.message.items
            .filter((record: any) => record.type !== "component")
            .map((record: any) => {
              let title = "";
              let journal = "";

              if (record.type === "book-chapter") {
                title = record["container-title"]?.[0] || "";
                if (
                  record.title?.[0] &&
                  record.title[0].toLowerCase().trim() !==
                    title.toLowerCase().trim()
                ) {
                  title += ` (${record.title[0]})`;
                }
              } else {
                title =
                  record.title?.[0] || record["container-title"]?.[0] || "";
                journal =
                  record["container-title"]?.[0] && record.title?.[0]
                    ? record["container-title"][0]
                    : "";
              }

              const authors = (record.author || [])
                .map(
                  (a: any) => `${a.given || ""} ${a.family || ""}`.trim()
                )
                .filter((a: string) => a)
                .join(", ");

              const content = [
                record.abstract || "",
                journal ? `Journal: ${journal}` : "",
                authors ? `Authors: ${authors}` : "",
                record.publisher ? `Publisher: ${record.publisher}` : "",
                record.DOI ? `DOI: ${record.DOI}` : "",
              ]
                .filter(Boolean)
                .join("\n");

              return {
                url: record.URL || `https://doi.org/${record.DOI}` || "",
                title,
                content,
                engine: "crossref",
              };
            })
            .filter((r: any) => r.url && r.title) }];
        },
      }
    )
  )?.data;
