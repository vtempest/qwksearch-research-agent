/**
 * The /docs help site is assembled from two halves that nothing else checks
 * against each other: the content and the Fumadocs UI live in
 * `packages/user-help-docs`, while the routes that mount them live here.
 * That package has its own suite for the content itself; this one covers
 * the seam, which fails silently rather than at build time — a moved route
 * file, a `docsConfig` value the routes no longer match, a dropped
 * `transpilePackages` entry or a missing CSS import all yield a 404, an
 * unstyled page or an empty sidebar with a green build. No CI job builds
 * this app, so this suite is the only thing standing between a broken
 * /docs and a deploy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { source } from 'user-help-docs';
import { docsConfig } from 'user-help-docs/config';

/** `apps/qwksearch-web`, resolved from this file. */
const appDir = fileURLToPath(new URL('../../..', import.meta.url));

function readAppFile(...segments: string[]): string {
  return fs.readFileSync(path.join(appDir, ...segments), 'utf8');
}

/** Turn a route like `/docs/api/docs-search` into its `app/` directory. */
function routeDir(route: string): string {
  return path.join(appDir, 'app', route.replace(/^\//, ''));
}

describe('the docs package loads', () => {
  it('inlines every content page into the bundle', () => {
    // `user-help-docs` builds its page tree with `import.meta.glob`, which
    // only exists under a Vite-based bundler. If this app ever compiles it
    // with something else, an empty page list is where that shows up.
    expect(source.getPages().length).toBeGreaterThan(0);
  });

  it('serves every page from under the mounted base URL', () => {
    for (const page of source.getPages()) {
      expect(page.url, page.url).toMatch(new RegExp(`^${docsConfig.baseUrl}(/|$)`));
    }
  });
});

describe('the route modules serve the docs', () => {
  it('renders a page per doc, titled from docsConfig', async () => {
    const page = await import('../[[...slug]]/page');

    expect(page.generateStaticParams()).toHaveLength(source.getPages().length);

    const metadata = await page.generateMetadata({ params: Promise.resolve({ slug: undefined }) });
    expect(metadata.title).toContain(docsConfig.title);
  });

  it('mounts the Fumadocs layout', async () => {
    const layout = await import('../layout');

    expect(layout.default).toBeTypeOf('function');
  });

  it('answers the search index request', async () => {
    // Backs the client-side search box; `docsConfig.searchApi` is the URL it
    // fetches, so the route has to stay where that points.
    const route = await import('../api/docs-search/route');

    expect((await route.GET()).ok).toBe(true);
    expect(fs.existsSync(path.join(routeDir(docsConfig.searchApi), 'route.ts'))).toBe(true);
  });

  it('serves llms-full.txt', async () => {
    const route = await import('../llms-full.txt/route');
    const body = await route.GET().text();

    for (const page of source.getPages()) expect(body).toContain(`(${page.url})`);
  });

  it('serves one raw-Markdown route per page', async () => {
    const route = await import('../llms.mdx/[[...slug]]/route');

    expect(route.generateStaticParams()).toHaveLength(source.getPages().length);
  });
});

describe('the app is configured to render the docs', () => {
  it('transpiles user-help-docs, which ships TypeScript sources', () => {
    // The package has no build step — its `exports` point straight at `src`.
    expect(readAppFile('next.config.mjs')).toMatch(/transpilePackages:[^\]]*["']user-help-docs["']/);
  });

  it('imports the fumadocs CSS preset', () => {
    // Without these the docs render with no theme tokens at all.
    const css = readAppFile('app', 'globals.css');

    expect(css).toContain('fumadocs-ui/css/neutral.css');
    expect(css).toContain('fumadocs-ui/css/preset.css');
  });
});
