/**
 * @module research/extractor/pdf-to-html/models/Word
 * @description Research library module.
 */
export default class Word {
  constructor(options) {
    this.string = options.string;
    this.type = options.type; // WordType
    this.format = options.format; // WordFormat
  }
}
