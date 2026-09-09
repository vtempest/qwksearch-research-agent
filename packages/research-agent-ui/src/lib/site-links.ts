/**
 * @fileoverview Which of the configured site links to offer on a given route.
 *
 * The dock carries the site links on every page, help docs included, so on
 * `/docs` the "Docs" entry pointed at the page the reader was already on. A
 * link to where you already are is dead weight in a nav, so the route the
 * dock is currently showing drops out of the list.
 */
import type { FooterLink } from '../config';

/**
 * Whether `url` names the section `pathname` is inside — the route itself or
 * anything nested under it, so `/docs/guides/search` counts as `/docs`.
 *
 * Only same-origin, path-only links can match:
 *
 * - An absolute URL (`https://…`) leaves the app, so it is never "here".
 * - A link carrying a hash or a query (`/#downloads`) is an action rather than
 *   a destination — that one opens the downloads dialog — and stays put.
 * - `/` would otherwise match every route, so it is compared exactly.
 */
function isCurrentSection(url: string, pathname: string): boolean {
  if (!url.startsWith('/') || url.includes('#') || url.includes('?')) return false;

  const target = url.replace(/\/+$/, '') || '/';
  const here = pathname.replace(/\/+$/, '') || '/';

  return target === '/' ? here === '/' : here === target || here.startsWith(`${target}/`);
}

/**
 * The site links worth showing from `pathname`: every configured link except
 * one that leads back to the current page or its section.
 */
export function siteLinksForPath(links: FooterLink[], pathname: string | null): FooterLink[] {
  if (!pathname) return links;
  return links.filter((link) => !isCurrentSection(link.url, pathname));
}
