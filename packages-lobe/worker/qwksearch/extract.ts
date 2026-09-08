/**
 * Article extraction for the extract side panel.
 *
 * Port of `apps/qwksearch-web/lib/scraper/scrape-url.ts` onto the LobeHub
 * foundation. The chain is picked per URL kind by {@link defaultTiersFor}:
 *
 * - **Web pages** — Cloudflare Puppeteer scraper (`SCRAPER_URL`, default
 *   proxy.qwksearch.com) with an 8s deadline → Tavily extract API
 *   (`TAVILY_API_KEY`) → LobeHub's `@lobechat/web-crawler` (naive fetch +
 *   readability).
 * - **YouTube** — `extract-youtube` transcripts, then the web chain as a floor
 *   for videos whose captions are disabled.
 * - **PDF / arXiv** — `extract-pdf` (pdfjs text-layer pipeline), then Tavily.
 *
 * Rendered HTML becomes an article through {@link articleFromHtml}, which runs
 * QwkSearch's `extract-webpage` extractor first — that is what supplies
 * citation-grade metadata (`author_cite`, `author_short`, `author_type`, parsed
 * dates, publisher name) — and falls back to the crawler's readability pass.
 *
 * Every tier returns `{ error }` instead of throwing so the caller can decide
 * whether to advance to the next one.
 */
import { htmlToMarkdown } from '@lobechat/web-crawler/src/utils/htmlToMarkdown';

export interface ExtractedArticle {
  author?: string;
  author_cite?: string;
  author_short?: string;
  author_type?: string;
  cite?: string;
  /** Markdown/plain-text body, used by the LobeHub panel renderer. */
  content?: string;
  date?: string;
  error?: string;
  html?: string;
  source?: string;
  title?: string;
  url?: string;
  /** Which tier produced the article. */
  via?: 'scraper' | 'tavily' | 'crawler' | 'youtube' | 'pdf';
  word_count?: number;
}

export const SCRAPER_DEADLINE_MS = 8000;
/** Shortest plain-text body an extractor may return before it counts as empty. */
export const MIN_CONTENT_CHARS = 50;

const SEARCH_ENGINE_PATTERNS = [
  /^https?:\/\/(www\.)?google\.[^/]+\/search/i,
  /^https?:\/\/(www\.)?bing\.com\/search/i,
  /^https?:\/\/(www\.)?duckduckgo\.com\/\?/i,
];

const VIDEO_PATTERNS = [/vimeo\.com\//i, /dailymotion\.com\/video/i, /twitch\.tv\//i];

const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/;

const ARXIV_ABS_PATTERN = /^https?:\/\/(?:www\.)?arxiv\.org\/abs\/(.+)$/i;

const CHALLENGE_MARKERS = [
  'Just a moment...',
  'Verifying you are human',
  'Please verify you are a human',
  'Enable JavaScript and cookies to continue',
  'Checking your browser before accessing',
  'Please complete the security check to access',
  'Attention Required! | Cloudflare',
  'Page unavailable | AP News',
];

export type UrlKind = 'article' | 'invalid' | 'pdf' | 'search-engine' | 'video' | 'youtube';

/** The 11-character video id of a YouTube URL, or undefined for anything else. */
export const youTubeVideoId = (url: string): string | undefined => {
  if (!url || typeof url !== 'string') return undefined;
  return YOUTUBE_ID_PATTERN.exec(url)?.[1];
};

/**
 * The URL to download PDF bytes from, or undefined when the URL is not a PDF.
 * arXiv abstract pages are rewritten to their `/pdf/` sibling so the paper
 * itself is extracted rather than the landing page.
 */
export const pdfUrlFor = (url: string): string | undefined => {
  const arxiv = ARXIV_ABS_PATTERN.exec(url);
  if (arxiv) return `https://arxiv.org/pdf/${arxiv[1].replace(/\.pdf$/i, '')}`;
  try {
    if (/\.pdf$/i.test(new URL(url).pathname)) return url;
  } catch {
    return undefined;
  }
  return /^https?:\/\/(?:www\.)?arxiv\.org\/pdf\//i.test(url) ? url : undefined;
};

/** Classify a URL the way the qwksearch article route did before hitting the cache. */
export const classifyUrl = (url: string): UrlKind => {
  if (!url || /\s/.test(url)) return 'invalid';
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return 'invalid';
  } catch {
    return 'invalid';
  }
  if (SEARCH_ENGINE_PATTERNS.some((p) => p.test(url))) return 'search-engine';
  if (youTubeVideoId(url)) return 'youtube';
  if (pdfUrlFor(url)) return 'pdf';
  if (VIDEO_PATTERNS.some((p) => p.test(url))) return 'video';
  return 'article';
};

