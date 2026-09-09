/**
 * Article extraction for the extract side panel.
 *
 * Port of `apps/qwksearch-web/lib/scraper/scrape-url.ts` onto the LobeHub
 * foundation. Bounded fallback chain, routed per URL kind by {@link tiersForUrl}:
 *   0. QwkSearch's own `extract-webpage` — citation extraction for articles,
 *      `extract-youtube` transcripts for videos, `extract-pdf` for PDFs.
 *   1. Cloudflare Puppeteer scraper (`SCRAPER_URL`, default proxy.qwksearch.com)
 *      with an 8s deadline, then citation extraction over the rendered HTML
 *      (falling back to LobeHub readability).
 *   2. Tavily extract API (`TAVILY_API_KEY`).
 *   3. LobeHub's own `@lobechat/web-crawler` (naive fetch + readability).
 *
 * Every tier returns `{ error }` instead of throwing so the caller can decide
 * whether to advance to the next one.
 */
import { htmlToMarkdown } from '@lobechat/web-crawler/src/utils/htmlToMarkdown';

import {
  type ExtractWebpageLoader,
  fromQwkArticle,
  type QwkSearchExtractOptions,
  runQwkSearchExtractor,
  runQwkSearchHtmlExtractor,
} from './extractQwkSearch';

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
  via?: 'crawler' | 'qwksearch' | 'qwksearch-html' | 'scraper' | 'tavily';
  word_count?: number;
}

export const SCRAPER_DEADLINE_MS = 8000;

const SEARCH_ENGINE_PATTERNS = [
  /^https?:\/\/(www\.)?google\.[^/]+\/search/i,
  /^https?:\/\/(www\.)?bing\.com\/search/i,
  /^https?:\/\/(www\.)?duckduckgo\.com\/\?/i,
];

/**
 * Video hosts with no transcript path. YouTube is deliberately absent — it is
 * classified as `youtube` and extracted through `extract-youtube` instead.
 */
const VIDEO_PATTERNS = [/vimeo\.com\//i, /dailymotion\.com\/video/i, /twitch\.tv\//i];

/** Mirrors `getURLYoutubeVideo` in `extract-webpage`, without loading it. */
const YOUTUBE_PATTERN =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)[\w-]{11}/i;

/**
 * URLs `extract-pdf` should handle. arXiv `/abs/` pages are HTML, so only the
 * `/pdf/` form matches; the extractor also sniffs the `%PDF-` magic bytes at
 * runtime, which catches PDFs served from extensionless URLs.
 */
