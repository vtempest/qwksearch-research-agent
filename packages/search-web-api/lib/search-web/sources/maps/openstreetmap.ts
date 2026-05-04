import grab from "grab-url";
import { EngineFunction } from "../../engine";

export const openstreetmap: EngineFunction = async (
  query: string,
  page: number | undefined
) =>
  (
    await grab("https://nominatim.openstreetmap.org/search", {
      q: query,
      format: "json",
      addressdetails: 1,
      limit: 10,
        headers: {
          "User-Agent": "HonoxSearX/1.0",
        },
        onResponse(path: string, response: any) {
          const json = response;

          response.data = [];

          if (Array.isArray(json)) {
            response.data = json.map((item: any) => ({
              url: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
              title: item.display_name,
              content: `Type: ${item.type}, Class: ${item.class}`,
              engine: "openstreetmap",
            }));
          }

          return [path, response];
        },
      }
    )
  )?.data;
