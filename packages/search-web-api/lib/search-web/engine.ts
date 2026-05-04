import { EngineResult, Engine, EngineFunction } from "./search-web-types.js";

export { EngineResult, Engine, EngineFunction };

/**
 * Extract the actual data from a grab-url response
 * grab-url returns { data: actualContent, error?: string } or just the data directly
 */
export function extractResponseData(response: any): any {
  // If response is null/undefined, return empty string
  if (!response) return "";

  // If response is already a string, return it
  if (typeof response === "string") return response;

  // If response has an error property, it's an error response
  if (typeof response === "object" && "error" in response) {
    // Return empty string/object to allow graceful handling
    return "";
  }

  // If response has a data property, extract it
  if ("data" in response) {
    return response.data;
  }

  // Otherwise return the response as-is (for JSON responses that are already spread)
  return response;
}
