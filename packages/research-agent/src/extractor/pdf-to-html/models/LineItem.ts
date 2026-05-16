/**
 * @module research/extractor/pdf-to-html/models/LineItem
 * @description Research library module.
 */
import PageItem from "./PageItem";
import Word from "./Word";

// A line within a page
export default class LineItem extends PageItem {
  constructor(options) {
    super(options);
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.words = options.words || [];
    if (options.text && !options.words) {
      this.words = options.text
        .split(" ")
        .filter((string) => string.trim().length > 0)
        .map(
          (wordAsString) =>
            new Word({
              string: wordAsString,
            }),
        );
    }
  }

  text() {
    return this.wordStrings().join(" ");
  }

  wordStrings() {
    return this.words.map((word) => word.string);
  }
}
