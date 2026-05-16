/**
 * @fileoverview Model representing a single page in a PDF document.
 * Contains a collection of TextItems.
 */
/**
 * @module research/extractor/pdf-to-html/models/Page
 * @description Research library module.
 */
// A page which holds PageItems displayable via PdfPageView
export default class Page {
  constructor(options) {
    this.index = options.index;
    this.items = options.items || []; // PageItem
  }
}
