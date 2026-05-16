/**
 * @fileoverview Model representing a single item of text in a PDF document.
 * Stores spatial information and font details.
 */
/**
 * @module research/extractor/pdf-to-html/models/TextItem
 * @description Research library module.
 */

class PageItem {
  constructor(options) {
    if (this.constructor === PageItem) {
      throw new TypeError("Can not construct abstract class.");
    }
    this.type = options.type;
    this.annotation = options.annotation;
    this.parsedElements = options.parsedElements;
  }
}

// A text item, i.e. a line or a word within a page
export default class TextItem extends PageItem {
  constructor(options) {
    super(options);
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.text = options.text;
    this.font = options.font;

    this.lineFormat = options.lineFormat;
    this.unopenedFormat = options.unopenedFormat;
    this.unclosedFormat = options.unclosedFormat;
  }
}