export const looksLikeChallenge = (html?: string | null): boolean => {
  if (!html || typeof html !== 'string') return true;
  return CHALLENGE_MARKERS.some((marker) => html.includes(marker));
};

export const hostnameOf = (url: string): string | undefined => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
};

export const countWords = (text?: string | null): number =>
  text
    ? text
        .replaceAll(/<[^>]*>/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length
    : 0;

/** APA-ish citation string, same shape as the original extractor's URL branch. */
export const buildCite = (article: ExtractedArticle, url: string): string => {
  const source = article.source || '';
  const parsedDate = article.date ? new Date(article.date) : undefined;
  const year = parsedDate ? parsedDate.getFullYear() : Number.NaN;
  const apaDate =
    parsedDate && year > 1971
      ? ` (${year}, ${parsedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`
      : '';
  return `${article.author_cite || source || ' '}${apaDate}. <b>${article.title || ''}</b>. <i>${source}</i>. <a href="${url}" target="_blank">${url}</a>`;
};

const escapeHtml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Minimal markdown → HTML for Tavily/crawler output so `html` is always populated. */
export const markdownToSimpleHtml = (raw: string): string =>
  raw
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = block.match(/^(#{1,6}) (\S.*)$/);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
      }
      const withLinks = escapeHtml(block).replaceAll(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank">$1</a>',
      );
      return `<p>${withLinks.replaceAll('\n', '<br/>')}</p>`;
    })
    .join('\n');

