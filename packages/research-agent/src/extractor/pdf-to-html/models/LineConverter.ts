/**
 * @module research/extractor/pdf-to-html/models/LineConverter
 * @description Research library module.
 */
import TextItem from "./TextItem";
import Word from "./Word";
import LineItem from "./LineItem";
import StashingStream from "./StashingStream";
import ParsedElements from "./ParsedElements";
import { isNumber, isListItemCharacter } from "../util/string-functions";
import { sortByX } from "../util/page-item-functions";

export const WordFormat = {
  BOLD: {
    name: "BOLD",
    startSymbol: "<strong>",
    endSymbol: "</strong>",
  },

  OBLIQUE: {
    name: "OBLIQUE",
    startSymbol: "<em>",
    endSymbol: "</em>",
  },

  BOLD_OBLIQUE: {
    name: "BOLD_OBLIQUE",
    startSymbol: "<strong><em>",
    endSymbol: "</em></strong>",
  },
};

export const WordType = {
  LINK: {
    name: "LINK",
    toText(string) {
      return `<a href="${string}">${string}</a>`;
    },
  },

  FOOTNOTE_LINK: {
    name: "FOOTNOTE_LINK",
    attachWithoutWhitespace: true,
    plainTextFormat: true,
    toText(string) {
      return `<sup><a href="#${string}">${string}</a></sup>`;
    },
  },

  FOOTNOTE: {
    name: "FOOTNOTE",
    toText(string) {
      return `<p id="${string}">^${string}</p>`;
    },
  },
};

// Converts text items which have been grouped to a line (through TextItemLineGrouper) to a single LineItem doing inline transformations like
// 'whitespace removal', bold/emphasis annotation, link-detection, etc..
export default class LineConverter {
  constructor(fontToFormats) {
    this.fontToFormats = fontToFormats;
  }

  // returns a CombineResult
  compact(textItems /*: TextItem[] */) /*: LineItem */ {
    // we can't trust order of occurence, esp. footnoteLinks like to come last
    sortByX(textItems);

    const wordStream = new WordDetectionStream(this.fontToFormats);
    wordStream.consumeAll(textItems.map((item) => new TextItem({ ...item })));
    const words = wordStream.complete();

    var maxHeight = 0;
    var widthSum = 0;
    textItems.forEach((item) => {
      maxHeight = Math.max(maxHeight, item.height);
      widthSum += item.width;
    });
    return new LineItem({
      x: textItems[0].x,
      y: textItems[0].y,
      height: maxHeight,
      width: widthSum,
      words: words,
      parsedElements: new ParsedElements({
        footnoteLinks: wordStream.footnoteLinks,
        footnotes: wordStream.footnotes,
        containLinks: wordStream.containLinks,
        formattedWords: wordStream.formattedWords,
      }),
    });
  }
}

class WordDetectionStream extends StashingStream {
  constructor(fontToFormats) {
    super();
    this.fontToFormats = fontToFormats;
    this.footnoteLinks = [];
    this.footnotes = [];
    this.formattedWords = 0;
    this.containLinks = false;
    this.stashedNumber = false;
  }

  shouldStash(item) {
    // eslint-disable-line no-unused-vars
    if (!this.firstY) {
      this.firstY = item.y;
    }
    this.currentItem = item;
    return true;
  }

  onPushOnStash(item) {
    // eslint-disable-line no-unused-vars
    this.stashedNumber = isNumber(item.text.trim());
  }

  doMatchesStash(lastItem, item) {
    const lastItemFormat = this.fontToFormats.get(lastItem.font);
    const itemFormat = this.fontToFormats.get(item.font);
    if (lastItemFormat !== itemFormat) {
      return false;
    }
    const itemIsANumber = isNumber(item.text.trim());
    return this.stashedNumber === itemIsANumber;
  }

  doFlushStash(stash, results) {
    if (this.stashedNumber) {
      const joinedNumber = stash
        .map((item) => item.text)
        .join("")
        .trim();
      if (stash[0].y > this.firstY) {
        // footnote link
        results.push(
          new Word({
            string: `${joinedNumber}`,
            type: WordType.FOOTNOTE_LINK,
          }),
        );
        this.footnoteLinks.push(parseInt(joinedNumber));
      } else if (this.currentItem && this.currentItem.y < stash[0].y) {
        // footnote
        results.push(
          new Word({
            string: `${joinedNumber}`,
            type: WordType.FOOTNOTE,
          }),
        );
        this.footnotes.push(joinedNumber);
      } else {
        this.copyStashItemsAsText(stash, results);
      }
    } else {
      this.copyStashItemsAsText(stash, results);
    }
  }

  copyStashItemsAsText(stash, results) {
    const format = this.fontToFormats.get(stash[0].font);
    results.push(...this.itemsToWords(stash, format));
  }

  itemsToWords(items, formatName) {
    const combinedText = combineText(items);
    const words = combinedText.split(" ");
    const format = formatName ? WordFormat.enumValueOf(formatName) : null;
    return words
      .filter((w) => w.trim().length > 0)
      .map((word) => {
        var type = null;
        if (word.startsWith("http:")) {
          this.containLinks = true;
          type = WordType.LINK;
        } else if (word.startsWith("www.")) {
          this.containLinks = true;
          word = `http://${word}`;
          type = WordType.LINK;
        }

        if (format) {
          this.formattedWords++;
        }
        return new Word({ string: word, type, format });
      });
  }
}

function combineText(textItems) {
  var text = "";
  var lastItem;
  textItems.forEach((textItem) => {
    var textToAdd = textItem.text;
    if (!text.endsWith(" ") && !textToAdd.startsWith(" ")) {
      if (lastItem) {
        const xDistance = textItem.x - lastItem.x - lastItem.width;
        if (xDistance > 5) {
          text += " ";
        }
      } else {
        if (isListItemCharacter(textItem.text)) {
          textToAdd += " ";
        }
      }
    }
    text += textToAdd;
    lastItem = textItem;
  });
  return text;
}
