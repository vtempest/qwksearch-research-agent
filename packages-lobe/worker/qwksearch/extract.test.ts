// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  articleFromHtml,
  articleFromHtmlViaCrawler,
  buildCite,
  classifyUrl,
  countWords,
  defaultTiersFor,
  extractArticle,
  extractViaPdf,
  extractViaScraper,
  extractViaTavily,
  extractViaYouTube,
  looksLikeChallenge,
  markdownToSimpleHtml,
  pdfUrlFor,
  transcriptToParagraphs,
  youTubeVideoId,
} from './extract';

describe('classifyUrl', () => {
  it('rejects malformed urls and search result pages', () => {
    expect(classifyUrl('not a url')).toBe('invalid');
    expect(classifyUrl('ftp://example.com/x')).toBe('invalid');
    expect(classifyUrl('https://www.google.com/search?q=lobehub')).toBe('search-engine');
    expect(classifyUrl('https://duckduckgo.com/?q=x')).toBe('search-engine');
  });

  it('flags video hosts and accepts everything else', () => {
    expect(classifyUrl('https://vimeo.com/12345')).toBe('video');
    expect(classifyUrl('https://example.com/article')).toBe('article');
  });

  it('separates youtube and pdf from the generic article path', () => {
    expect(classifyUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(classifyUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(classifyUrl('https://example.com/paper.pdf?download=1')).toBe('pdf');
    expect(classifyUrl('https://arxiv.org/abs/2401.00001')).toBe('pdf');
  });
});

describe('youTubeVideoId', () => {
  it('reads the id from every url shape youtube serves', () => {
    expect(youTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3')).toBe('dQw4w9WgXcQ');
    expect(youTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
  });
});

describe('pdfUrlFor', () => {
  it('resolves arxiv abstracts to the paper and ignores non-pdf urls', () => {
    expect(pdfUrlFor('https://arxiv.org/abs/2401.00001')).toBe('https://arxiv.org/pdf/2401.00001');
    expect(pdfUrlFor('https://arxiv.org/pdf/2401.00001')).toBe('https://arxiv.org/pdf/2401.00001');
    expect(pdfUrlFor('https://example.com/a/b.pdf?x=1#p2')).toBe(
      'https://example.com/a/b.pdf?x=1#p2',
    );
    expect(pdfUrlFor('https://example.com/pdf-viewer')).toBeUndefined();
    expect(pdfUrlFor('not a url')).toBeUndefined();
  });
});

describe('looksLikeChallenge', () => {
  it('detects bot-check interstitials', () => {
    expect(looksLikeChallenge('<title>Just a moment...</title>')).toBe(true);
    expect(looksLikeChallenge('<h1>Real article</h1>')).toBe(false);
    expect(looksLikeChallenge('')).toBe(true);
  });
});

describe('markdownToSimpleHtml', () => {
  it('turns headings, paragraphs and links into html', () => {
    const html = markdownToSimpleHtml('# Title\n\nHello [x](https://x.com) & <b>');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<a href="https://x.com" target="_blank">x</a>');
    expect(html).toContain('&amp; &lt;b&gt;');
  });
});

describe('buildCite / countWords', () => {
  it('builds an APA-ish citation with a year when the date is valid', () => {
    const cite = buildCite(
      { date: '2024-03-05', source: 'example.com', title: 'T' },
      'https://example.com/a',
    );
    expect(cite).toContain('(2024, Mar 5)');
    expect(cite).toContain('<b>T</b>');
  });

  it('counts words ignoring tags', () => {
    expect(countWords('<p>one two</p> three')).toBe(3);
    expect(countWords(undefined)).toBe(0);
  });
});

const articleHtml = (body: string, head = '') =>
  `<html><head><title>My Post</title>${head}</head><body><article><h1>My Post</h1><p>${body}</p></article></body></html>`;

const longBody = Array.from(
  { length: 40 },
  (_, i) => `Sentence number ${i} of the article body.`,
).join(' ');

describe('articleFromHtmlViaCrawler', () => {
  it('extracts readable content with the LobeHub crawler utilities', () => {
    const article = articleFromHtmlViaCrawler(
      articleHtml(longBody),
      'https://news.example.com/post',
      'scraper',
    );

    expect(article.error).toBeUndefined();
    expect(article.content).toContain('Sentence number 3');
    expect(article.html).toContain('<p>');
    expect(article.source).toBe('news.example.com');
    expect(article.via).toBe('scraper');
    expect(article.word_count).toBeGreaterThan(100);
  });

  it('reports an error for empty pages', () => {
    expect(
      articleFromHtmlViaCrawler('<html><body></body></html>', 'https://x.com', 'scraper').error,
    ).toBeDefined();
  });
});

describe('articleFromHtml', () => {
  it('prefers the qwksearch extractor and keeps its citation metadata', async () => {
    const extractCite = vi.fn(() => ({
      author: 'Jane Q. Doe',
      author_cite: 'Doe, J. Q.',
      author_short: 'Doe',
      author_type: 1,
      date: '2024-03-05',
      html: `<h1>My Post</h1><p>${longBody}</p>`,
      source: 'Example News',
      title: 'My Post',
    }));

    const article = await articleFromHtml(
      articleHtml(longBody),
      'https://news.example.com/post',
      'scraper',
      { extractCite },
    );

    expect(extractCite).toHaveBeenCalledWith(expect.any(String), {
      url: 'https://news.example.com/post',
    });
    expect(article.author_cite).toBe('Doe, J. Q.');
    expect(article.author_short).toBe('Doe');
    // Coerced to a string so the D1 `author_type` column stays text.
    expect(article.author_type).toBe('1');
    expect(article.source).toBe('Example News');
    expect(article.cite).toContain('(2024, Mar 5)');
    expect(article.content).toContain('Sentence number 3');
    expect(article.via).toBe('scraper');
  });

  it('falls back to the crawler when the qwksearch extractor finds nothing', async () => {
    const article = await articleFromHtml(
      articleHtml(longBody),
      'https://news.example.com/post',
      'scraper',
      { extractCite: () => ({ error: 'No HTML found' }) },
    );

    expect(article.error).toBeUndefined();
    expect(article.source).toBe('news.example.com');
    expect(article.content).toContain('Sentence number 3');
  });

  it('falls back to the crawler when the qwksearch extractor throws', async () => {
    const article = await articleFromHtml(
      articleHtml(longBody),
      'https://news.example.com/post',
      'crawler',
      {
        extractCite: () => {
          throw new Error('linkedom blew up');
        },
      },
    );

    expect(article.error).toBeUndefined();
    expect(article.via).toBe('crawler');
  });

  it('falls back when the extractor returns html with no readable text', async () => {
    const article = await articleFromHtml(
      articleHtml(longBody),
      'https://news.example.com/post',
      'scraper',
      {
        extractCite: () => ({ html: '<div></div>', title: 'My Post' }),
      },
    );

    expect(article.error).toBeUndefined();
    expect(article.content).toContain('Sentence number 3');
  });

  it('reports an error when neither path finds content', async () => {
    const article = await articleFromHtml(
      '<html><body></body></html>',
      'https://x.com',
      'scraper',
      {
        extractCite: null,
      },
    );
    expect(article.error).toBeDefined();
  });

  it('runs the real extract-webpage extractor when none is injected', async () => {
    const article = await articleFromHtml(
      articleHtml(
        longBody,
        '<meta name="author" content="Jane Q. Doe"/><meta property="og:site_name" content="Example News"/>',
      ),
      'https://news.example.com/post',
      'scraper',
    );

    expect(article.error).toBeUndefined();
    expect(article.title).toBe('My Post');
    expect(article.author).toBe('Jane Q. Doe');
    expect(article.source).toBe('Example News');
  }, 30_000);
});

describe('transcriptToParagraphs', () => {
  it('regroups caption snippets into paragraphs', () => {
    const snippets = Array.from({ length: 30 }, (_, i) => ({ text: `word${i} word${i}b` }));
    const paragraphs = transcriptToParagraphs(snippets, 10);

    expect(paragraphs).toHaveLength(6);
    expect(paragraphs[0].split(' ')).toHaveLength(10);
    expect(paragraphs.join(' ')).toContain('word29b');
  });

  it('returns nothing for empty captions', () => {
    expect(transcriptToParagraphs([{ text: '   ' }])).toEqual([]);
    expect(transcriptToParagraphs([])).toEqual([]);
  });
});

describe('extractViaYouTube', () => {
  const snippets = Array.from({ length: 60 }, (_, i) => ({ text: `transcript line ${i}` }));

  it('turns a transcript into an article with oEmbed metadata', async () => {
    const transcript = vi.fn(async () => ({ snippets }));
    const fetcher = vi.fn(async () =>
      Response.json({ author_name: 'Rick Astley', title: 'Never Gonna Give You Up' }),
    );

    const article = await extractViaYouTube('https://youtu.be/dQw4w9WgXcQ', {
      fetcher,
      transcript,
    });

    expect(transcript).toHaveBeenCalledWith('dQw4w9WgXcQ', ['en']);
    expect(article.error).toBeUndefined();
    expect(article.via).toBe('youtube');
    expect(article.title).toBe('Never Gonna Give You Up');
    expect(article.author_cite).toBe('Rick Astley');
    expect(article.source).toBe('YouTube');
    expect(article.html).toContain('transcript line 59');
    expect(article.content).toContain('transcript line 0');
  });

  it('names the video by id when oEmbed is unavailable', async () => {
    const article = await extractViaYouTube('https://youtu.be/dQw4w9WgXcQ', {
      fetcher: vi.fn(async () => new Response('nope', { status: 404 })),
      languages: ['de', 'en'],
      transcript: vi.fn(async () => ({ snippets })),
    });

    expect(article.title).toBe('YouTube video dQw4w9WgXcQ');
  });

  it('passes the configured languages through', async () => {
    const transcript = vi.fn(async () => ({ snippets }));
    await extractViaYouTube('https://youtu.be/dQw4w9WgXcQ', {
      fetcher: vi.fn(async () => Response.json({})),
      languages: ['de', 'en'],
      transcript,
    });
    expect(transcript).toHaveBeenCalledWith('dQw4w9WgXcQ', ['de', 'en']);
  });

  it('returns an error rather than throwing for videos without captions', async () => {
    const noCaptions = await extractViaYouTube('https://youtu.be/dQw4w9WgXcQ', {
      transcript: async () => ({ snippets: [] }),
    });
    expect(noCaptions.error).toMatch(/No transcript/);

    const threw = await extractViaYouTube('https://youtu.be/dQw4w9WgXcQ', {
      transcript: async () => {
        throw new Error('TranscriptsDisabled');
      },
    });
    expect(threw.error).toBe('TranscriptsDisabled');
  });

  it('rejects non-youtube urls without touching the network', async () => {
    const transcript = vi.fn();
    expect((await extractViaYouTube('https://example.com/a', { transcript })).error).toMatch(
      /Not a YouTube/,
    );
    expect(transcript).not.toHaveBeenCalled();
  });
});

describe('extractViaPdf', () => {
  const pdfHtml = `<h1>A Paper</h1><p>${longBody}</p>`;

  it('extracts a pdf and rewrites arxiv abstracts to the paper', async () => {
    const convert = vi.fn(async () => ({
      author: 'A. Researcher',
      html: pdfHtml,
      title: 'A Paper',
    }));
    const article = await extractViaPdf('https://arxiv.org/abs/2401.00001', { convert });

    expect(convert).toHaveBeenCalledWith('https://arxiv.org/pdf/2401.00001', {
      addCitation: false,
    });
    expect(article.via).toBe('pdf');
    expect(article.title).toBe('A Paper');
    expect(article.author_cite).toBe('A. Researcher');
    expect(article.source).toBe('arxiv.org');
    expect(article.content).toContain('Sentence number 3');
  });

  it('asks for hybrid OCR when a docling processor is configured', async () => {
    const convert = vi.fn(async () => ({ html: pdfHtml }));
    await extractViaPdf('https://example.com/a.pdf', {
      convert,
      processorUrl: 'https://docling.test',
    });

    expect(convert).toHaveBeenCalledWith('https://example.com/a.pdf', {
      addCitation: false,
      processor: 'hybrid',
      processorUrl: 'https://docling.test',
    });
  });

  it('returns an error rather than throwing', async () => {
    expect((await extractViaPdf('https://example.com/a', { convert: vi.fn() })).error).toMatch(
      /Not a PDF/,
    );
    expect(
      (
        await extractViaPdf('https://example.com/a.pdf', {
          convert: async () => ({ error: 'bad pdf' }),
        })
      ).error,
    ).toBe('bad pdf');
    expect(
      (
        await extractViaPdf('https://example.com/a.pdf', {
          convert: async () => {
            throw new Error('pdfjs failed');
          },
        })
      ).error,
    ).toBe('pdfjs failed');
  });
});

describe('defaultTiersFor', () => {
  it('leads with the extractor built for the url kind', () => {
    expect(defaultTiersFor('https://youtu.be/dQw4w9WgXcQ')[0]).toBe(extractViaYouTube);
    expect(defaultTiersFor('https://arxiv.org/abs/2401.00001')).toEqual([
      extractViaPdf,
      extractViaTavily,
    ]);
    expect(defaultTiersFor('https://example.com/a')[0]).toBe(extractViaScraper);
  });

  it('keeps the web chain as a floor for videos whose captions are disabled', () => {
    expect(defaultTiersFor('https://youtu.be/dQw4w9WgXcQ')).toContain(extractViaScraper);
  });
});

describe('extractViaScraper', () => {
  it('returns an error instead of throwing when the scraper serves a challenge page', async () => {
    const fetcher = vi.fn(async () => Response.json({ html: 'Verifying you are human' }));
    const result = await extractViaScraper('https://x.com/a', {
      baseUrl: 'https://scraper.test',
      fetcher,
    });
    expect(result.error).toMatch(/challenge/);
    expect(new URL((fetcher.mock.calls[0] as unknown[])[0] as URL).pathname).toBe('/api/render');
  });

  it('honours the deadline', async () => {
    const fetcher = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );
    const result = await extractViaScraper('https://x.com/a', { deadlineMs: 20, fetcher });
    expect(result.error).toMatch(/deadline/);
  });
});

describe('extractViaTavily', () => {
  it('requires an api key', async () => {
    expect((await extractViaTavily('https://x.com', undefined, vi.fn())).error).toMatch(/Tavily/);
  });

  it('maps raw_content into an article', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        results: [{ raw_content: '# Hi\n\nBody text here', title: 'Hi', url: 'https://x.com/a' }],
      }),
    );
    const article = await extractViaTavily('https://x.com/a', 'key', fetcher);
    expect(article.via).toBe('tavily');
    expect(article.title).toBe('Hi');
    expect(article.html).toContain('<h1>Hi</h1>');
  });
});

describe('extractArticle', () => {
  it('walks the tiers until one yields usable html', async () => {
    const tier1 = vi.fn(async () => ({ error: 'nope' }));
    const tier2 = vi.fn(async () => {
      throw new Error('boom');
    });
    const tier3 = vi.fn(async () => ({ html: '<p>ok</p>', title: 'ok' }));

    const result = await extractArticle('https://x.com', [tier1, tier2, tier3]);
    expect(result.title).toBe('ok');
    expect(tier1).toHaveBeenCalledTimes(1);
    expect(tier2).toHaveBeenCalledTimes(1);
  });

  it('returns the last error when every tier fails', async () => {
    const result = await extractArticle('https://x.com', [
      async () => ({ error: 'a' }),
      async () => ({ error: 'b' }),
    ]);
    expect(result).toEqual({ error: 'b' });
  });
});