/** Plain text of an HTML fragment, used for the "is this actually empty?" check. */
const textOf = (html?: string | null): string =>
  html
    ? html
        .replaceAll(/<[^>]*>/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim()
    : '';

/**
 * Markdown body for HTML that is already boilerplate-free, so readability is
 * skipped. Falls back to the plain text when the converter yields nothing.
 */
const markdownOf = (html: string, url: string): string => {
  try {
    const parsed = htmlToMarkdown(html, { filterOptions: { enableReadability: false }, url });
    if (parsed.content?.trim()) return parsed.content;
  } catch {
    /* fall through to plain text */
  }
  return textOf(html);
};

/**
 * Assemble the article shape the side panel expects from already-extracted
 * HTML, deriving the markdown body, word count and citation.
 */
export const articleFromExtractedHtml = (
  fields: Omit<ExtractedArticle, 'cite' | 'content' | 'url' | 'via' | 'word_count'>,
  url: string,
  via: ExtractedArticle['via'],
): ExtractedArticle => {
  const html = fields.html || '';
  if (textOf(html).length < MIN_CONTENT_CHARS) {
    return { error: 'Extraction produced no content' };
  }

  const article: ExtractedArticle = {
    ...fields,
    author_cite: fields.author_cite || fields.author,
    content: markdownOf(html, url),
    html,
    source: fields.source || hostnameOf(url),
    url,
    via,
    word_count: countWords(html),
  };
  article.cite = buildCite(article, url);
  return article;
};

/**
 * The subset of `extract-webpage`'s `extractContentAndCite` this module needs:
 * clean article HTML plus the citation fields LobeHub's readability pass drops.
 */
export type HtmlCiteExtractor = (
  html: string,
  options: { url: string },
) => (Omit<ExtractedArticle, 'author_type'> & { author_type?: number | string }) | null | undefined;

let citeExtractor: HtmlCiteExtractor | null | undefined;

/**
 * Load QwkSearch's HTML extractor lazily — it carries linkedom, chrono-node and
 * a 92k-name corpus, so it should not be on the Worker's cold-start path.
 * A load failure degrades to the crawler path rather than failing extraction.
 */
const loadCiteExtractor = async (): Promise<HtmlCiteExtractor | null> => {
  if (citeExtractor !== undefined) return citeExtractor;
  try {
    const { extractContentAndCite } = await import('extract-webpage');
    citeExtractor = extractContentAndCite as HtmlCiteExtractor;
  } catch {
    citeExtractor = null;
  }
  return citeExtractor;
};

/** Tier-agnostic: QwkSearch's extractor over rendered HTML, or undefined. */
const articleViaCiteExtractor = (
  extractor: HtmlCiteExtractor,
  html: string,
  url: string,
  via: ExtractedArticle['via'],
): ExtractedArticle | undefined => {
  let extracted: ReturnType<HtmlCiteExtractor>;
  try {
    extracted = extractor(html, { url });
  } catch {
    return undefined;
  }
  if (!extracted?.html || extracted.error) return undefined;

  const article = articleFromExtractedHtml(
    {
      author: extracted.author,
      author_cite: extracted.author_cite,
      author_short: extracted.author_short,
      author_type: extracted.author_type === undefined ? undefined : String(extracted.author_type),
      date: extracted.date,
      html: extracted.html,
      source: extracted.source,
      title: extracted.title,
    },
    url,
    via,
  );
  return article.error ? undefined : article;
};

/**
 * Readability + markdown conversion over rendered HTML using LobeHub's crawler
 * utilities. The fallback when QwkSearch's extractor finds nothing.
 */
export const articleFromHtmlViaCrawler = (
  html: string,
  url: string,
  via: ExtractedArticle['via'],
): ExtractedArticle => {
  const parsed = htmlToMarkdown(html, { filterOptions: { enableReadability: true }, url });
  if (!parsed.content || parsed.content.trim().length < MIN_CONTENT_CHARS) {
    return { error: 'Extraction produced no content' };
  }

  const article: ExtractedArticle = {
    author: parsed.author,
    author_cite: parsed.author,
    content: parsed.content,
    date: parsed.publishedTime,
    html: markdownToSimpleHtml(parsed.content),
    source: parsed.siteName || hostnameOf(url),
    title: parsed.title,
    url,
    via,
    word_count: countWords(parsed.content),
  };
  article.cite = buildCite(article, url);
  return article;
};

export interface ArticleFromHtmlOptions {
  /**
   * Injection seam. `undefined` loads `extract-webpage` lazily; `null` skips it
   * and goes straight to the crawler path.
   */
  extractCite?: HtmlCiteExtractor | null;
}

/**
 * Turn rendered HTML into the article shape the side panel expects.
 *
 * QwkSearch's `extract-webpage` runs first because it is the only path that
 * produces citation-grade metadata and preserves images, links and headings in
 * the HTML; LobeHub's readability pass is the fallback.
 */
export const articleFromHtml = async (
  html: string,
  url: string,
  via: ExtractedArticle['via'],
  options: ArticleFromHtmlOptions = {},
): Promise<ExtractedArticle> => {
  const extractor =
    options.extractCite === undefined ? await loadCiteExtractor() : options.extractCite;
  const cited = extractor ? articleViaCiteExtractor(extractor, html, url, via) : undefined;
  return cited ?? articleFromHtmlViaCrawler(html, url, via);
};

export interface ScraperConfig {
  apiKey?: string;
  baseUrl?: string;
  deadlineMs?: number;
  fetcher?: typeof fetch;
}

/**
 * Tier 1: render through the Cloudflare Puppeteer scraper worker, then extract.
 */
export const extractViaScraper = async (
  url: string,
  config: ScraperConfig = {},
): Promise<ExtractedArticle> => {
  const baseUrl = config.baseUrl || process.env.SCRAPER_URL || 'https://proxy.qwksearch.com';
  const deadlineMs = config.deadlineMs ?? SCRAPER_DEADLINE_MS;
  const fetcher = config.fetcher ?? fetch;
  const apiKey = config.apiKey || process.env.SCRAPER_API_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);

  try {
    const target = new URL('/api/render', baseUrl);
    const params: Record<string, string> = {
      blockImages: 'true',
      bypassCaptcha: 'true',
      format: 'json',
      maxRetries: '1',
      sessionId: 'default',
      timeout: String(Math.max(deadlineMs - 1000, 4000)),
      url,
      wait: '0',
      waitUntil: 'domcontentloaded',
    };
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetcher(target, { headers, signal: controller.signal });
    if (!res.ok) return { error: `Scraper responded with ${res.status}` };

    const data = (await res.json().catch(() => null)) as { html?: string; url?: string } | null;
    const html = data?.html;
    if (!html || looksLikeChallenge(html)) {
      return { error: 'Scraper returned a challenge page or no content' };
    }

    return await articleFromHtml(html, data?.url || url, 'scraper');
  } catch (error) {
    const e = error as Error;
    const aborted = e?.name === 'AbortError' || controller.signal.aborted;
    return {
      error: aborted ? `Scraper exceeded ${deadlineMs}ms deadline` : e?.message || 'Scraper failed',
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Tier 2: Tavily extract API.
 */
export const extractViaTavily = async (
  url: string,
  apiKey = process.env.TAVILY_API_KEY,
  fetcher: typeof fetch = fetch,
): Promise<ExtractedArticle> => {
  if (!apiKey) return { error: 'No Tavily API key configured' };

  let res: Response;
  try {
    res = await fetcher('https://api.tavily.com/extract', {
      body: JSON.stringify({ extract_depth: 'advanced', urls: [url] }),
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    return { error: (error as Error)?.message || 'Tavily request failed' };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { error: `Tavily extract failed (${res.status}): ${body.slice(0, 200)}` };
  }

  const data = (await res.json().catch(() => null)) as {
    results?: Array<{ raw_content?: string; title?: string; url?: string }>;
  } | null;
  const result = data?.results?.[0];
  if (!result?.raw_content) return { error: 'Tavily returned no content' };

  const article: ExtractedArticle = {
    content: result.raw_content,
    html: markdownToSimpleHtml(result.raw_content),
    source: hostnameOf(result.url || url),
    title: result.title || undefined,
    url: result.url || url,
    via: 'tavily',
    word_count: countWords(result.raw_content),
  };
  article.cite = buildCite(article, url);
  return article;
};

/**
 * Tier 3: LobeHub's own crawler (plain fetch + readability), no external service.
 */
export const extractViaCrawler = async (url: string): Promise<ExtractedArticle> => {
  try {
    const { Crawler } = await import('@lobechat/web-crawler');
    const crawler = new Crawler({ impls: ['naive'] });
    const result = await crawler.crawl({ impls: ['naive'], url });
    const data = result.data as {
      content?: string;
      errorMessage?: string;
      siteName?: string;
      title?: string;
      url?: string;
    };

    if (!data?.content || data.errorMessage) {
      return { error: data?.errorMessage || 'Crawler returned no content' };
    }

    const article: ExtractedArticle = {
      content: data.content,
      html: markdownToSimpleHtml(data.content),
      source: data.siteName || hostnameOf(data.url || url),
      title: data.title,
      url: data.url || url,
      via: 'crawler',
      word_count: countWords(data.content),
    };
    article.cite = buildCite(article, url);
    return article;
  } catch (error) {
    return { error: (error as Error)?.message || 'Crawler failed' };
  }
};

/** One transcript segment, the only part of `extract-youtube`'s model used here. */
export interface TranscriptSnippet {
  text: string;
}

export type TranscriptFetcher = (
  videoId: string,
  languages: string[],
) => Promise<{ snippets?: TranscriptSnippet[] } | null | undefined>;

export interface YouTubeConfig {
  fetcher?: typeof fetch;
  /** Preferred caption languages, most preferred first. */
  languages?: string[];
  /** Injection seam; defaults to `extract-youtube`'s `YouTubeTranscriptApi`. */
  transcript?: TranscriptFetcher | null;
}

const loadTranscriptFetcher = async (): Promise<TranscriptFetcher | null> => {
  try {
    const { YouTubeTranscriptApi } = await import('extract-youtube');
    return async (videoId, languages) =>
      new YouTubeTranscriptApi().fetchTranscript(videoId, { languages });
  } catch {
    return null;
  }
};

/** Words per transcript paragraph — captions arrive as one unbroken run. */
const TRANSCRIPT_PARAGRAPH_WORDS = 90;

/** Group caption snippets into readable paragraphs of roughly equal length. */
export const transcriptToParagraphs = (
  snippets: TranscriptSnippet[],
  wordsPerParagraph = TRANSCRIPT_PARAGRAPH_WORDS,
): string[] => {
  const words = snippets
    .map((s) => s?.text || '')
    .join(' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const paragraphs: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerParagraph) {
    paragraphs.push(words.slice(i, i + wordsPerParagraph).join(' '));
  }
  return paragraphs;
};

/** Title and channel from YouTube's oEmbed endpoint; best-effort, never throws. */
const fetchYouTubeMetadata = async (
  url: string,
  fetcher: typeof fetch,
): Promise<{ author?: string; title?: string }> => {
  try {
    const target = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    const res = await fetcher(target, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    const data = (await res.json().catch(() => null)) as {
      author_name?: string;
      title?: string;
    } | null;
    return { author: data?.author_name || undefined, title: data?.title || undefined };
  } catch {
    return {};
  }
};

/**
 * YouTube tier: the video's transcript, as an article. Replaces the old
 * behaviour where video URLs were either rejected outright or fed to the
 * scraper, which returns the watch page's chrome rather than the content.
 */
export const extractViaYouTube = async (
  url: string,
  config: YouTubeConfig = {},
): Promise<ExtractedArticle> => {
  const videoId = youTubeVideoId(url);
  if (!videoId) return { error: 'Not a YouTube video URL' };

  const fetchTranscript =
    config.transcript === undefined ? await loadTranscriptFetcher() : config.transcript;
  if (!fetchTranscript) return { error: 'YouTube transcript extractor is unavailable' };

  let snippets: TranscriptSnippet[] | undefined;
  try {
    snippets = (
      await fetchTranscript(videoId, config.languages?.length ? config.languages : ['en'])
    )?.snippets;
  } catch (error) {
    return { error: (error as Error)?.message || 'YouTube transcript fetch failed' };
  }

  const paragraphs = snippets?.length ? transcriptToParagraphs(snippets) : [];
  if (paragraphs.length === 0) return { error: 'No transcript available for this video' };

  const meta = await fetchYouTubeMetadata(url, config.fetcher ?? fetch);

  return articleFromExtractedHtml(
    {
      author: meta.author,
      author_cite: meta.author,
      html: paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n'),
      source: 'YouTube',
      title: meta.title || `YouTube video ${videoId}`,
    },
    url,
    'youtube',
  );
};

export type PdfConverter = (
  url: string,
  options: Record<string, unknown>,
) => Promise<{ author?: string; error?: string; html?: string; title?: string } | null | undefined>;

export interface PdfConfig {
  /** Injection seam; defaults to `extract-pdf`'s `convertPDFToHTML`. */
  convert?: PdfConverter | null;
  /** Remote Granite Docling processor for pages with no usable text layer. */
  processorUrl?: string;
}

const loadPdfConverter = async (): Promise<PdfConverter | null> => {
  try {
    const { convertPDFToHTML } = await import('extract-pdf');
    return convertPDFToHTML as PdfConverter;
  } catch {
    return null;
  }
};

/**
 * PDF tier: `extract-pdf`'s text-layer pipeline, which infers headings from
 * font-size statistics and strips running headers and page numbers. arXiv
 * abstract pages are resolved to the paper itself by {@link pdfUrlFor}.
 */
export const extractViaPdf = async (
  url: string,
  config: PdfConfig = {},
): Promise<ExtractedArticle> => {
  const pdfUrl = pdfUrlFor(url);
  if (!pdfUrl) return { error: 'Not a PDF URL' };

  const convert = config.convert === undefined ? await loadPdfConverter() : config.convert;
  if (!convert) return { error: 'PDF extractor is unavailable' };

  const processorUrl = config.processorUrl || process.env.PDF_PROCESSOR_URL;

  let result: Awaited<ReturnType<PdfConverter>>;
  try {
    result = await convert(pdfUrl, {
      addCitation: false,
      ...(processorUrl ? { processor: 'hybrid', processorUrl } : {}),
    });
  } catch (error) {
    return { error: (error as Error)?.message || 'PDF extraction failed' };
  }

  if (!result?.html || result.error) return { error: result?.error || 'PDF returned no content' };

  return articleFromExtractedHtml(
    {
      author: result.author,
      author_cite: result.author,
      html: result.html,
      source: hostnameOf(url),
      title: result.title,
    },
    url,
    'pdf',
  );
};

export type ExtractionTier = (url: string) => Promise<ExtractedArticle>;

/** The web-page chain: rendered HTML first, then remote extraction services. */
export const WEB_TIERS: ExtractionTier[] = [extractViaScraper, extractViaTavily, extractViaCrawler];

/**
 * The chain for a URL, chosen by {@link classifyUrl}. Media kinds lead with the
 * extractor built for them and keep a web fallback so a missing transcript or
 * an unreadable PDF still yields whatever the page itself carries.
 */
export const defaultTiersFor = (url: string): ExtractionTier[] => {
  switch (classifyUrl(url)) {
    case 'youtube': {
      return [extractViaYouTube, ...WEB_TIERS];
    }
    case 'pdf': {
      return [extractViaPdf, extractViaTavily];
    }
    default: {
      return WEB_TIERS;
    }
  }
};

const isUsable = (article: ExtractedArticle) => !!article.html && !article.error;

/**
 * Full fallback chain. Returns the first usable article, otherwise the last
 * tier's error.
 */
export const extractArticle = async (
  url: string,
  tiers: ExtractionTier[] = defaultTiersFor(url),
): Promise<ExtractedArticle> => {
  let last: ExtractedArticle = { error: 'No extraction tier configured' };
  for (const tier of tiers) {
    try {
      last = await tier(url);
    } catch (error) {
      last = { error: (error as Error)?.message || 'Extraction tier threw' };
    }
    if (isUsable(last)) return last;
  }
  return last;
};
