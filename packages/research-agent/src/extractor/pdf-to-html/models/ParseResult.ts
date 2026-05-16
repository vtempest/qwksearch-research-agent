/**
 * @fileoverview Model representing the result of a PDF parsing operation.
 * Aggregates Pages and global document statistics.
 */
/**
 * @module research/extractor/pdf-to-html/models/ParseResult
 * @description Research library module.
 */
// The result of a PDF parse respectively a Transformation
export default class ParseResult {
  constructor(options) {
    this.pages = options.pages; // like Page[]
    this.globals = options.globals; // properties accasable for all the following transformations in debug mode
    this.messages = options.messages; // something to show only for the transformation in debug mode
  }
}
