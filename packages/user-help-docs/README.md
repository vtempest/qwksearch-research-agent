# user-help-docs

The QwkSearch help site — content **and** the Fumadocs UI layer that renders
it. `apps/qwksearch-web` mounts it at [`/docs`](https://qwksearch.com/docs) with
a handful of thin route files; everything else lives here.

## Layout

```
content/docs/**        MDX pages + meta.json sidebar order
src/source.ts          Fumadocs loader (scans content/docs at import time)
src/compiler.ts        Shared @fumadocs/mdx-remote compiler
src/config.ts          Branding, links, route config — start here
src/search.ts          Static search index
src/llms.ts            llms.txt / raw-Markdown routes and URL helpers
src/layout.config.tsx  Navbar/sidebar options
src/mdx-components.tsx Components MDX pages may use without importing
src/components/**      Client components (breadcrumb, copy-for-LLM, Ask AI)
```

Content is compiled **at request time** with
[`@fumadocs/mdx-remote`](https://www.npmjs.com/package/@fumadocs/mdx-remote)
rather than through `fumadocs-mdx`'s build-time collections. That's deliberate:
the content lives in its own workspace package, so this way the consuming app
needs no codegen step wired into its bundler.

## Writing a page

Add an `.mdx` file under `content/docs/` with frontmatter:

```mdx
---
title: "Search"
description: "One line shown under the title and in search results."
icon: "Search"
---
```

`icon` is any [Lucide](https://lucide.dev/icons) name **as it appears in
`lucide-react`'s `icons` export** — an unknown name logs
`[lucide-icons-plugin] Unknown icon detected` at build and renders nothing.

Then add the file's slug to `content/docs/meta.json` to place it in the
sidebar. Entries wrapped in `---Like This---` render as section separators;
a folder name pulls in that folder's own `meta.json`.

Available components (no import needed): `Callout`, `Card`/`Cards`,
`Accordion`/`Accordions`, `Step`/`Steps`, `Tab`/`Tabs`, `File`/`Files`/`Folder`,
`TypeTable`. GFM tables, footnotes and strikethrough work out of the box.

## Consuming it

```tsx
// app/docs/layout.tsx
import { source } from 'user-help-docs';
import { docsConfig } from 'user-help-docs/config';
import { docsLayoutOptions } from 'user-help-docs/layout.config';

// app/docs/[[...slug]]/page.tsx
import { docsCompiler } from 'user-help-docs/compiler';
import { getMDXComponents } from 'user-help-docs/mdx-components';
import { getGithubUrl, getMarkdownUrl } from 'user-help-docs/llms';
import { Breadcrumb } from 'user-help-docs/components/breadcrumb';
import { DocsActions } from 'user-help-docs/components/docs-actions';

// app/docs/api/docs-search/route.ts
import { searchServer } from 'user-help-docs/search';
```

The app must list `user-help-docs` in `next.config`'s `transpilePackages` (it
ships TypeScript sources, not a build), and import fumadocs' CSS preset:

```css
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";
```

## Routes it expects

| Route | Backed by |
|---|---|
| `/docs/[[...slug]]` | `source` + `docsCompiler` |
| `/docs/api/docs-search` | `searchServer.staticGET` |
| `/docs/llms.mdx/[[...slug]]` | `getLLMText`, `parseMarkdownSlug`, `getMarkdownParams` |
| `/docs/llms-full.txt` | `getLLMFullText` |

Changing `docsConfig.baseUrl` or `searchApi` means moving those route files to
match — nothing rewrites them for you. `apps/qwksearch-web`'s
`app/docs/__tests__/docs-wiring.test.ts` holds that seam: it imports each of
those route modules and checks them against `docsConfig`, along with the
`transpilePackages` entry and the CSS imports above. Nothing in CI builds the
web app, so that suite is what catches a `/docs` that would 404 or render
unstyled.

## Checks

```bash
bun install
npx tsc --noEmit
bun run test                                   # this package
cd ../../apps/qwksearch-web && bun run test    # the /docs routes that mount it
```
