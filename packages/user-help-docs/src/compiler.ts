/**
 * @file compiler.ts
 * @description A single shared MDX compiler for the help docs. Content is
 * compiled at request time (via `@fumadocs/mdx-remote`) rather than through
 * `fumadocs-mdx`'s build-time codegen, since it lives in its own workspace
 * package and shouldn't need a codegen step wired into the consuming app's
 * bundler. GFM (tables, footnotes, strikethrough) is on by default.
 */
import { createCompiler } from '@fumadocs/mdx-remote';

export const docsCompiler = createCompiler({
  remarkImageOptions: { onError: 'ignore' },
});
