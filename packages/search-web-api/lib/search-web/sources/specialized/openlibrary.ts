import grab from "grab-url";
import { EngineFunction, EngineResult } from "../../engine";

export const openlibrary: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://openlibrary.org/search.json", {
      q: query,
      page: page || 1,
      limit: 10,
      fields: "*",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 10,
      onResponse(path: string, response: any) {
        const results: EngineResult[] = [];

        if (!response || !response.docs) {
          return [path, { data: results }];
        }

        for (const item of response.docs) {
          const thumbnail = item.lending_identifier_s
            ? `https://archive.org/services/img/${item.lending_identifier_s}`
            : "";

          const authors = item.author_name ? item.author_name.join(", ") : "";
          const publishYear = item.first_publish_year || "";
          const isbn = item.isbn ? item.isbn.slice(0, 3).join(", ") : "";

          const content = [
            item.first_sentence ? item.first_sentence.join(" / ") : "",
            authors ? `Authors: ${authors}` : "",
            publishYear ? `First published: ${publishYear}` : "",
            isbn ? `ISBN: ${isbn}` : "",
          ]
            .filter(Boolean)
            .join("\n");

          results.push({
            url: `https://openlibrary.org${item.key}`,
            title: item.title,
            content,
            engine: "openlibrary",
            thumbnail,
          });
        }

        return [path, { data: results }];
      },
    })
  )?.data;
