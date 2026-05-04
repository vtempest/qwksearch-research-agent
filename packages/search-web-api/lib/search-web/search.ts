import { EngineFunction, EngineResult } from "./engine.js";
import { engineStatusTracker } from "./engine-status.js";
import { ResultContainer } from "./result-container.js";
import { MergedResult, CategoryWeight } from "./search-web-types.js";
import { categoryRegistry, CATEGORIES } from "./category-registry.js";

// General search engines
import { google } from "./sources/general/google.js";
import { bing } from "./sources/general/bing.js";
import { duckduckgo } from "./sources/general/duckduckgo.js";
import { yahoo } from "./sources/general/yahoo.js";
import { qwant } from "./sources/general/qwant.js";
import { startpage } from "./sources/general/startpage.js";
import { brave } from "./sources/general/brave.js";
import { yandex } from "./sources/general/yandex.js";
import { baidu } from "./sources/general/baidu.js";
import { mojeek } from "./sources/general/mojeek.js";

// IT/Developer engines
import { github } from "./sources/it/github.js";
import { stackoverflow } from "./sources/it/stackoverflow.js";
import { npm } from "./sources/it/npm.js";
import { crates } from "./sources/it/crates.js";
import { dockerhub } from "./sources/it/dockerhub.js";
import { pypi } from "./sources/it/pypi.js";
import { packagist } from "./sources/it/packagist.js";
import { rubygems } from "./sources/it/rubygems.js";
import { gitlab } from "./sources/it/gitlab.js";

// Images engines
import { unsplash } from "./sources/images/unsplash.js";
import { bing_images } from "./sources/images/bing_images.js";
import { google_images } from "./sources/images/google_images.js";
import { flickr } from "./sources/images/flickr.js";
import { imgur } from "./sources/images/imgur.js";
import { pixabay } from "./sources/images/pixabay.js";
import { wallhaven } from "./sources/images/wallhaven.js";
import { deviantart } from "./sources/images/deviantart.js";
import { openclipart } from "./sources/images/openclipart.js";

// Videos engines
import { youtube } from "./sources/videos/youtube.js";
import { vimeo } from "./sources/videos/vimeo.js";
import { dailymotion } from "./sources/videos/dailymotion.js";
import { invidious } from "./sources/videos/invidious.js";
import { peertube } from "./sources/videos/peertube.js";
import { bing_videos } from "./sources/videos/bing_videos.js";

// News engines
import { hackernews } from "./sources/news/hackernews.js";
import { yahoo_news } from "./sources/news/yahoo_news.js";
import { bing_news } from "./sources/news/bing_news.js";
import { google_news } from "./sources/news/google_news.js";

// Academic engines
import { google_scholar } from "./sources/academic/google_scholar.js";
import { arxiv } from "./sources/academic/arxiv.js";
import { wikidata } from "./sources/academic/wikidata.js";
import { semantic_scholar } from "./sources/academic/semantic_scholar.js";
import { crossref } from "./sources/academic/crossref.js";
import { pubmed } from "./sources/academic/pubmed.js";
import { openalex } from "./sources/academic/openalex.js";
import { doaj } from "./sources/academic/doaj.js";
import { core } from "./sources/academic/core.js";

// Torrent engines
import { torrent_1337x } from "./sources/torrents/1337x.js";
import { thepiratebay } from "./sources/torrents/thepiratebay.js";
import { nyaa } from "./sources/torrents/nyaa.js";
import { yts } from "./sources/torrents/yts.js";
import { eztv } from "./sources/torrents/eztv.js";
import { solidtorrents } from "./sources/torrents/solidtorrents.js";
import { kickass } from "./sources/torrents/kickass.js";

// Social media engines
import { twitter } from "./sources/social/twitter.js";
import { reddit } from "./sources/social/reddit.js";
import { medium } from "./sources/social/medium.js";
import { soundcloud } from "./sources/social/soundcloud.js";
import { mastodon } from "./sources/social/mastodon.js";

// Maps engines
import { openstreetmap } from "./sources/maps/openstreetmap.js";
import { photon } from "./sources/maps/photon.js";
import { apple_maps } from "./sources/maps/apple_maps.js";

// Shopping engines
import { ebay } from "./sources/shopping/ebay.js";

