// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A cached row and the drizzle chain the GET handler walks over it.
 *
 * The handler makes two selects, and they are told apart by their argument: the
 * article select takes no field list and ends in `.limit(1)`, the Q&A history
 * select passes one and is awaited directly.
 */
let cachedRow: Record<string, unknown> | undefined;

const db = {
  insert: () => ({ values: async () => undefined }),
  select: (fields?: unknown) => ({
    from: () => ({
      where: () =>
        fields ? Promise.resolve([]) : { limit: async () => (cachedRow ? [cachedRow] : []) },
    }),
  }),
  update: () => ({ set: () => ({ where: async () => undefined }) }),
};

vi.mock('../../qwksearch/db', () => ({ getQwkDB: () => db }));

const { articleApp, restyleCite } = await import('./article');

const get = (query: string) => articleApp.request(`/api/doc/article?${query}`);

const row = {
  author: 'Ada Lovelace',
  author_cite: 'Lovelace, A.',
  author_short: 'Lovelace',
  author_type: 'single',
  cite: 'Lovelace, A. (1990, Oct 1). <b>Notes</b>. <i>example.com</i>.',
  date: '1990-10-01',
  followUpQuestions: [],
  html: '<p>body</p>',
  source: 'example.com',
  title: 'Notes',
  url: 'https://example.com/notes',
  word_count: 2,
};

beforeEach(() => {
  cachedRow = { ...row };
});

describe('restyleCite', () => {
  it('keeps the stored citation for APA', () => {
    expect(restyleCite({ ...row, url: row.url }, 'apa').cite).toBe(row.cite);
  });

  it('rebuilds the citation from the cached columns for another style', () => {
    const cite = restyleCite({ ...row, url: row.url }, 'mla').cite;
    expect(cite).toContain('Lovelace, A. "<b>Notes</b>."');
    expect(cite).toContain('1 Oct. 1990');
  });
});

describe('GET /api/doc/article', () => {
  it('serves the cached article with its stored citation by default', async () => {
    const body = (await (await get('url=https://example.com/notes')).json()) as {
      article: { cite: string };
      cached: boolean;
    };
    expect(body.cached).toBe(true);
    expect(body.article.cite).toBe(row.cite);
  });

  it('honours ?cite= on a cache hit rather than fragmenting the cache', async () => {
    const body = (await (await get('url=https://example.com/notes&cite=chicago')).json()) as {
      article: { cite: string };
    };
    expect(body.article.cite).toContain('October 1, 1990');
  });

  it('ignores an unrecognised ?cite= instead of failing the request', async () => {
    const res = await get('url=https://example.com/notes&cite=harvard');
    const body = (await res.json()) as { article: { cite: string } };
    expect(res.status).toBe(200);
    expect(body.article.cite).toBe(row.cite);
  });

  it('still refuses a url the chain cannot extract', async () => {
    expect((await get('url=https://www.google.com/search?q=x')).status).toBe(400);
  });

  it('requires a url', async () => {
    expect((await articleApp.request('/api/doc/article')).status).toBe(400);
  });
});
