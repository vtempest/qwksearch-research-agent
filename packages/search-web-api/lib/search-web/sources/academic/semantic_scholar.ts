import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const semantic_scholar: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://www.semanticscholar.org/api/1/search", {
      post: true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        queryString: query,
        page: page || 1,
        pageSize: 10,
        sort: "relevance",
        getQuerySuggestions: false,
        authors: [],
        coAuthors: [],
        venues: [],
        performTitleMatch: true,
      }),
      onResponse(path: string, response: any) {
        if (!response.results) {
          return [path, { data: [] }];
        }

        return [path, { data: response.results.map((result: any) => {
          let url = result.primaryPaperLink?.url;
          if (!url && result.links && result.links.length > 0) {
            url = result.links[0];
          }
          if (
            !url &&
            result.alternatePaperLinks &&
            result.alternatePaperLinks.length > 0
          ) {
            url = result.alternatePaperLinks[0].url;
          }
          if (!url) {
            url = `https://www.semanticscholar.org/paper/${result.id}`;
          }

          const title = result.title?.text || "";
          const abstract = result.abstract?.text || "";

          const metadata: string[] = [];
          if (result.authors && result.authors.length > 0) {
            const authorNames = result.authors
              .map((a: any) => a.name)
              .slice(0, 3);
            metadata.push(
              `Authors: ${authorNames.join(", ")}${
                result.authors.length > 3 ? " et al." : ""
              }`
            );
          }
          if (result.year) {
            metadata.push(`Year: ${result.year}`);
          }
          if (result.venue) {
            metadata.push(`Venue: ${result.venue}`);
          }
          if (result.citationCount) {
            metadata.push(`Citations: ${result.citationCount}`);
          }

          const content =
            metadata.length > 0
              ? `${metadata.join(" | ")}\n\n${abstract}`
              : abstract;

          return {
            url,
            title,
            content,
            engine: "semantic_scholar",
          };
        }) }];
      },
    })
  )?.data;