// Specialized engines
import { wikipedia } from "./sources/specialized/wikipedia.js";
import { imdb } from "./sources/specialized/imdb.js";
import { genius } from "./sources/specialized/genius.js";
import { archive } from "./sources/specialized/archive.js";
import { openlibrary } from "./sources/specialized/openlibrary.js";
import { wttr } from "./sources/specialized/wttr.js";
import { annas_archive } from "./sources/specialized/annas_archive.js";
import { goodreads } from "./sources/specialized/goodreads.js";
import grab from "grab-url";

grab('', {
  setDefaults: true,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
});

interface EngineMetadata {
  name: string;
  fn: EngineFunction;
  categories: string[];
  description?: string;
}


import { engineDescriptions } from "./engine-descriptions.js";

const readmeDescriptions: Record<string, string> = {
  "-------------": "------------------------------------------------------------------",
  "google": "Video-focused search results from Google",
  "bing": "Microsoft's web search engine for the general web",
  "brave": "Video search vertical of Brave Search",
  "duckduckgo": "Video search results from DuckDuckGo",
  "qwant": "Video search vertical from Qwant",
  "startpage": "Search engine that proxies Google results with enhanced privacy",
  "yahoo": "Web portal providing search, email, and news",
  "ask": "Question-answering oriented web search engine",
  "wikipedia": "Free, community-edited online encyclopedia",
  "wikidata": "Structured, collaborative knowledge base from Wikimedia",
  "wolframalpha": "Computational knowledge engine for factual queries and calculations",
  "---------------": "----------------------------------------------------------------------",
  "mojeek": "News search vertical from the independent Mojeek engine",
  "bing_news": "News aggregation and search from Microsoft Bing",
  "google_news": "Google's personalized news aggregation and search service",
  "yahoo_news": "News portal and search from Yahoo",
  "tagesschau_(de)": "German-language news search for Tagesschau, a major public broadcaster",
  "-----------------": "--------------------------------------------------------------",
  "bing_videos": "Video search vertical from Microsoft Bing",
  "bilibili": "Chinese video sharing and streaming platform popular for animation and games",
  "dailymotion": "Global video-sharing and hosting platform",
  "invidious": "Alternative, privacy-friendly front-end for YouTube content",
  "odysee": "Decentralized, blockchain-based video hosting platform",
  "peertube": "Federated, open source video hosting network",
  "piped": "Privacy-respecting alternative front-end for YouTube",
  "rumble": "Video sharing platform focusing on independent creators",
  "vimeo": "Ad-free video hosting platform used by filmmakers and businesses",
  "youtube": "Video platform heavily used for streaming music and music videos",
  "bing_images": "Image search engine by Microsoft Bing",
  "brave_images": "Image search vertical of Brave Search",
  "duckduckgo_images": "Image search results from DuckDuckGo",
  "google_images": "Google's dedicated image search service",
  "qwant_images": "Image search vertical from Qwant",
  "deviantart": "Online community and gallery for digital art and illustrations",
  "flickr": "Image and short video hosting platform for photographers",
  "imgur": "Image hosting and sharing site popular for memes and galleries",
  "pinterest": "Visual discovery, bookmarking, and inspiration social platform",
  "unsplash": "Library of freely usable, high-resolution photos",
  "wallhaven": "Community-driven wallpaper and background image repository",
  "wikimedia_commons": "Image search across media stored on Wikimedia Commons",
  "------------------------": "-----------------------------------------------------------------",
  "arxiv": "Repository of preprint research papers in physics, math, CS and more",
  "core": "Aggregator of open access research papers from repositories worldwide (requires CORE_API_KEY)",
  "crossref": "Infrastructure service providing DOIs and metadata for scholarly content",
  "doaj": "Directory of Open Access Journals — community-curated index of open access scholarly articles",
  "google_scholar": "Google's search engine for scholarly literature and citations",
  "internet_archive_scholar": "Internet Archive search for digitized scholarly works",
  "openalex": "Open catalog of scholarly works, authors, and institutions (successor to Microsoft Academic)",
  "pubmed": "Database of biomedical and life sciences literature from NCBI",
  "semantic_scholar": "AI-powered literature search and discovery tool for research papers",
  "---------------------": "---------------------------------------------------------------------",
  "alpine_linux_packages": "Search index for Alpine Linux software packages",
  "crates.io": "Official package registry for Rust crates",
  "docker_hub": "Central repository of Docker container images",
  "hex": "Package manager and repository for the Erlang and Elixir ecosystem",
  "hoogle": "API search engine for Haskell libraries and functions",
  "lib.rs": "Alternative index and front-end for Rust crates",
  "metacpan": "Search engine for Perl modules hosted on CPAN",
  "npm": "Package registry and manager for JavaScript and Node.js",
  "packagist": "Primary package repository for PHP Composer",
  "pkg.go.dev": "Documentation and discovery service for Go modules",
  "pub.dev": "Package repository for Dart and Flutter packages",
  "pypi": "Python Package Index, the main repository for Python packages",
  "rubygems": "Package manager and repository for Ruby gems",
  "void_linux": "Package search for the Void Linux distribution",
  "ask_ubuntu": "Q&A site focused on Ubuntu usage and troubleshooting",
  "stack_overflow": "Question-and-answer site for programmers and software development",
  "super_user": "Q&A site for advanced computer users and system administration",
  "bitbucket": "Git-based source code hosting and collaboration platform by Atlassian",
  "codeberg": "Non-profit, open source Git hosting platform",
  "gitea": "Hosted instance of the lightweight Gitea Git service",
  "github": "Popular Git-based code hosting and collaboration platform",
  "gitlab": "DevOps platform offering Git hosting, CI/CD, and project management",
  "sourcehut": "Minimalist suite of tools for software development and mailing lists",
  "arch_linux_wiki": "Extensive documentation wiki for Arch Linux and related tools",
  "gentoo": "Documentation wiki for the Gentoo Linux distribution",
  "mdn": "Mozilla Developer Network documentation for web technologies",
  "searchcode": "Search engine indexing source code across public repositories",
  "library_of_congress": "Catalog and digital collections from the U.S. Library of Congress",
  "wikibooks": "Wikimedia project hosting free textbooks and manuals",
  "wikisource": "Wikimedia digital library of source texts and documents",
  "wikiversity": "Wikimedia project for educational resources and courses",
  "wikivoyage": "Free, community-created travel guide from Wikimedia",
  "google_play_movies": "Google's store for purchasing and renting movies and TV series",
  "mediathekviewweb_(de)": "Web interface to German public TV media libraries",
  "ina_(fr)": "French National Audiovisual Institute archive search",
  "wikimedia_commons_videos": "Search for video media stored on Wikimedia Commons",
  "wikimedia_commons_audio": "Search for audio files stored on Wikimedia Commons",
  "apk_mirror": "Repository for Android APK files outside official app stores",
  "apple_app_store": "Official iOS and iPadOS app distribution platform",
  "f-droid": "Catalog of free and open source Android applications",
  "google_play_apps": "Official Android app store operated by Google",
  "---------": "-----------------------------------------------------------------------",
  "reddit": "Social news aggregation and discussion website organized by communities",
  "9gag": "Humor-focused social media site for sharing memes and short posts",
  "lemmy": "Post search across Lemmy, a federated link-aggregation platform",
  "apple_maps": "Apple's mapping and navigation service for its devices",
  "openstreetmap": "Collaborative, open data world map project",
  "genius": "Platform for song lyrics, annotations, and music commentary",
  "radio_browser": "Directory and search engine for online radio stations",
  "bandcamp": "Music platform for independent artists to sell and stream releases",
  "deezer": "On-demand music streaming service",
  "mixcloud": "Streaming platform for DJ mixes, radio shows, and podcasts",
  "soundcloud": "Audio distribution and music sharing platform for creators"
};

