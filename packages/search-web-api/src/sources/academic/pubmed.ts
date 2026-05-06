import { parseHTML } from "linkedom";
import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const pubmed: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const pageno = page || 1;
  const number_of_results = 10;
  const retstart = (pageno - 1) * number_of_results;

  // Step 1: Search for PMIDs
  const esearchResponse = await grab("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi", {
    db: "pubmed",
    term: query,
    retstart: retstart,
    retmax: number_of_results,
    responseType: "text",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  const esearchData = esearchResponse?.data || esearchResponse;
  const { document: esearchDoc } = parseHTML(esearchData);
  const pmids: string[] = [];
  esearchDoc.querySelectorAll("Id").forEach((elem) => {
    const pmid = elem.textContent;
    if (pmid) pmids.push(pmid);
  });

  if (pmids.length === 0) {
    return [];
  }

  // Step 2: Fetch full article data
  return (
    await grab(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${pmids.join(
        ","
      )}`,
      {
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        onResponse(path: string, response: any) {
          const data = response;
          if (!data || typeof data !== "string") {
            return [path, { data: [] }];
          }

          const { document } = parseHTML(data);

          return [path, { data: Array.from(
            document.querySelectorAll("PubmedArticle")
          )
            .map((article) => {
              const title =
                article.querySelector("ArticleTitle")?.textContent || "";
              const pmid = article.querySelector("PMID")?.textContent || "";
              const url = `https://www.ncbi.nlm.nih.gov/pubmed/${pmid}`;

              const abstractElements =
                article.querySelectorAll("AbstractText");
              const abstract = Array.from(abstractElements)
                .map((el) => el.textContent)
                .join(" ");

              const journal =
                article.querySelector("Journal Title")?.textContent || "";
              const doi =
                article.querySelector('ELocationID[EIdType="doi"]')
                  ?.textContent || "";

              const authors: string[] = [];
              article.querySelectorAll("AuthorList Author").forEach((author) => {
                const firstName =
                  author.querySelector("ForeName")?.textContent || "";
                const lastName =
                  author.querySelector("LastName")?.textContent || "";
                const authorName = `${firstName} ${lastName}`.trim();
                if (authorName) authors.push(authorName);
              });

              const content = [
                abstract,
                journal ? `Journal: ${journal}` : "",
                authors.length ? `Authors: ${authors.join(", ")}` : "",
                doi ? `DOI: ${doi}` : "",
              ]
                .filter(Boolean)
                .join("\n");

              return {
                url,
                title,
                content,
                engine: "pubmed",
              };
            })
            .filter((r) => r.url && r.title) }];
        },
      }
    )
  )?.data;
};
