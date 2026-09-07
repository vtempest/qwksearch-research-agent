import { createCompiler } from '@fumadocs/mdx-remote';

/**
 * A single shared MDX compiler for the /docs help site. Help doc content is
 * compiled at request time (via `@fumadocs/mdx-remote`) rather than through
 * `fumadocs-mdx`'s build-time codegen, since it lives in a separate workspace
 * package (`user-help-docs`) and doesn't need a codegen step wired into this
 * app's bundler.
 */
export const docsCompiler = createCompiler();
