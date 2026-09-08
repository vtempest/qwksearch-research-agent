import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter } from '@fumadocs/mdx-remote';
import { loader, type MetaData } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';

import { docsConfig } from './config';

/** Root of the content this package ships — `content/docs/**` — relative to this file. */
export const contentDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../content/docs',
);

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

function collectFiles(dir: string, relativeBase = ''): HelpDocFile[] {
  const files: HelpDocFile[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relativePath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath, relativePath));
      continue;
    }

    if (entry.name === 'meta.json') {
      files.push({
        type: 'meta',
        path: relativePath,
        absolutePath,
        data: JSON.parse(fs.readFileSync(absolutePath, 'utf-8')) as MetaData,
      });
      continue;
    }

    if (!/\.mdx?$/.test(entry.name)) continue;

    const raw = fs.readFileSync(absolutePath, 'utf-8');
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
        title: data.title ?? entry.name.replace(/\.mdx?$/, ''),
        description: data.description,
        icon: data.icon,
        full: data.full,
        content,
      },
    });
  }

  return files;
}

/**
 * Fumadocs source for the help docs, built by scanning `content/docs` directly
 * (via `@fumadocs/mdx-remote`) instead of the `fumadocs-mdx` build-time
 * collections pipeline — this content lives in its own workspace package, so
 * it doesn't need a codegen step wired into the consuming app's bundler.
 */
export const source = loader(
  { files: collectFiles(contentDir) },
  {
    baseUrl: docsConfig.baseUrl,
    // Frontmatter `icon: "Search"` becomes the matching Lucide icon in the
    // sidebar and page tree.
    plugins: [lucideIconsPlugin()],
  },
);

export type HelpDocPage = ReturnType<typeof source.getPages>[number];
