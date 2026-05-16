/**
 * @fileoverview High-fidelity PDF-to-HTML conversion pipeline.
 * Extracts structural elements (headers, lists, code blocks) and handles page-level metadata.
 */
import { resolvePDFJS } from "pdfjs-serverless";
import grab from "grab-url";

import {
  findPageNumbers,
  findFirstPage,
  removePageNumber,
} from "./util/page-number-functions";
import TextItem from "./models/TextItem";
import Page from "./models/Page";

import CalculateGlobalStats from "./transformations/CalculateGlobalStats";
import CompactLines from "./transformations/line-item/CompactLines";
import RemoveRepetitiveElements from "./transformations/line-item/RemoveRepetitiveElements";
import VerticalToHorizontal from "./transformations/line-item/VerticalToHorizontal";
import DetectTOC from "./transformations/line-item/DetectTOC";
import DetectListItems from "./transformations/line-item/DetectListItems";
import DetectHeaders from "./transformations/line-item/DetectHeaders";

import GatherBlocks from "./transformations/line-item-block/GatherBlocks";
import DetectCodeQuoteBlocks from "./transformations/line-item-block/DetectCodeQuoteBlocks";
import DetectListLevels from "./transformations/line-item-block/DetectListLevels";
import ToTextBlocks from "./transformations/ToTextBlocks";
import ToHTML from "./transformations/ToHTML";
import ParseResult from "./models/ParseResult";

/**
 * ### Convert PDF to HTML
 * <img src="https://i.imgur.com/6IdNDLP.png" width="350px" />
 *
 * Extracts formatted text from PDF with parsing of linebreaks ,
 * page headers, footnotes, and section headings. Supports fonts, links, bold,
 * italics, lists, headings, headers, footnotes, and Table of Contents,
 * Quotes, and Code Blocks, . Removes repeated headers, links footnote anchors to the footnote,
 *  and preserves number of the PDF page with invisible I element.
 *
 * This function uses [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless)
 * to work in more environments than PDF.js-based tools:
 * Cloudflare workers, serverless, node.js, and front-end only.
 * @param {string} pdfURLOrBuffer - URL to a PDF file or buffer from fs.readFile
 * @param {Object} [options]
 * @param {boolean} options.addPageNumbers default=false - Adds  #  to end of each page
 * @param {boolean} options.removePageHeaders default=true - Removes repeated headers found on each page
 * @returns {string|Object} HTML formatted text
 * @category Extract
 * @author [vtempest (2025)](https://github.com/vtempest),
 * [pdf-to-markdown (2017)](https://github.com/jzillmann/pdf-to-markdown/tree/master),
 * [pdf.js (2012-)](https://github.com/mozilla/pdf.js/releases),
 */
export async function convertPDFToHTML(
  pdfURLOrBuffer: any,
  options: { addPageNumbers?: boolean; addCitation?: boolean } = {},
) {
  // try {
  var { addPageNumbers = false, addCitation = true } = options;

  // pass in databuffer or download all pdf data
  // and convert to array buffer
  var buffer =
    typeof pdfURLOrBuffer === "string"
      ? await grab(pdfURLOrBuffer, {
          responseType: "arraybuffer",
          timeout: 10,
        })
      : pdfURLOrBuffer;

  try {
    const { getDocument } = await resolvePDFJS();
    var pdfDocument = await getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      verbosity: 0,
    }).promise;
  } catch (e) {
    return { error: e.message };
  }

  const pages = [...Array(pdfDocument.numPages).keys()].map(
    (index) => new Page({ index }),
  );

  let pageIndexNumMap = {};
  let firstPage;
  for (let j = 1; j <= pdfDocument.numPages; j++) {
    const page = await pdfDocument.getPage(j);
    const textContent = await page.getTextContent();

    if (Object.keys(pageIndexNumMap).length < 10) {
      pageIndexNumMap = findPageNumbers(
        pageIndexNumMap,
        page.pageNumber - 1,
        textContent.items,
      );
    } else {
      firstPage = findFirstPage(pageIndexNumMap);
      break;
    }
  }

  let pageNum = firstPage ? firstPage.pageNum : 0;
  for (let j = 1; j <= pdfDocument.numPages; j++) {
    const page = await pdfDocument.getPage(j);

    // Trigger the font retrieval for the page
    await page.getOperatorList();

    const scale = 1.0;
    const viewport = page.getViewport({ scale });
    let textContent = await page.getTextContent();
    if (firstPage && page.pageIndex >= firstPage.pageIndex) {
      textContent = removePageNumber(textContent, pageNum);
      pageNum++;
    }
    const textItems = textContent.items.map((item) => {
      const tx = [1, 0, 0, 1, 0, 0];
      for (let i = 0; i < 6; i++) {
        tx[i] += item.transform[i] * viewport.transform[i % 2 ? 3 : 0];
        if (i % 2) {
          tx[i + 1] += item.transform[i] * viewport.transform[1];
        }
      }

      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
      const dividedHeight = item.height / fontHeight;
      return new TextItem({
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: Math.round(item.width),
        height: Math.round(dividedHeight <= 1 ? item.height : dividedHeight),
        text: item.str,
        font: item.fontName,
      });
    });
    pages[page.pageNumber - 1].items = textItems;
  }

  var parseResult = new ParseResult({ pages });

  let lastTransformation,
    transformations = [
      new CalculateGlobalStats(),
      new CompactLines(),
      new RemoveRepetitiveElements(),
      new VerticalToHorizontal(),
      new DetectTOC(),
      new DetectHeaders(),
      new DetectListItems(),

      new GatherBlocks(),
      new DetectCodeQuoteBlocks(),
      new DetectListLevels(),

      new ToTextBlocks(),
      new ToHTML(),
    ];

  transformations?.forEach((transformation) => {
    if (lastTransformation) {
      parseResult = lastTransformation.completeTransform(parseResult);
    }
    parseResult = transformation.transform(parseResult);
    lastTransformation = transformation;
  });

  var html = parseResult.pages.reduce((acc, page, pageNumber) => {
    return (
      acc +
      `<p id="page-${pageNumber + 1}">${
        addPageNumbers ? ` [${pageNumber + 1}] ` : ""
      }${page.items.join('</p><p id="page-' + pageNumber + '">')}</p>`
    );
  }, "");

  if (addCitation) {
    // Get metadata
    // avoid using date as it is unreliable sand generally file mod date
    var metadata = await pdfDocument.getMetadata();
    var { Author: author, Title: title } = metadata.info;
    // date =
    //   date.slice(2, 6) + "-" + date.slice(6, 8) + "-" + date.slice(8, 10);
    // date = date ? new Date(date)?.toISOString().split("T")[0] : null;

    //look for date in first page
    // date = chrono
    //   .parseDate(content.slice(0, 400))
    //   ?.toISOString()
    //   .split("T")[0];
    // //  || date;

    title = html.slice(0, 400).match(/<h[0-9]>(.*?)<\/h[0-9]>/)?.[1] || title;
  }

  return { author, title, html, format: "pdf" };
}
