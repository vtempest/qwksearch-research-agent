/**
 * Integrity checks for the help site. These catch the failure modes that only
 * show up when the docs are rendered — a page that won't compile, a sidebar
 * entry pointing at a file nobody wrote, a link left behind by a rename — none
 * of which typechecking sees.
 */
import fs from 'node:fs';
import path from 'node:path';

import { icons } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { docsCompiler } from '../src/compiler';
import { docsConfig } from '../src/config';
import {
  getLLMFullText,
  getMarkdownParams,
  getMarkdownUrl,
  parseMarkdownSlug,
} from '../src/llms';
import { searchServer } from '../src/search';
import { contentDir, source } from '../src/source';

const pages = source.getPages();

describe('content', () => {
  it('finds every page under content/docs', () => {
    const onDisk = fs
      .readdirSync(contentDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name)).length;

    expect(pages.length).toBe(onDisk);
  });

  it.each(pages.map((page) => [page.url, page] as const))(
    'compiles %s',
    async (_url, page) => {
      const compiled = await docsCompiler.compile({
        source: page.data.content,
        filePath: page.path,
      });

      expect(compiled.body).toBeTypeOf('function');
    },
  );

  it('gives every page a title and description', () => {
    for (const page of pages) {
      expect(page.data.title, page.url).toBeTruthy();
      expect(page.data.description, page.url).toBeTruthy();
    }
  });

  it('only uses icon names lucide-react actually exports', () => {
    // An unknown name is not an error — fumadocs logs a warning and renders
    // nothing — so nothing but this test would catch a typo.
    for (const page of pages) {
      const icon = (page.data as { icon?: string }).icon;
      if (icon) expect(Object.keys(icons), page.url).toContain(icon);
    }
  });
});

describe('sidebar', () => {
  it('references only files that exist', () => {
    const metaFiles = fs
      .readdirSync(contentDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name === 'meta.json');

    for (const entry of metaFiles) {
      const dir = entry.parentPath ?? contentDir;
      const meta = JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf-8'));

      for (const item of meta.pages ?? []) {
        // `---Section---` entries are separators, not files.
        if (item.startsWith('---')) continue;

        const exists =
          fs.existsSync(path.join(dir, `${item}.mdx`)) ||
          fs.existsSync(path.join(dir, `${item}.md`)) ||
          fs.existsSync(path.join(dir, item));

        expect(exists, `${dir}/meta.json references "${item}"`).toBe(true);
      }
    }
  });

  it('lists every top-level page', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(contentDir, 'meta.json'), 'utf-8'));
    const listed = new Set<string>(meta.pages);

    const topLevel = fs
      .readdirSync(contentDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
      .map((entry) => entry.name.replace(/\.mdx?$/, ''));

    for (const name of topLevel) expect(listed, `meta.json is missing "${name}"`).toContain(name);
  });
});

describe('links', () => {
  const urls = new Set(pages.map((page) => page.url));

  it('resolves every internal link', () => {
    const broken: string[] = [];

    for (const page of pages) {
      const body = page.data.content;

      for (const match of body.matchAll(/\]\((\/docs[^)\s#]*)(#[^)\s]*)?\)/g)) {
        if (!urls.has(match[1])) broken.push(`${page.url} -> ${match[1]}`);
      }

      for (const match of body.matchAll(/\]\((\.\.?\/[^)\s#]*)(#[^)\s]*)?\)/g)) {
        const dir = page.url.split('/').slice(0, -1).join('/');
        const resolved = new URL(match[1], `https://docs.invalid${dir}/`).pathname.replace(
          /\/$/,
          '',
        );

        if (!urls.has(resolved)) broken.push(`${page.url} -> ${match[1]} (${resolved})`);
      }
    }

    expect(broken).toEqual([]);
  });
});

describe('llms routes', () => {
  it('round-trips every markdown URL back to its page', () => {
    for (const page of pages) {
      const url = getMarkdownUrl(page);
      const slug = url.slice(`${docsConfig.baseUrl}/llms.mdx/`.length).split('/');

      expect(source.getPage(parseMarkdownSlug(slug))?.url, url).toBe(page.url);
    }
  });

  it('prerenders one markdown route per page', () => {
    expect(getMarkdownParams()).toHaveLength(pages.length);
  });

  it('includes every page in llms-full.txt', () => {
    const full = getLLMFullText();

    for (const page of pages) expect(full).toContain(`(${page.url})`);
  });
});

describe('search', () => {
  it('exports an index that returns hits', async () => {
    const response = await searchServer.staticGET();
    expect(response.ok).toBe(true);

    const results = await searchServer.search('pdf extraction');
    expect(results.length).toBeGreaterThan(0);
  });
});
