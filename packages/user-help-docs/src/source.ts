import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter } from '@fumadocs/mdx-remote';
import { loader, type VirtualFile } from 'fumadocs-core/source';

/** Root of the content this package ships — `content/docs/**` — relative to this file. */
export const contentDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../content/docs',
);

export interface HelpDocPageData {
  title: string;
  description?: string;
  icon?: string;
  /** Raw MDX body (frontmatter stripped), compiled at request time by the consuming app. */
  content: string;
}

function collectFiles(dir: string, relativeBase = ''): VirtualFile[] {
  const files: VirtualFile[] = [];

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
        data: JSON.parse(fs.readFileSync(absolutePath, 'utf-8')),
      });
      continue;
    }

    if (!/\.mdx?$/.test(entry.name)) continue;

    const raw = fs.readFileSync(absolutePath, 'utf-8');
    const { frontmatter, content } = parseFrontmatter(raw);
    const data = frontmatter as { title?: string; description?: string; icon?: string };

    files.push({
      type: 'page',
      path: relativePath,
      absolutePath,
      data: {
        title: data.title ?? entry.name.replace(/\.mdx?$/, ''),
        description: data.description,
        icon: data.icon,
        content,
      } satisfies HelpDocPageData,
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
  { baseUrl: '/docs' },
);
