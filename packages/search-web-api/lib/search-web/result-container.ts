import { EngineResult } from "./engine.js";
import {
  PriorityType,
  MergedResult,
  EngineWeight,
  CategoryWeight,
  Infobox,
  UnresponsiveEngine,
  Timing,
  EngineData,
} from "./search-web-types.js";

/**
 * ResultContainer - Manages search results from multiple engines
 *
 * Features:
 * - Result deduplication by URL hash
 * - Position-based scoring algorithm
 * - Engine weight consideration
 * - Category weight multipliers
 * - Result merging (combines duplicate results from different engines)
 * - Category-based grouping for better organization
 * - Suggestions, answers, corrections, infoboxes
 * - Unresponsive engine tracking
 * - Performance timing metrics
 */
export class ResultContainer {
  private mainResultsMap: Map<string, MergedResult> = new Map();
  private mainResultsSorted: MergedResult[] | null = null;
  private closed: boolean = false;
  private engineWeights: EngineWeight = {};
  private categoryWeights: CategoryWeight = {};

  // Additional result types from SearXNG
  public infoboxes: Infobox[] = [];
  public suggestions: Set<string> = new Set();
  public answers: Map<string, any> = new Map();
  public corrections: Set<string> = new Set();

  // Engine tracking
  public unresponsiveEngines: Set<UnresponsiveEngine> = new Set();
  public timings: Timing[] = [];
  public engineData: EngineData = {};

  // Metadata
  private numberofResults: number[] = [];
  public paging: boolean = false;
  public redirectUrl: string | null = null;

  // Callback for filtering/modifying results
  public onResult: (result: any) => boolean = () => true;

  /**
   * Configure engine weights for scoring
   * Higher weight = more important results from this engine
   */
  setEngineWeights(weights: EngineWeight) {
    this.engineWeights = weights;
  }

  /**
   * Configure category weights for scoring
   * Higher weight = more important results from this category
   * Applied as a multiplier on top of engine weights
   */
  setCategoryWeights(weights: CategoryWeight) {
    this.categoryWeights = weights;
  }

  /**
   * Get the weight for a specific engine (default: 1.0)
   */
  private getEngineWeight(engineName: string): number {
    return this.engineWeights[engineName] || 1.0;
  }

  /**
   * Get the weight for a specific category (default: 1.0)
   */
  private getCategoryWeight(category: string): number {
    return this.categoryWeights[category] || 1.0;
  }

  /**
   * Calculate a hash for a result to detect duplicates
   * Based on URL normalization
   */
  private calculateResultHash(result: EngineResult): string {
    const url = result.url || result.link || "";

    try {
      const urlObj = new URL(url);
      // Remove protocol, www, trailing slashes, and query params for better dedup
      let normalized = urlObj.hostname.replace(/^www\./, "") + urlObj.pathname;
      normalized = normalized.replace(/\/$/, "").toLowerCase();

      // Also include title in hash to differentiate pages with same path but different content
      const titlePart = (result.title || "").toLowerCase().replace(/\s+/g, "");

      return `${normalized}:${titlePart.substring(0, 50)}`;
    } catch {
      // Fallback for invalid URLs - use title or content
      const fallback = (result.title || result.content || url).toLowerCase();
      return fallback.replace(/\s+/g, "").substring(0, 100);
    }
  }

  /**
   * Merge two results when a duplicate is found
   * Implements the logic from merge_two_main_results in Python
   */
  private mergeTwoResults(origin: MergedResult, other: EngineResult): void {
    // Use content with more text
    if ((other.content || "").length > (origin.content || "").length) {
      origin.content = other.content;
    }

    // Use title with more text
    if ((other.title || "").length > (origin.title || "").length) {
      origin.title = other.title;
    }

    // Merge additional fields - prefer non-empty values
    if (!origin.img_src && other.img_src) {
      origin.img_src = other.img_src;
    }
    if (!origin.thumbnail && other.thumbnail) {
      origin.thumbnail = other.thumbnail;
    }
    if (!origin.publishedDate && other.publishedDate) {
      origin.publishedDate = other.publishedDate;
    }
    if (!origin.author && other.author) {
      origin.author = other.author;
    }

    // Prefer HTTPS URLs
    const originUrl = origin.url || origin.link || "";
    const otherUrl = other.url || other.link || "";
    if (
      originUrl &&
      !originUrl.startsWith("https://") &&
      otherUrl.startsWith("https://")
    ) {
      origin.url = other.url;
      origin.link = other.link;
    }

    // Add engine to list of result-engines
    if (other.engine && !origin.engines.includes(other.engine)) {
      origin.engines.push(other.engine);
    }
  }