export const ALL_ENGINES: EngineMetadata[] = [
    // General search (10)
    { name: "google", fn: google, categories: ["general"] },
    { name: "bing", fn: bing, categories: ["general"] },
    { name: "duckduckgo", fn: duckduckgo, categories: ["general"] },
    { name: "yahoo", fn: yahoo, categories: ["general"] },
    { name: "qwant", fn: qwant, categories: ["general"] },
    { name: "startpage", fn: startpage, categories: ["general"] },
    { name: "brave", fn: brave, categories: ["general"] },
    { name: "yandex", fn: yandex, categories: ["general"] },
    { name: "baidu", fn: baidu, categories: ["general"] },
    { name: "mojeek", fn: mojeek, categories: ["general"] },
    // IT/Developer (9)
    { name: "github", fn: github, categories: ["it"] },
    { name: "gitlab", fn: gitlab, categories: ["it"] },
    { name: "stackoverflow", fn: stackoverflow, categories: ["it"] },
    { name: "npm", fn: npm, categories: ["it"] },
    { name: "crates", fn: crates, categories: ["it"] },
    { name: "dockerhub", fn: dockerhub, categories: ["it"] },
    { name: "pypi", fn: pypi, categories: ["it"] },
    { name: "packagist", fn: packagist, categories: ["it"] },
    { name: "rubygems", fn: rubygems, categories: ["it"] },
    // Images (9)
    { name: "unsplash", fn: unsplash, categories: ["images"] },
    { name: "bing_images", fn: bing_images, categories: ["images"] },
    { name: "google_images", fn: google_images, categories: ["images"] },
    { name: "flickr", fn: flickr, categories: ["images"] },
    { name: "imgur", fn: imgur, categories: ["images"] },
    { name: "pixabay", fn: pixabay, categories: ["images"] },
    { name: "wallhaven", fn: wallhaven, categories: ["images"] },
    { name: "deviantart", fn: deviantart, categories: ["images"] },
    { name: "openclipart", fn: openclipart, categories: ["images"] },
    // Videos (6)
    { name: "youtube", fn: youtube, categories: ["videos"] },
    { name: "vimeo", fn: vimeo, categories: ["videos"] },
    { name: "dailymotion", fn: dailymotion, categories: ["videos"] },
    { name: "bing_videos", fn: bing_videos, categories: ["videos"] },
    { name: "invidious", fn: invidious, categories: ["videos"] },
    { name: "peertube", fn: peertube, categories: ["videos"] },
    // News (4)
    { name: "hackernews", fn: hackernews, categories: ["news"] },
    { name: "yahoo_news", fn: yahoo_news, categories: ["news"] },
    { name: "bing_news", fn: bing_news, categories: ["news"] },
    { name: "google_news", fn: google_news, categories: ["news"] },
    // Academic (9)
    { name: "google_scholar", fn: google_scholar, categories: ["academic"] },
    { name: "arxiv", fn: arxiv, categories: ["academic"] },
    { name: "wikidata", fn: wikidata, categories: ["academic"] },
    { name: "semantic_scholar", fn: semantic_scholar, categories: ["academic"] },
    { name: "crossref", fn: crossref, categories: ["academic"] },
    { name: "pubmed", fn: pubmed, categories: ["academic"] },
    { name: "openalex", fn: openalex, categories: ["academic"] },
    { name: "doaj", fn: doaj, categories: ["academic"] },
    { name: "core", fn: core, categories: ["academic"] },
    // Torrents (7)
    { name: "1337x", fn: torrent_1337x, categories: ["torrents"] },
    { name: "thepiratebay", fn: thepiratebay, categories: ["torrents"] },
    { name: "nyaa", fn: nyaa, categories: ["torrents"] },
    { name: "yts", fn: yts, categories: ["torrents"] },
    { name: "eztv", fn: eztv, categories: ["torrents"] },
    { name: "solidtorrents", fn: solidtorrents, categories: ["torrents"] },
    { name: "kickass", fn: kickass, categories: ["torrents"] },
    // Social (5)
    { name: "twitter", fn: twitter, categories: ["social"] },
    { name: "reddit", fn: reddit, categories: ["social"] },
    { name: "medium", fn: medium, categories: ["social"] },
    { name: "soundcloud", fn: soundcloud, categories: ["social"] },
    { name: "mastodon", fn: mastodon, categories: ["social"] },
    // Maps (3)
    { name: "openstreetmap", fn: openstreetmap, categories: ["maps"] },
    { name: "photon", fn: photon, categories: ["maps"] },
    { name: "apple_maps", fn: apple_maps, categories: ["maps"] },
    // Shopping (1)
    { name: "ebay", fn: ebay, categories: ["shopping"] },
    // Specialized (8)
    { name: "wikipedia", fn: wikipedia, categories: ["specialized"] },
    { name: "imdb", fn: imdb, categories: ["specialized"] },
    { name: "genius", fn: genius, categories: ["specialized"] },
    { name: "archive", fn: archive, categories: ["specialized"] },
    { name: "openlibrary", fn: openlibrary, categories: ["specialized"] },
    { name: "wttr", fn: wttr, categories: ["specialized"] },
    { name: "annas_archive", fn: annas_archive, categories: ["specialized"] },
    { name: "goodreads", fn: goodreads, categories: ["specialized"] },
  ];