const PDF_PATTERNS = [/\.pdf($|[#?])/i, /arxiv\.org\/pdf\//i];

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

/**
 * Classify a URL before hitting the cache.
 *
 * `youtube` and `pdf` are extractable — they route to a different tier chain
 * (see {@link tiersForUrl}), not to the "no article here" response. Only
 * `invalid`, `search-engine` and the transcript-less `video` hosts are refused.
 */
export const classifyUrl = (url: string): UrlKind => {
  if (!url || /\s/.test(url)) return 'invalid';
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return 'invalid';
  } catch {
    return 'invalid';
  }
  if (SEARCH_ENGINE_PATTERNS.some((p) => p.test(url))) return 'search-engine';
  if (YOUTUBE_PATTERN.test(url)) return 'youtube';
  if (PDF_PATTERNS.some((p) => p.test(url))) return 'pdf';
  if (VIDEO_PATTERNS.some((p) => p.test(url))) return 'video';
  return 'article';
};

/** URL kinds the extraction chain can actually produce an article for. */
export const isExtractableKind = (kind: UrlKind): boolean =>
  kind === 'article' || kind === 'pdf' || kind === 'youtube';

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

/**
 * Run readability + markdown conversion over rendered HTML using LobeHub's
 * crawler utilities, producing the article shape the side panel expects.
 */
export const articleFromHtml = (
  html: string,
  url: string,
  via: ExtractedArticle['via'],
): ExtractedArticle => {
  const parsed = htmlToMarkdown(html, { filterOptions: { enableReadability: true }, url });
  if (!parsed.content || parsed.content.trim().length < 50) {
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

/**
 * Markdown body for HTML the QwkSearch extractor already reduced to the article.
 * Readability is off — running it a second time over extracted content drops
 * headings and lead paragraphs it no longer recognises as part of a page.
 */
export const contentFromExtractedHtml = (html: string, url: string): string | undefined => {
  try {
    const { content } = htmlToMarkdown(html, { filterOptions: { enableReadability: false }, url });
    return content?.trim() || undefined;
  } catch {
    // A malformed fragment is not worth failing the extraction over; the panel
    // renders `html`, and only the AI Q&A path reads `content`.
    return undefined;
  }
};

/** Fill in whatever the QwkSearch extractor did not resolve itself. */
const completeQwkArticle = (
  article: ExtractedArticle,
  url: string,
  html: string,
): ExtractedArticle => {
  article.content = contentFromExtractedHtml(html, article.url || url);
  article.source ||= hostnameOf(article.url || url);
  article.word_count ||= countWords(article.content || html);
  article.cite ||= buildCite(article, article.url || url);
  return article;
};

/**
 * Tier 0: QwkSearch's own extractor.
 *
 * One call covers three of the chain's jobs — article + citation extraction,
 * YouTube transcripts and PDF conversion — because `extract-webpage` branches
 * on the URL itself. See `extractQwkSearch.ts` for why it is loaded lazily.
 */
export const extractViaQwkSearch = async (
  url: string,
  options: QwkSearchExtractOptions = {},
): Promise<ExtractedArticle> => {
  let raw;
  try {
    raw = await runQwkSearchExtractor(url, options);
  } catch (error) {
    return { error: (error as Error)?.message || 'QwkSearch extractor failed' };
  }

  const article = fromQwkArticle(raw, url, 'qwksearch') as ExtractedArticle;
  if (article.error || !article.html) return article;
  // Tier 0 fetches without a browser, so a bot check comes back as a page. The
  // extractor keeps short pages verbatim rather than failing, which would let a
  // challenge interstitial pass as an article and skip the Puppeteer tier that
  // exists to get past it.
  if (looksLikeChallenge(article.html)) {
    return { error: 'QwkSearch extractor returned a challenge page' };
  }
  return completeQwkArticle(article, url, article.html);
};

/**
 * Turn already-rendered HTML into an article, preferring QwkSearch's citation
 * extraction and falling back to LobeHub readability when it yields nothing.
 *
 * This is what keeps the scraper tier from throwing away author/date metadata:
 * the Puppeteer worker gets past the bot check, `extract-webpage` reads the
 * byline off the rendered DOM.
 */
export const articleFromRenderedHtml = async (
  html: string,
  url: string,
  fallbackVia: ExtractedArticle['via'],
  loader?: ExtractWebpageLoader,
): Promise<ExtractedArticle> => {
  try {
    const raw = await runQwkSearchHtmlExtractor(html, url, { loader });
    const article = fromQwkArticle(raw, url, 'qwksearch-html') as ExtractedArticle;
    if (!article.error && article.html) return completeQwkArticle(article, url, article.html);
  } catch {
    // Fall through to LobeHub readability below.
  }
  return articleFromHtml(html, url, fallbackVia);
};

export interface ScraperConfig {
  apiKey?: string;
  baseUrl?: string;
  deadlineMs?: number;
  fetcher?: typeof fetch;
  /** Injected in tests; production uses the real `extract-webpage`. */
  loader?: ExtractWebpageLoader;
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

    return await articleFromRenderedHtml(html, data?.url || url, 'scraper', config.loader);
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

const isUsable = (article: ExtractedArticle) => !!article.html && !article.error;

export type ExtractionTier = (url: string) => Promise<ExtractedArticle>;

/**
 * The tier chain for a URL, by kind.
 *
 * YouTube and PDF get the QwkSearch extractor alone: the remaining tiers render
 * or fetch HTML, which for a video page is the description and chrome rather
 * than the transcript, and for a PDF is bytes readability cannot parse. Serving
 * that would be worse than reporting the extraction failure.
 */
export const tiersForUrl = (url: string, kind: UrlKind = classifyUrl(url)): ExtractionTier[] => {
  switch (kind) {
    case 'pdf':
    case 'youtube': {
      return [extractViaQwkSearch];
    }
    default: {
      return [extractViaQwkSearch, extractViaScraper, extractViaTavily, extractViaCrawler];
    }
  }
};

/**
 * Full fallback chain. Returns the first usable article, otherwise the last
 * tier's error.
 */
export const extractArticle = async (
  url: string,
  tiers: ExtractionTier[] = tiersForUrl(url),
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
