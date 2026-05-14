/**
 * @fileoverview Utility functions for managing the DOM state of collapsible nodes.
 */

export function setDomHiddenUntilFound(dom: HTMLElement): void {
  (dom as HTMLElement & { hidden: string }).hidden = "until-found";
}

export function domOnBeforeMatch(dom: HTMLElement, callback: () => void): void {
  dom.onbeforematch = callback;
}
