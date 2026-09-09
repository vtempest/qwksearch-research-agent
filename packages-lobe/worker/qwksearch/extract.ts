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
import {
  type CitationStyle,
  DEFAULT_TIER_ORDER,
  type ExtractionSettings,
  resolveExtractionSettings,
  type TierId,
} from './extractSettings';

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
/** Shortest plain-text body an extractor may return before it counts as empty. */
export const MIN_CONTENT_CHARS = 50;

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

/**
 * A publication date we are willing to print.
 *
 * Anything at or before 1971 is treated as absent: unparsed dates and missing
 * timestamps land on the Unix epoch, and a citation that claims an article was
 * published in 1970 is worse than one with no date at all.
 */
const citableDate = (article: ExtractedArticle): Date | undefined => {
  const parsed = article.date ? new Date(article.date) : undefined;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.getFullYear() <= 1971) return undefined;
  return parsed;
};

const citeLink = (url: string) => `<a href="${url}" target="_blank">${url}</a>`;

/** Terminal punctuation MLA and Chicago treat as already closing a segment. */
const ENDS_SENTENCE = /[!.?]$/;

/**
 * `Lovelace, A.` → `Lovelace, A. ` — one period, not two.
 *
 * `author_cite` arrives as `Last, F.` from the extractor's name database, so
 * appending the style's own period unconditionally doubles it.
 */
const citeSegment = (value?: string): string =>
  value ? `${ENDS_SENTENCE.test(value) ? value : `${value}.`} ` : '';

/** MLA/Chicago title: quoted, with the period inside unless it ends in ? or !. */
const citeTitle = (title?: string): string =>
  title ? `"<b>${title}</b>${ENDS_SENTENCE.test(title) ? '' : '.'}" ` : '';

const buildApaCite = (article: ExtractedArticle, url: string, date?: Date): string => {
  const source = article.source || '';
  const apaDate = date
    ? ` (${date.getFullYear()}, ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`
    : '';
  return `${article.author_cite || source || ' '}${apaDate}. <b>${article.title || ''}</b>. <i>${source}</i>. ${citeLink(url)}`;
};

/** `Lovelace, A. "Title." Source, 5 Mar. 2024, url.` */
const buildMlaCite = (article: ExtractedArticle, url: string, date?: Date): string => {
  const head = citeSegment(article.author_cite);
  const title = citeTitle(article.title);
  const day = date
    ? `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}. ${date.getFullYear()}`
    : '';
  const tail = [article.source ? `<i>${article.source}</i>` : '', day, citeLink(url)]
    .filter(Boolean)
    .join(', ');
  return `${head}${title}${tail}.`;
};

/** `Lovelace, A. "Title." Source, March 5, 2024. url.` */
const buildChicagoCite = (article: ExtractedArticle, url: string, date?: Date): string => {
  const head = citeSegment(article.author_cite);
  const title = citeTitle(article.title);
  const day = date
    ? date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const mid = [article.source ? `<i>${article.source}</i>` : '', day].filter(Boolean).join(', ');
  return `${head}${title}${mid}${mid ? '. ' : ''}${citeLink(url)}.`;
};

/**
 * Citation string for an article, in the configured style.
 *
 * APA is the default and keeps the exact shape the extractor's own URL branch
 * produces, so an APA deployment sees no change from before styles existed.
 */
export const buildCite = (
  article: ExtractedArticle,
  url: string,
  style: CitationStyle = 'apa',
): string => {
  const date = citableDate(article);
  switch (style) {
    case 'chicago': {
      return buildChicagoCite(article, url, date);
    }
    case 'mla': {
      return buildMlaCite(article, url, date);
    }
    default: {
      return buildApaCite(article, url, date);
    }
  }
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
  citationStyle: CitationStyle = 'apa',
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
  article.cite = buildCite(article, url, citationStyle);
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
  citationStyle: CitationStyle = 'apa',
): ExtractedArticle => {
  article.content = contentFromExtractedHtml(html, article.url || url);
  article.source ||= hostnameOf(article.url || url);
  article.word_count ||= countWords(article.content || html);
  // The extractor builds its own citation, and it is APA — so it is kept as-is
  // when APA is what was asked for, and rebuilt from the extracted fields when
  // it is not. Rebuilding unconditionally would throw away the name-database
  // formatting APA users are getting today.
  if (!article.cite || citationStyle !== 'apa') {
    article.cite = buildCite(article, article.url || url, citationStyle);
  }
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
  options: QwkSearchExtractOptions & { citationStyle?: CitationStyle } = {},
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
  return completeQwkArticle(article, url, article.html, options.citationStyle);
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
  citationStyle: CitationStyle = 'apa',
): Promise<ExtractedArticle> => {
  try {
    const raw = await runQwkSearchHtmlExtractor(html, url, { loader });
    const article = fromQwkArticle(raw, url, 'qwksearch-html') as ExtractedArticle;
    if (!article.error && article.html) {
      return completeQwkArticle(article, url, article.html, citationStyle);
    }
  } catch {
    // Fall through to LobeHub readability below.
  }
  return articleFromHtmlViaCrawler(html, url, fallbackVia, citationStyle);
};

