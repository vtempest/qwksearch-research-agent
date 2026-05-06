import grab from "grab-url";
import { EngineFunction } from "../../types/search-engine-interface.js";

export const gitlab: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://gitlab.com/api/v4/projects", {
      search: query,
      page: page || 1,
      headers: {
        Accept: "application/json",
      },
      onResponse(path: string, response: any) {
        const data = response.data;
        const results = [];

        if (Array.isArray(data)) {
          for (const item of data) {
            try {
              const result: any = {
                url: item.web_url || "",
                title: item.name || "",
                content: item.description || "",
                thumbnail: item.avatar_url,
                publishedDate: new Date(
                  item.last_activity_at || item.created_at
                ),
                engine: "gitlab",
              };

              // Add extra fields
              result.template = "packages";
              result.package_name = item.name;
              result.maintainer = item.namespace?.name;
              result.tags = item.tag_list || [];
              result.popularity = item.star_count;
              result.homepage = item.readme_url;
              result.source_code_url = item.http_url_to_repo;

              results.push(result);
            } catch (error) {
              // Skip malformed results
              continue;
            }
          }
        }

        return [path, { data: results }];
      },
    }
    )
  )?.data;
