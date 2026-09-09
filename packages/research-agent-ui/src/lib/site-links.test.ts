import { describe, expect, it } from 'vitest';

import { siteLinksForPath } from './site-links';

const LINKS = [
  { url: '/docs', text: 'Docs' },
  { url: '/features', text: 'Features' },
  { url: '/#downloads', text: 'Downloads' },
  { url: 'https://discord.gg/SJdBqBz3tV', text: 'Support' },
  { url: '/legal/privacy', text: 'Privacy' },
];

const texts = (pathname: string | null) =>
  siteLinksForPath(LINKS, pathname).map((link) => link.text);

describe('siteLinksForPath', () => {
  it('keeps every link on a route none of them point at', () => {
    expect(texts('/')).toEqual(['Docs', 'Features', 'Downloads', 'Support', 'Privacy']);
  });

  it('drops the docs link while the reader is in the docs', () => {
    expect(texts('/docs')).not.toContain('Docs');
    expect(texts('/docs/guides/search')).not.toContain('Docs');
    expect(texts('/docs/')).not.toContain('Docs');
  });

  it('keeps the docs link on a route that merely starts with the same text', () => {
    expect(texts('/docsearch')).toContain('Docs');
  });

  it('keeps hash links, which are actions rather than destinations', () => {
    expect(texts('/')).toContain('Downloads');
  });

  it('keeps external links, which always lead away from the app', () => {
    expect(texts('/')).toContain('Support');
  });

  it('drops only the nested route that is current', () => {
    expect(texts('/legal/privacy')).toEqual(['Docs', 'Features', 'Downloads', 'Support']);
    expect(texts('/legal')).toContain('Privacy');
  });

  it('returns every link when the route is unknown', () => {
    expect(texts(null)).toHaveLength(LINKS.length);
  });
});
