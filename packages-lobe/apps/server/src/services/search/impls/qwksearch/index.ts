/**
 * QwkSearch implementation of the LobeHub search service.
 *
 * Phase 1.2 of the LobeHub packages migration plan: the engine's web-browsing
 * tool searches through QwkSearch's own fan-out (`search-web-api`, 100+ engines
 * across 13 categories, ranked by `domain-rank`) instead of a single upstream
 * provider.
 *
 * The fan-out lives on Worker A (`apps/qwksearch-web`) at
 * `GET /api/agent/search`, so this impl is a thin HTTP client. Configure it with:
 *
 *   SEARCH_PROVIDERS=qwksearch
 *   QWKSEARCH_SEARCH_URL=https://qwksearch.com/api/agent/search   # optional
 *
 * The endpoint takes one category per request, so multiple `searchCategories`
 * fan out in parallel and merge here, deduplicated by URL.
 */
import {
  type SearchParams,
  type UniformSearchResponse,
  type UniformSearchResult,
} from '@lobechat/types';
import { TRPCError } from '@trpc/server';
import debug from 'debug';

import { type SearchServiceImpl } from '../type';
import { type QwkSearchResponse, type QwkSearchResult } from './type';

const log = debug('lobe-search:QwkSearch');

const DEFAULT_ENDPOINT = 'https://qwksearch.com/api/agent/search';

/** SearXNG category names the fan-out endpoint understands. */
const SUPPORTED_CATEGORIES = new Set([
  'files',
  'general',
  'images',
  'it',
  'map',
  'music',
  'news',
  'science',
  'social+media',
  'videos',
]);

/**
 * QwkSearch's category registry (`search-web-api/registry`) names a few
 * categories differently from SearXNG, and LobeHub's tool manifest offers a
 * fifth set again. Normalize every spelling we might receive onto what the
 * endpoint accepts; anything unknown falls back to `general` rather than
 * returning an empty page.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  'academic': 'science',
  'apps': 'files',
  'code': 'it',
  'file': 'files',
  'general': 'general',
  'image': 'images',
  'images': 'images',
  'it': 'it',
  'map': 'map',
  'maps': 'map',
  'music': 'music',
  'news': 'news',
  'science': 'science',
  'shopping': 'general',
  'social': 'social+media',
  'social media': 'social+media',
  'social+media': 'social+media',
  'specialized': 'general',
  'tech': 'it',
  'torrents': 'files',
  'video': 'videos',
  'videos': 'videos',
};

const TIME_RANGES = new Set(['day', 'week', 'month', 'year']);

/** Max categories fanned out per query, to bound the request budget. */
const MAX_CATEGORIES = 3;

export const normalizeCategories = (categories?: string[]): string[] => {
  if (!categories?.length) return ['general'];

  const normalized = categories
    .map((category) => category?.trim().toLowerCase())
    .filter(Boolean)
    .map((category) => CATEGORY_ALIASES[category] ?? category)
    .filter((category) => SUPPORTED_CATEGORIES.has(category));

  const unique = [...new Set(normalized)];

  return unique.length > 0 ? unique.slice(0, MAX_CATEGORIES) : ['general'];
};

const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

const toUniformResult = (item: QwkSearchResult, category: string): UniformSearchResult => ({
  category: item.category || category,
  content: item.content || item.snippet || '',
  engines: item.engines?.length ? item.engines : item.source ? [item.source] : ['qwksearch'],
  iframeSrc: item.iframe_src || undefined,
  imgSrc: item.img_src || undefined,
  parsedUrl: item.domain || hostnameOf(item.url),
  publishedDate: item.date || undefined,
  score: typeof item.score === 'number' ? item.score : 0,
  thumbnail: item.thumbnail || item.thumbnail_src || undefined,
  title: item.title,
  url: item.url,
});

/**
 * Merge per-category result lists, keeping the highest-scoring copy of each URL
 * and unioning the engines that produced it.
 */
export const mergeResults = (lists: UniformSearchResult[][]): UniformSearchResult[] => {
  const byUrl = new Map<string, UniformSearchResult>();

  for (const list of lists) {
    for (const result of list) {
      if (!result.url) continue;

      const existing = byUrl.get(result.url);
      if (!existing) {
        byUrl.set(result.url, { ...result, engines: [...result.engines] });
        continue;
      }

      existing.engines = [...new Set([...existing.engines, ...result.engines])];
      if (result.score > existing.score) {
        existing.score = result.score;
      }
      // Prefer whichever copy actually carries a snippet.
      if (!existing.content && result.content) {
        existing.content = result.content;
      }
    }
  }

  return [...byUrl.values()].sort((a, b) => b.score - a.score);
};

export class QwkSearchImpl implements SearchServiceImpl {
  /**
   * QwkSearch picks engines per category from its own registry, so explicit
   * engine restrictions are never forwarded and must not trigger a retry.
   */
  readonly useAutoSearchEngineSelection = true;

  private get endpoint(): string {
    return process.env.QWKSEARCH_SEARCH_URL || DEFAULT_ENDPOINT;
  }

  private get apiKey(): string | undefined {
    return process.env.QWKSEARCH_API_KEY;
  }

  private buildUrl(query: string, category: string, params: SearchParams): URL {
    const url = new URL(this.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('cat', category);

    const timeRange = params.searchTimeRange;
    if (timeRange && TIME_RANGES.has(timeRange)) {
      url.searchParams.set('recency', timeRange);
    }

    return url;
  }

  private async queryCategory(
    query: string,
    category: string,
    params: SearchParams,
  ): Promise<UniformSearchResult[]> {
    const url = this.buildUrl(query, category, params);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `QwkSearch search failed for category "${category}" (${response.status}): ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json().catch(() => null)) as QwkSearchResponse | null;

    if (data?.error) {
      throw new Error(`QwkSearch search failed for category "${category}": ${data.error}`);
    }

    return (data?.results ?? [])
      .filter((item) => !!item?.url && !!item?.title)
      .map((item) => toUniformResult(item, category));
  }

  async query(query: string, params: SearchParams = {}): Promise<UniformSearchResponse> {
    const categories = normalizeCategories(params.searchCategories);
    log('querying %o across categories %o', query, categories);

    const startAt = Date.now();

    let lists: UniformSearchResult[][];
    try {
      lists = await Promise.all(
        categories.map((category) => this.queryCategory(query, category, params)),
      );
    } catch (error) {
      console.error('[QwkSearchImpl] query failed', error);

      throw new TRPCError({
        code: 'SERVICE_UNAVAILABLE',
        message: (error as Error).message || 'QwkSearch search failed',
      });
    }

    const results = mergeResults(lists);
    log('got %d results in %dms', results.length, Date.now() - startAt);

    return {
      costTime: Date.now() - startAt,
      query,
      resultNumbers: results.length,
      results,
    };
  }
}
