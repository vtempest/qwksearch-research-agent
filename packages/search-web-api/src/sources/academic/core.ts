import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const core: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) return [];

  const limit = 10;
  const offset = ((page || 1) - 1) * limit;

  return (
    await grab("https://api.core.ac.uk/v3/search/works", {
      post: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        q: query,
        limit,
        offset,
        scroll: false,
      }),
      onResponse(path: string, response: any) {
        if (!response || !Array.isArray(response.results)) {
          return [path, { data: [] }];
        }

        return [
          path,
          {
            data: response.results
              .map((r: any) => {
                const title = r.title || "";
                const doi = r.doi || "";
                const url =
                  r.downloadUrl ||
                  (doi ? `https://doi.org/${doi}` : "") ||
                  (r.id ? `https://core.ac.uk/works/${r.id}` : "");
                const authors = (r.authors || [])
                  .slice(0, 3)
                  .map((a: any) => a.name)
                  .filter(Boolean);
                const journal = r.journals?.[0]?.title || "";
                const abstract = (r.abstract || "").slice(0, 500);

                const content = [
                  abstract,
                  authors.length
                    ? `Authors: ${authors.join(", ")}${
                        (r.authors || []).length > 3 ? " et al." : ""
                      }`
                    : "",
                  r.yearPublished ? `Year: ${r.yearPublished}` : "",
                  journal ? `Journal: ${journal}` : "",
                  doi ? `DOI: ${doi}` : "",
                ]
                  .filter(Boolean)
                  .join("\n");

                return {
                  url,
                  title,
                  content,
                  engine: "core",
                };
              })
              .filter((r: any) => r.url && r.title),
          },
        ];
      },
    })
  )?.data;
};