  /**
   * Add results from an engine
   * Implements the extend() method from Python's ResultContainer
   *
   * @param engineName - Name of the engine providing results
   * @param results - Array of results from the engine
   */
  extend(engineName: string, results: EngineResult[]): void {
    if (this.closed) {
      console.warn(
        "ResultContainer is closed, ignoring results from",
        engineName,
      );
      return;
    }

    let mainCount = 0;

    for (const result of results) {
      // Apply the onResult callback for filtering
      if (!this.onResult(result)) {
        continue;
      }

      // Handle different result types
      if ((result as any).suggestion) {
        this.suggestions.add((result as any).suggestion);
        continue;
      }

      if ((result as any).answer) {
        const answer = (result as any).answer;
        this.answers.set(answer, { engine: engineName, answer });
        continue;
      }

      if ((result as any).correction) {
        this.corrections.add((result as any).correction);
        continue;
      }

      if ((result as any).infobox) {
        this.mergeInfobox(result as any, engineName);
        continue;
      }

      if ((result as any).number_of_results) {
        this.numberofResults.push((result as any).number_of_results);
        continue;
      }

      if ((result as any).engine_data) {
        const key = (result as any).key || "data";
        if (!this.engineData[engineName]) {
          this.engineData[engineName] = {};
        }
        this.engineData[engineName][key] = (result as any).engine_data;
        continue;
      }

      // Default: treat as main result
      mainCount++;
      this.mergeMainResult(result, mainCount, engineName);
    }
  }

  /**
   * Merge an infobox result
   * Implements _merge_infobox from Python
   */
  private mergeInfobox(infoboxResult: any, engineName: string): void {
    const newInfobox: Infobox = {
      ...infoboxResult,
      engine: engineName,
      engines: new Set([engineName]),
    };

    // Check for existing infobox with same ID
    if (newInfobox.id) {
      const existing = this.infoboxes.find((ib) => ib.id === newInfobox.id);
      if (existing) {
        this.mergeTwoInfoboxes(existing, newInfobox);
        return;
      }
    }

    this.infoboxes.push(newInfobox);
  }

  /**
   * Merge two infoboxes
   * Implements merge_two_infoboxes from Python
   */
  private mergeTwoInfoboxes(origin: Infobox, other: Infobox): void {
    // Merge engines
    other.engines.forEach((e) => origin.engines.add(e));

    // Merge URLs
    if (other.urls) {
      if (!origin.urls) {
        origin.urls = [];
      }

      for (const url2 of other.urls) {
        const exists = origin.urls.some(
          (url1) =>
            (url2.entity && url1.entity === url2.entity) ||
            url1.url === url2.url,
        );
        if (!exists) {
          origin.urls.push(url2);
        }
      }
    }

    // Use image from other if origin doesn't have one
    if (other.img_src && !origin.img_src) {
      origin.img_src = other.img_src;
    }

    // Merge attributes
    if (other.attributes) {
      if (!origin.attributes) {
        origin.attributes = [];
      }

      const existingLabels = new Set(
        origin.attributes.map((a) => a.label || a.entity).filter(Boolean),
      );

      for (const attr of other.attributes) {
        const key = attr.label || attr.entity;
        if (key && !existingLabels.has(key)) {
          origin.attributes.push(attr);
        }
      }
    }

    // Use longer content
    if (
      other.content &&
      (!origin.content || other.content.length > origin.content.length)
    ) {
      origin.content = other.content;
    }
  }

  /**
   * Merge a main result into the container
   * Implements _merge_main_result from Python
   */
  private mergeMainResult(
    result: EngineResult,
    position: number,
    engineName: string,
  ): void {
    const resultHash = this.calculateResultHash(result);

    const existing = this.mainResultsMap.get(resultHash);

    if (!existing) {
      // New result - add it
      const mergedResult: MergedResult = {
        ...result,
        engine: engineName,
        engines: [engineName],
        positions: [position],
        score: 0,
        priority: (result as any).priority || "normal",
        resultHash,
      };

      this.mainResultsMap.set(resultHash, mergedResult);
    } else {
      // Duplicate found - merge it
      this.mergeTwoResults(existing, result);
      existing.positions.push(position);
    }
  }

  /**
   * Calculate score for a result
   * Implements calculate_score from Python with category weight enhancement
   *
   * Algorithm:
   * - weight starts at 1.0
   * - multiply by engine weight for each engine that found this result
   * - multiply by category weight for the result's category
   * - multiply by number of positions (appearances)
   * - for each position:
   *   - if priority is 'low': skip
   *   - if priority is 'high': add full weight
   *   - if priority is 'normal': add weight/position
   */
  private calculateScore(result: MergedResult): number {
    let weight = 1.0;

    // Apply engine weights
    for (const engineName of result.engines) {
      weight *= this.getEngineWeight(engineName);
    }

    // Apply category weight
    if (result.category) {
      weight *= this.getCategoryWeight(result.category);
    }

    // Multiply by number of occurrences
    weight *= result.positions.length;

    let score = 0;

    for (const position of result.positions) {
      if (result.priority === "low") {
        continue; // Low priority doesn't contribute to score
      } else if (result.priority === "high") {
        score += weight; // High priority gets full weight
      } else {
        // Normal priority: inverse position scoring
        // First result (position 1) gets full weight
        // Second result (position 2) gets half weight, etc.
        score += weight / position;
      }
    }

    return score;
  }