export class Search {
  private engines: EngineMetadata[] = ALL_ENGINES;

  constructor() {
    // Initialize all engines in the status tracker and category registry
    this.engines.forEach((engine) => {
      engineStatusTracker.initEngine(engine.name, engine.categories);
      categoryRegistry.registerEngine({
        name: engine.name,
        categories: engine.categories,
        request: async () => { },
        response: async () => [],
      });
    });
  }

  async search(
    query: string,
    pageno: number = 1,
    engineNames?: string[],
    categories?: string[]
  ): Promise<MergedResult[]> {
    // Create a new result container for this search
    const resultContainer = new ResultContainer();

    const encodedQuery = query.trim();

    // Configure engine weights (you can customize these based on engine quality/reliability)
    const engineWeights: { [key: string]: number } = {
      google: 1.5,
      bing: 1.3,
      duckduckgo: 1.2,
      brave: 1.1,
      startpage: 1.1,
      // Academic engines get higher weight for quality
      google_scholar: 1.4,
      semantic_scholar: 1.3,
      arxiv: 1.3,
      // Default weight for others: 1.0
    };
    resultContainer.setEngineWeights(engineWeights);

    // Configure category weights from the CATEGORIES configuration
    const categoryWeights: CategoryWeight = {};
    for (const [key, config] of Object.entries(CATEGORIES)) {
      categoryWeights[key] = config.defaultWeight;
    }
    resultContainer.setCategoryWeights(categoryWeights);

    // Determine which engines to use based on filters
    let enginesToUse: EngineMetadata[];

    if (engineNames && engineNames.length > 0) {
      // Use specific engines by name
      enginesToUse = this.engines.filter((engine) =>
        engineNames.includes(engine.name)
      );
    } else if (categories && categories.length > 0) {
      // Use engines from specific categories
      enginesToUse = this.engines.filter((engine) =>
        engine.categories.some((cat) => categories.includes(cat))
      );
    } else {
      // Use all engines
      enginesToUse = this.engines;
    }

    const promises = enginesToUse
      .filter((engine) => {
        // Filter by health status
        if (!engineStatusTracker.isEngineHealthy(engine.name)) {
          console.log(`Skipping unhealthy engine: ${engine.name}`);
          return false;
        }
        return true;
      })
      .map(async (engine) => {
        const startTime = Date.now();
        try {
          const engineResults = await engine.fn(encodedQuery, pageno);

          const responseTime = Date.now() - startTime;
          engineStatusTracker.recordSuccess(engine.name, responseTime, query);

          // Add category to each result from engine's categories
          if (engineResults && Array.isArray(engineResults)) {
            engineResults.forEach((result) => {
              if (!result.category && engine.categories.length > 0) {
                result.category = engine.categories[0];
              }
            });

            // Add results to container (handles deduplication and merging)
            resultContainer.extend(engine.name, engineResults);
          }
        } catch (error) {
          const responseTime = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          engineStatusTracker.recordFailure(
            engine.name,
            errorMessage,
            responseTime,
            query
          );
          console.error(`Error in engine ${engine.name}:`, errorMessage);
        }
      });

    await Promise.all(promises);

    // Close container to calculate scores
    resultContainer.close();

    // Get ordered and grouped results
    const orderedResults = resultContainer.getOrderedResults();

    // Log statistics
    const stats = resultContainer.getStats();
    console.log(
      `Search "${query}": ${stats.totalResults} results, ${stats.duplicatesMerged
      } merged, avg ${stats.engineCoverage.toFixed(1)} engines/result`
    );

    return orderedResults;
  }

  /**
   * Search by specific categories and combine results
   * This method demonstrates multi-category search with proper result combination
   *
   * @param query - Search query
   * @param categories - Array of categories to search (e.g., ['general', 'news', 'academic'])
   * @param pageno - Page number (default: 1)
   * @returns Combined and weighted results from all categories
   */
  async searchByCategories(
    query: string,
    categories: string[],
    pageno: number = 1
  ): Promise<MergedResult[]> {
    return this.search(query, pageno, undefined, categories);
  }

  /**
   * Get all available engines
   */
  getEngines(): string[] {
    return this.engines.map((e) => e.name);
  }

  /**
   * Get engines by category
   */
  getEnginesByCategory(category: string): string[] {
    return this.engines
      .filter((e) => e.categories.includes(category))
      .map((e) => e.name);
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return categoryRegistry.getCategories();
  }

  /**
   * Get category statistics
   */
  getCategoryStats() {
    return categoryRegistry.getStats();
  }

  /**
   * Get engine status
   */
  getEngineStatus(engineName: string) {
    return engineStatusTracker.getStatus(engineName);
  }

  /**
   * Get all engine statuses
   */
  getAllEngineStatuses() {
    return engineStatusTracker.getAllStatuses();
  }
}
