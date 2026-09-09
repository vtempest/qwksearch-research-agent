/**
 * The one `import.meta.glob` signature this package uses.
 *
 * Declared locally rather than pulling in `vite/client`: the package has no
 * direct Vite dependency, and every consumer that builds it (the `vinext`
 * app build and Vitest) is Vite-based, so the transform is always available.
 * Method declarations merge into overloads, so this stays compatible with
 * `vite/client` when a consuming app's typecheck also loads it.
 */
interface ImportMeta {
  glob(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
}
