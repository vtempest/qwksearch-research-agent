/// <reference path="./import-meta-glob.d.ts" />
/**
 * Fumadocs source for the help docs.
 *
 * The content is inlined at build time with `import.meta.glob(..., '?raw')`
 * instead of the `fumadocs-mdx` build-time collections pipeline, so this
 * package needs no codegen step wired into the consuming app's bundler.
 *
 * It is inlined rather than read off disk because the consuming app
 * (`apps/qwksearch-web`) ships to a Cloudflare Worker: there is no filesystem
 * to scan there, and no `import.meta.url` to resolve `content/docs` against.
 * Resolving one anyway threw at module scope —
 *
 *   TypeError: The "path" argument must be of type string or an instance of
 *   URL. Received undefined
 *       at fileURLToPath (node-internal:internal_url)
 *
 * — which took down every route bundled into the same chunk, not just `/docs`.
 */
import { parseFrontmatter } from '@fumadocs/mdx-remote';
import { loader, type MetaData } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';

import { docsConfig } from './config';

/** Prefix the glob keys carry: `content/docs`, relative to this file. */
const GLOB_PREFIX = '../content/docs/';

/** Repo-relative root of the shipped content, used for `absolutePath`. */
const CONTENT_ROOT = docsConfig.githubEdit.pathPrefix;

/**
 * Every `content/docs` file as a string, keyed by its path relative to this
 * module. Eager so `source` stays synchronous for the consuming layout.
 */
const rawFiles = import.meta.glob('../content/docs/**/*.{md,mdx,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface HelpDocPageData {
  title: string;
  description?: string;
  icon?: string;
  /** Render the page edge-to-edge, without a table of contents gutter. */
  full?: boolean;
  /** Raw MDX body (frontmatter stripped), compiled at request time by the consuming app. */
  content: string;
}

type HelpDocFile =
  | { type: 'page'; path: string; absolutePath: string; data: HelpDocPageData }
  | { type: 'meta'; path: string; absolutePath: string; data: MetaData };

function collectFiles(): HelpDocFile[] {
  const files: HelpDocFile[] = [];

  // Sorted so the page tree is built in the same order on every machine,
  // whatever order the bundler happens to hand the glob keys back in.
  for (const key of Object.keys(rawFiles).sort()) {
    if (!key.startsWith(GLOB_PREFIX)) continue;

    const relativePath = key.slice(GLOB_PREFIX.length);
    const absolutePath = `${CONTENT_ROOT}/${relativePath}`;
    const name = relativePath.slice(relativePath.lastIndexOf('/') + 1);
    const raw = rawFiles[key];

    if (name === 'meta.json') {
      files.push({
        type: 'meta',
        path: relativePath,
        absolutePath,
        data: JSON.parse(raw) as MetaData,
      });
      continue;
    }

    if (!/\.mdx?$/.test(name)) continue;

    const { frontmatter, content } = parseFrontmatter(raw);
    const data = frontmatter as {
      title?: string;
      description?: string;
      icon?: string;
      full?: boolean;
    };

    files.push({
      type: 'page',
      path: relativePath,
      absolutePath,
      data: {
        title: data.title ?? name.replace(/\.mdx?$/, ''),
        description: data.description,
        icon: data.icon,
        full: data.full,
        content,
      },
    });
  }

  return files;
}

export const source = loader(
  { files: collectFiles() },
  {
    baseUrl: docsConfig.baseUrl,
    // Frontmatter `icon: "Search"` becomes the matching Lucide icon in the
    // sidebar and page tree.
    plugins: [lucideIconsPlugin()],
  },
);

export type HelpDocPage = ReturnType<typeof source.getPages>[number];
