import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const arxiv: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://export.arxiv.org/api/query", {
      search_query: "all:" + query,
      start: String(((page || 1) - 1) * 10),
      max_results: String(10),
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        Accept: "application/atom+xml",
      },
      responseType: "text",
      onResponse(path: string, response: any) {
        const { document } = parseHTML(response);

        return [path, { data: Array.from(document.querySelectorAll("entry"))
          .map((entry) => {
            const title =
                entry
                  .querySelector("title")
                  ?.textContent?.replace(/\s+/g, " ")
                  .trim() || "",
              url = entry.querySelector("id")?.textContent?.trim() || "",
              abstract = (
                entry
                  .querySelector("summary")
                  ?.textContent?.replace(/\s+/g, " ")
                  .trim() || ""
              ).substring(0, 500),
              authors = Array.from(entry.querySelectorAll("author name"))
                .map((n) => n.textContent?.trim())
                .filter(Boolean),
              published = entry
                .querySelector("published")
                ?.textContent?.split("T")[0],
              categories = Array.from(entry.querySelectorAll("category"))
                .map((cat) => cat.getAttribute("term"))
                .filter(Boolean),
              meta = [
                authors.length &&
                  `Authors: ${authors.slice(0, 3).join(", ")}${
                    authors.length > 3 ? " et al." : ""
                  }`,
                published && `Published: ${published}`,
                categories.length &&
                  `Categories: ${categories.slice(0, 3).join(", ")}`,
              ]
                .filter(Boolean)
                .join(" | ");

            return {
              url,
              title,
              content: meta ? `${meta}\n\n${abstract}` : abstract,
              engine: "arxiv",
            };
          })
          .filter((r) => r.url && r.title) }];
      },
    })
  )?.data;
