import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

function reconstructAbstract(
  invertedIndex: Record<string, number[]>
): string {
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.filter(Boolean).join(" ");
}

export const openalex: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://api.openalex.org/works", {
      search: query,
      "per-page": String(10),
      page: String(page || 1),
      sort: "cited_by_count:desc",
      mailto: process.env.OPENALEX_MAILTO || "research@qwksearch.com",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      onResponse(path: string, response: any) {
        if (!response || !Array.isArray(response.results)) {
          return [path, { data: [] }];
        }

        return [
          path,
          {
            data: response.results
              .map((w: any) => {
                const title = w.title || "";
                const doi = w.doi || "";
                const url =
                  w.primary_location?.landing_page_url ||
                  doi ||
                  w.id ||
                  "";
                const authors = (w.authorships || [])
                  .slice(0, 3)
                  .map((a: any) => a.author?.display_name)
                  .filter(Boolean);
                const abstract = w.abstract_inverted_index
                  ? reconstructAbstract(w.abstract_inverted_index).slice(
                      0,
                      500
                    )
                  : "";
                const journal = w.host_venue?.display_name || "";

                const content = [
                  abstract,
                  authors.length
                    ? `Authors: ${authors.join(", ")}${
                        (w.authorships || []).length > 3 ? " et al." : ""
                      }`
                    : "",
                  w.publication_year ? `Year: ${w.publication_year}` : "",
                  journal ? `Journal: ${journal}` : "",
                  w.cited_by_count
                    ? `Citations: ${w.cited_by_count}`
                    : "",
                  doi ? `DOI: ${doi}` : "",
                ]
                  .filter(Boolean)
                  .join("\n");

                return {
                  url,
                  title,
                  content,
                  engine: "openalex",
                };
              })
              .filter((r: any) => r.url && r.title),
          },
        ];
      },
    })
  )?.data;
