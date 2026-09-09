# Changelog

Commit counts are commits authored that month on the default branch, merge commits included.

# MVP Phase (2026)

## September 2026 — 72 commits

The biggest bet this cycle is **LobeHub** (a Cloudflare Workers port of the lobe-chat monorepo) as the future core engine for chat and settings, with QwkSearch's homepage, article extraction, and REASON docs layered on top. It landed in stages: a full `packages-lobe` foundation — Hono worker, Better Auth, tRPC, D1/KV/R2/Hyperdrive bindings, plus QwkSearch's article side-panel and docs surfaces ported over — and a comprehensive test suite for it (#310); then all 96 upstream packages vendored verbatim into `packages-third-party` alongside a core-engine architecture plan (#313); the vendored tree was then removed again (#315) in favor of a phased migration plan for the chat-engine and settings cutover (#318). The first phase of that plan then landed: LobeHub's web-browsing tool can now search through QwkSearch's own engine fan-out via a new `qwksearch` search provider, and the plan gained two living companion docs — a per-item migration to-do list and a file-by-file reference of every QwkSearch↔LobeHub integration.

The **REASON editor sidebar** was extracted into its own `react-reason-editor-sidebar` package (#305), which took several follow-up fixes to build and style correctly: build-order fixes so the sidebar compiles before the packages that depend on it (#306, #308, #309), then restoring the Tailwind `@source` scan and dock-offset padding lost in the move and un-wiping Open Tabs from the default panel layout (#319). Sidebar panels were further refined to stack with Open Tabs above Files, infer split view from panel count instead of a checkbox, and fix expand/collapse-all cycling (#321), alongside a sidebar-footer visibility fix and a duplicate font-size entry fix (#320). The REASON toolbar also gained a configurable keyboard-shortcut system, with a central shortcut registry, live-updating tooltip shortcut chips, conflict detection, and a new Settings section for remapping bindings (#323).

**Search & extraction**: `extract-pdf-docling` was merged back into `extract-pdf` with selectable processor modes (frontend/hybrid/docling) and a dependency-free OCR page-scan heuristic (#316). `extract-youtube` gained a standalone React popout transcript modal ported from debate-ai.com (#307). The article sidebar now detects Markdown-only scrape responses (e.g. from the JINA reader fallback) and renders them properly instead of showing raw `![]()` syntax, stripping navigation/cookie boilerplate along the way (#314).

**Reliability & ops**: chat failures now surface as a persistent error bubble in the conversation instead of a silent toast, backed by a new `/admin/chat-test` diagnostics page, and admin access is now strictly gated to `ADMIN_EMAILS` with no first-user fallback (#322). D1 reads now route through the Sessions API with per-request version bookmarking so enabling read replication can't serve stale or out-of-order data (#324). Scoped CORS was added to the public, guest-usable agent routes so debate-ai.com can call them directly without an iframe (#312).

**Other**: training jobs now provision GPUs on Vast.ai's marketplace from the web dashboard instead of running in-container (#303). The `/features` marketing page gained a product-comparison table against Perplexity/ChatGPT/Claude/Google/Grok (#317) and an updated hero tagline (#311).

## August 2026 — 168 commits

Editor work centered on making **Plate** the default REASON editor engine, adding the dictation and sidebar plugins it was still missing relative to the Tiptap engine (#295), alongside layout fixes: the editable area now fills its pane without a stray border, zoom scales layout instead of applying a post-layout transform, and the Page Settings popup was fixed to render as its own portalled panel instead of clipping under a dropdown (#288). The `packages/reason-editor/demo/` app, documented throughout the package's README but missing from the repo, was reconstructed from its pre-rename history (#280).

**Search results**: video results gained inline playback via a player dialog when a safe `iframe_src` is available, instead of always opening a new tab (#282); a shared, tested `mapSearchResultToDocument` helper replaced duplicated pagination-mapping logic that had been silently dropping `img_src` from paginated Images results (#283).

**Homepage widgets**: the weather widget's rain badges are now gated to only show above 2% precipitation probability, with a more compact upcoming-days row, and the trending-news widget gained an expandable vertical view (#297); trending-news cards also gained per-topic article thumbnails, plus new homepage settings to toggle and customize both the weather and trending-news widgets (#300).

**Marketing**: added a `/features` page with a hero, animated counters, an engine-name marquee, a capability bento grid, and a pipeline/client-tabs walkthrough (#289).

**Packaging & CI**: dropped `prepare`/`postinstall` lifecycle scripts from several packages (extract-pdf, extract-youtube, reason-editor, use-voice-control, qwksearch-ext) that were causing false-positive `bun install --frozen-lockfile` failures, and bumped the pinned bun version to 1.4.0 to fix the same underlying issue (#296, #298). Package README badges were switched from weekly to monthly npm-download counts, and an uptime status badge was added to the root README (#293, #294).

**Planning**: drafted an initial LobeHub package-integration plan triaging lobe-chat's ~90 workspace packages into adopt/port/skip (#286), and triaged 7 stale open PRs as already superseded by master (#287).

## July 2026 — 473 commits

Major framework modernization with **Vinext** and **Vite 8** (rolldown-based). Replaced **LangChain** with **Vercel AI SDK** across the chat pipeline. Improved error handling in model loading and database operations. Fixed Worker deployments, CommonJS/ESM compatibility, and frozen lockfile issues.

**Model Update**: Changed default model for OpenRouter provider from Kimi 2.5 to **Nemotron 3 Super 120B** for all users and guests. Updated chat configuration to prioritize Nemotron models across the platform.

**Multi-Provider Model Connections**: Added a `ConnectedModelsModal` and `AddProviderDialog` so users can connect their own API keys across 10+ LLM providers. Enhanced the `ModelSelect` component with search and category filtering, added a fallback for unmatched models in the `ModelFamiliesCarousel`, and replaced provider text labels with provider logo chips. Models are now click-to-select, and the API-key link was moved out of the family carousel into a dedicated flow.

**Local Text-to-Speech**: Integrated **Kokoro.js** for on-device TTS with expanded voice settings, giving article and answer read-aloud that runs locally without a cloud speech API.

**Agent Toolkit**: Added **Mastra** telemetry and workflow capabilities to the research agent, and initialized the shared `AGENT_TOOLS` registry so tools are orchestrated through a single array.

**Follow-up Suggestions**: Added a `suggestions` column to the `messages` table (with corrected migration history and schema snapshot) to persist generated follow-up questions per message.

**Auth & Sessions**: Added **Discord** and **LinkedIn** social login, and sorted active sessions by last-updated time so the most recent conversations surface first.

**Settings Overhaul**: Introduced per-tab URLs with copyable anchor links, provider logo chips, and click-to-select model rows for deep-linkable, shareable configuration.

**Search & Extraction**: Refactored search engine and academic sources to use the native `fetch` API (dropping `grab-url`), and switched the scraper API to the `URL` constructor for parameter extraction. Removed the `youtube-po-token-generator` dependency and retired the `youtube-to-text` path in favor of the leaner transcript extractor.

**API Client Migration**: Migrated chat API calls (`useHistoryState`, `DeleteChatSessionButton`, `chatMessages`) to the published **qwksearch-api-client** (bumped to 0.9.1), consolidating backend access behind the typed client.

**Rendering**: Replaced **Prism.js** with a custom `highlightCode` function and reorganized the Markdown-to-HTML conversion logic, adding broader language support along the way.

**Reliability Fixes**: Surfaced root-cause database errors when message saves fail, fixed a chat-history save primary-key conflict, removed a defunct free model, and corrected mobile padding on the chat homepage.

**Docs & Packaging**: Standardized package **READMEs** with NPM monthly-download and version badges, removed redundant badge sections, corrected the `search-web-api` package name, and updated PDF conversion expectations in the docs.


## June 2026 — 88 commits

UI/UX overhaul with migration from **@opennextjs/cloudflare** to **Vinext**. Implemented **macOS-style category dock** with theme switching. Consolidated authentication with **better-auth 1.6.14** and **Web Crypto API**. Added responsive layouts, **dynamic island TOC** positioning, and font controls. Fixed vite-rolldown aliasing and turbopack build failures. Enhanced deployment scripts.

## May 2026 — 113 commits

Editor and authentication enhancements. Integrated **Google One Tap** with FedCM and incognito mode. Added **Shiki code highlighting**, **Mermaid diagrams**, word count modals, and document export. Implemented file management with lazy initialization. Expanded settings with API key controls and sign-out. Added **reason-editor** module with new plugins. Refactored database schema for cross-environment compatibility. Updated **OpenNext Cloudflare** deployment with PWA assets.

## April 2026 — 3 commits

**Major V2 rewrite** with fundamental restructuring. Optimized project structure and removed deprecated dependencies. Reorganized scraper infrastructure with rebuilt **Next.js** configuration. Overhauled documentation and README. Refactored research agent components and migrated chat/article modules. Enhanced editor with font customization and menu improvements. Improved **Cloudflare Workers** configuration.


# Prototype Phase (2024)

## December 2024 — 6 commits

**Beta V1 major release** with complete feature set. Comprehensive login and user management. Integrated editor with full capabilities. **Docusaurus** documentation with **OpenAPI** and **TypeDoc** support. Automatic API reference generation. First production-ready version.

## November 2024 — 1 commit

Search infrastructure improvements. Enhanced **Docker-based** search system with better reliability. Fixed **YouTube** integration for video content. Added **DOCX** file format support. Fixed **USearch** vector accuracy issues. Enhanced content extraction capabilities.

## October 2024 — 2 commits

Topic modeling and citations. Completed **SeekTopic** integration for topic extraction and analysis. Standardized citation formatting platform-wide. Improved README with better examples. Focused on academic and research features.

## September 2024 — 13 commits

Core algorithm implementations. Built **VSEARCH** (Vector Similarity Embedding Approximation) as custom vector search. Added category systems for organization. Introduced **Tardigrade web crawler** for distributed crawling. Expanded documentation with categories. Enhanced main UI. Established algorithmic foundations.

## August 2024 — 26 commits

Content extraction and NLP. Ported **Trafilatura.js** from Python (33 files) for article extraction. Enhanced **Readability2** accuracy. Added **UMAP** dimensionality reduction. Implemented **HNSW** vector search with demos. Modularized extractors (Readability, Postlight). Adopted "code as art" philosophy. Implemented **TypeDoc** documentation. Added **YouTube embed API** with transcript optimization. Enhanced extension with CORS support.

## July 2024 — 27 commits

Search algorithms and autocomplete. Implemented **DSEEK** keyphrase extraction with **TextRank**, **WikiIDF**, and noun edge-grams. Added query autocomplete with live demo. Introduced new compression formats. Integrated **OpenEnglishWordnet** and 35k Wikipedia pages. Added **RAG** use case. Implemented **Wiki BM25** with 1M/2M datasets. Published results demo. Enhanced search quality and linguistic capabilities.
