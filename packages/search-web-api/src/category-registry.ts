/**
 * Category Registry - Manages engines by category
 *
 * Based on SearXNG's engine categorization system
 * Allows searching specific categories and combining results with proper weighting
 */

import { Engine } from "./engine.js";
import { CategoryConfig } from "./search-web-types.js";

export const CATEGORIES: { [key: string]: CategoryConfig } = {
  general: {
    name: "general",
    displayName: "General",
    description: "General web search",
    defaultWeight: 1.0,
  },
  images: {
    name: "images",
    displayName: "Images",
    description: "Image search",
    defaultWeight: 1.0,
  },
  videos: {
    name: "videos",
    displayName: "Videos",
    description: "Video search",
    defaultWeight: 1.0,
  },
  news: {
    name: "news",
    displayName: "News",
    description: "News search",
    defaultWeight: 1.1, // Slightly higher weight for news
  },
  maps: {
    name: "maps",
    displayName: "Maps",
    description: "Maps and locations",
    defaultWeight: 1.0,
  },
  music: {
    name: "music",
    displayName: "Music",
    description: "Music search",
    defaultWeight: 1.0,
  },
  it: {
    name: "it",
    displayName: "IT",
    description: "Programming and IT resources",
    defaultWeight: 1.2, // Higher weight for technical accuracy
  },
  academic: {
    name: "academic",
    displayName: "Academic",
    description: "Scientific papers and academic resources",
    defaultWeight: 1.3, // Higher weight for academic credibility
  },
  social: {
    name: "social",
    displayName: "Social Media",
    description: "Social media content",
    defaultWeight: 0.9, // Slightly lower weight
  },
  files: {
    name: "files",
    displayName: "Files",
    description: "File search",
    defaultWeight: 1.0,
  },
  torrents: {
    name: "torrents",
    displayName: "Torrents",
    description: "Torrent search",
    defaultWeight: 0.8, // Lower weight due to potential duplicates
  },
  shopping: {
    name: "shopping",
    displayName: "Shopping",
    description: "Shopping and products",
    defaultWeight: 1.0,
  },
  specialized: {
    name: "specialized",
    displayName: "Specialized",
    description: "Specialized search engines",
    defaultWeight: 1.1,
  },
};

/**
 * CategoryRegistry manages engines organized by category
 * Supports multi-category search with proper result combination
 */
export class CategoryRegistry {
  private enginesByCategory: Map<string, Engine[]> = new Map();
  private allEngines: Engine[] = [];

  /**
   * Register an engine in the registry
   */
  registerEngine(engine: Engine): void {
    // Add to all engines list
    if (!this.allEngines.find((e) => e.name === engine.name)) {
      this.allEngines.push(engine);
    }

    // Add to category maps
    const categories = engine.categories || ["general"];
    for (const category of categories) {
      if (!this.enginesByCategory.has(category)) {
        this.enginesByCategory.set(category, []);
      }

      const engines = this.enginesByCategory.get(category)!;
      if (!engines.find((e) => e.name === engine.name)) {
        engines.push(engine);
      }
    }
  }

  /**
   * Register multiple engines
   */
  registerEngines(engines: Engine[]): void {
    for (const engine of engines) {
      this.registerEngine(engine);
    }
  }

  /**
   * Get all engines for specific categories
   */
  getEnginesByCategories(categories: string[]): Engine[] {
    const engines = new Set<Engine>();

    for (const category of categories) {
      const categoryEngines = this.enginesByCategory.get(category) || [];
      for (const engine of categoryEngines) {
        engines.add(engine);
      }
    }

    return Array.from(engines);
  }

  /**
   * Get engines by name
   */
  getEnginesByNames(names: string[]): Engine[] {
    return this.allEngines.filter((e) => names.includes(e.name));
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return Array.from(this.enginesByCategory.keys());
  }

  /**
   * Get all engines
   */
  getAllEngines(): Engine[] {
    return this.allEngines;
  }

  /**
   * Get engines for a single category
   */
  getCategoryEngines(category: string): Engine[] {
    return this.enginesByCategory.get(category) || [];
  }

  /**
   * Get category configuration
   */
  getCategoryConfig(category: string): CategoryConfig | undefined {
    return CATEGORIES[category];
  }

  /**
   * Get statistics about registered engines
   */
  getStats() {
    const stats: { [category: string]: number } = {};

    for (const [category, engines] of this.enginesByCategory.entries()) {
      stats[category] = engines.length;
    }

    return {
      totalEngines: this.allEngines.length,
      categories: this.getCategories().length,
      enginesByCategory: stats,
    };
  }
}

// Global instance
export const categoryRegistry = new CategoryRegistry();