  /**
   * Close the container and calculate all scores
   * Must be called before getting ordered results
   */
  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Calculate scores for all results
    for (const result of this.mainResultsMap.values()) {
      result.score = this.calculateScore(result);
    }
  }

  /**
   * Get ordered results with category grouping
   * Implements get_ordered_results from Python
   *
   * Two-pass algorithm:
   * 1. Sort by score (descending)
   * 2. Group results by category/template to cluster similar results together
   */
  getOrderedResults(): MergedResult[] {
    if (!this.closed) {
      this.close();
    }

    if (this.mainResultsSorted) {
      return this.mainResultsSorted;
    }

    // Pass 1: Sort by score (descending)
    const results = Array.from(this.mainResultsMap.values()).sort(
      (a, b) => b.score - a.score,
    );

    // Pass 2: Group results by category and template
    const groupedResults: MergedResult[] = [];
    const categoryPositions: Map<string, { index: number; count: number }> =
      new Map();

    const maxCount = 8; // Maximum results to group together
    const maxDistance = 20; // Maximum distance to look back for grouping

    for (const res of results) {
      // Determine category key for grouping
      // Group by: category + template + whether it has images
      const hasImage = !!(res.thumbnail || res.img_src);
      const categoryKey = `${res.category || "general"}:${
        res.template || "default"
      }:${hasImage ? "img" : "noimg"}`;

      const group = categoryPositions.get(categoryKey);

      // Try to group with previous results of the same category
      if (
        group &&
        group.count > 0 &&
        groupedResults.length - group.index < maxDistance
      ) {
        // Insert at the group position
        const insertIndex = group.index;
        groupedResults.splice(insertIndex, 0, res);

        // Update all positions after this index
        for (const [key, value] of categoryPositions.entries()) {
          if (value.index >= insertIndex) {
            value.index += 1;
          }
        }

        // Decrease count for this group
        group.count -= 1;
      } else {
        // Start a new group or append
        groupedResults.push(res);
        categoryPositions.set(categoryKey, {
          index: groupedResults.length,
          count: maxCount,
        });
      }
    }

    this.mainResultsSorted = groupedResults;
    return this.mainResultsSorted;
  }

  /**
   * Get raw results without ordering (for debugging)
   */
  getRawResults(): MergedResult[] {
    return Array.from(this.mainResultsMap.values());
  }

  /**
   * Add an unresponsive engine to tracking
   * Implements add_unresponsive_engine from Python
   */
  addUnresponsiveEngine(
    engineName: string,
    errorType: string,
    suspended: boolean = false,
  ): void {
    if (this.closed) {
      console.error("Cannot add unresponsive engine after container is closed");
      return;
    }

    this.unresponsiveEngines.add({
      engine: engineName,
      errorType,
      suspended,
    });
  }

  /**
   * Add timing information for an engine
   * Implements add_timing from Python
   */
  addTiming(
    engineName: string,
    engineTime: number,
    pageLoadTime: number,
  ): void {
    if (this.closed) {
      console.error("Cannot add timing after container is closed");
      return;
    }

    this.timings.push({
      engine: engineName,
      total: engineTime,
      load: pageLoadTime,
    });
  }

  /**
   * Get average number of results from engines that reported it
   * Implements the number_of_results property from Python
   *
   * Returns 0 if the average is less than actual result count
   */
  getNumberOfResults(): number {
    if (!this.closed) {
      console.error("Call to getNumberOfResults before close()");
      return 0;
    }

    if (this.numberofResults.length === 0) {
      return 0;
    }

    const sum = this.numberofResults.reduce((a, b) => a + b, 0);
    const average = Math.floor(sum / this.numberofResults.length);

    // Return 0 if average is less than actual results
    // (this indicates the average is not meaningful)
    const actualResults = this.getOrderedResults().length;
    return average < actualResults ? 0 : average;
  }

  /**
   * Get all timings
   */
  getTimings(): Timing[] {
    if (!this.closed) {
      console.error("Call to getTimings before close()");
      return [];
    }
    return this.timings;
  }

  /**
   * Get statistics about the results
   */
  getStats() {
    const results = Array.from(this.mainResultsMap.values());

    return {
      totalResults: results.length,
      averageScore:
        results.reduce((sum, r) => sum + r.score, 0) / results.length || 0,
      engineCoverage:
        results.reduce((sum, r) => sum + r.engines.length, 0) /
          results.length || 0,
      duplicatesMerged: results.filter((r) => r.engines.length > 1).length,
      categories: [...new Set(results.map((r) => r.category).filter(Boolean))],
      suggestions: this.suggestions.size,
      answers: this.answers.size,
      corrections: this.corrections.size,
      infoboxes: this.infoboxes.length,
      unresponsiveEngines: this.unresponsiveEngines.size,
      numberOfResults: this.getNumberOfResults(),
      paging: this.paging,
    };
  }
}