export interface ScraperConfig {
  apiKey?: string;
  baseUrl?: string;
  citationStyle?: CitationStyle;
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

    return await articleFromRenderedHtml(
      html,
      data?.url || url,
      'scraper',
      config.loader,
      config.citationStyle,
    );
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
  citationStyle: CitationStyle = 'apa',
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
  article.cite = buildCite(article, url, citationStyle);
  return article;
};

/**
 * Tier 3: LobeHub's own crawler (plain fetch + readability), no external service.
 */
export const extractViaCrawler = async (
  url: string,
  citationStyle: CitationStyle = 'apa',
): Promise<ExtractedArticle> => {
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
    article.cite = buildCite(article, url, citationStyle);
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

/**
 * One step of the chain. Carries the id it was built from so a caller — or a
 * test — can see *which* tiers a URL got without invoking them.
 */
export interface ExtractionTier {
  (url: string): Promise<ExtractedArticle>;
  tierId?: TierId;
}

/** The web-page chain: rendered HTML first, then remote extraction services. */
export const WEB_TIERS: ExtractionTier[] = [extractViaScraper, extractViaTavily, extractViaCrawler];

/**
 * The chain for a URL, chosen by {@link classifyUrl}. Media kinds lead with the
 * extractor built for them and keep a web fallback so a missing transcript or
 * an unreadable PDF still yields whatever the page itself carries.
 *
 * NOT WIRED UP. `extractArticle` runs {@link tiersForUrl} instead, which is the
 * chain this Worker has always served and the one the integrations reference
 * documents. This function and the `extractViaYouTube` / `extractViaPdf` tiers
 * it names arrived together and have never been on the request path; switching
 * to them changes what every article extraction actually does, which is a call
 * for a human rather than a merge resolution. See the note on this in the
 * migration to-do § 1.3.
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

/** The options `extract-webpage` needs, projected out of the settings. */
export const toQwkSearchExtractOptions = (
  settings: ExtractionSettings,
): QwkSearchExtractOptions & { citationStyle: CitationStyle } => ({
  citationStyle: settings.citationStyle,
  languages: settings.languages,
  pdfProcessor: settings.pdfProcessor,
  pdfProcessorUrl: settings.pdfProcessorUrl,
  proxy: settings.proxy ?? null,
  timeoutSeconds: settings.timeoutSeconds,
  useThirdPartyBackup: settings.useThirdPartyBackup,
});

/** The Puppeteer render tier's config, projected out of the settings. */
export const toScraperConfig = (settings: ExtractionSettings): ScraperConfig => ({
  apiKey: settings.scraperApiKey,
  baseUrl: settings.scraperUrl,
  citationStyle: settings.citationStyle,
  deadlineMs: settings.scraperDeadlineMs,
});

const tagTier = (tierId: TierId, run: (url: string) => Promise<ExtractedArticle>): ExtractionTier =>
  Object.assign(run, { tierId });

/**
 * The tier chain for a URL, by kind, bound to the resolved settings.
 *
 * YouTube and PDF get the QwkSearch extractor alone: the remaining tiers render
 * or fetch HTML, which for a video page is the description and chrome rather
 * than the transcript, and for a PDF is bytes readability cannot parse. Serving
 * that would be worse than reporting the extraction failure.
 *
 * `settings.tiers` then filters what is left. It can legitimately empty the
 * chain — `QWKSEARCH_EXTRACT_TIERS=scraper` leaves a PDF URL with nothing to run
 * — and when it does the caller gets the "no tier configured" error rather than
 * a tier the operator switched off.
 */
export const tiersForUrl = (
  url: string,
  kind: UrlKind = classifyUrl(url),
  settings: ExtractionSettings = resolveExtractionSettings(),
): ExtractionTier[] => {
  const build: Record<TierId, () => ExtractionTier> = {
    crawler: () => tagTier('crawler', (u) => extractViaCrawler(u, settings.citationStyle)),
    qwksearch: () =>
      tagTier('qwksearch', (u) => extractViaQwkSearch(u, toQwkSearchExtractOptions(settings))),
    scraper: () => tagTier('scraper', (u) => extractViaScraper(u, toScraperConfig(settings))),
    tavily: () =>
      tagTier('tavily', (u) =>
        extractViaTavily(u, settings.tavilyApiKey, undefined, settings.citationStyle),
      ),
  };

  const candidates: TierId[] =
    kind === 'pdf' || kind === 'youtube' ? ['qwksearch'] : DEFAULT_TIER_ORDER;

  return candidates.filter((id) => settings.tiers.includes(id)).map((id) => build[id]());
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
