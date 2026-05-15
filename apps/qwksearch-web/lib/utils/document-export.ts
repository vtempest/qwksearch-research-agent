import { loadDocx, loadJsPDF } from "./cdn-loader";

export type ExportFormat = "pdf" | "docx" | "html" | "markdown";

interface ExportDocumentOptions {
  content: string;
  fileName: string;
  format: ExportFormat;
}

/**
 * Export document content to various formats
 */
export async function exportDocument({
  content,
  fileName,
  format,
}: ExportDocumentOptions): Promise<void> {
  switch (format) {
    case "pdf":
      await exportToPDF(content, fileName);
      break;
    case "docx":
      await exportToDocx(content, fileName);
      break;
    case "html":
      await exportToHtml(content, fileName);
      break;
    case "markdown":
      await exportToMarkdown(content, fileName);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export to PDF using jsPDF (loaded from CDN)
 */
async function exportToPDF(htmlContent: string, fileName: string): Promise<void> {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;
  const textContent = tempDiv.textContent || tempDiv.innerText || "";

  // Simple text export (you might want to enhance this with html2canvas for better rendering)
  const lines = doc.splitTextToSize(textContent, 180);
  doc.text(lines, 15, 15);

  doc.save(`${fileName}.pdf`);
}

/**
 * Export to DOCX using docx library (loaded from CDN)
 */
async function exportToDocx(htmlContent: string, fileName: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await loadDocx();

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;

  // Convert HTML to docx paragraphs (simplified version)
  const paragraphs: any[] = [];

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (tagName === "h1") {
        paragraphs.push(
          new Paragraph({
            text: element.textContent || "",
            heading: HeadingLevel.HEADING_1,
          })
        );
      } else if (tagName === "h2") {
        paragraphs.push(
          new Paragraph({
            text: element.textContent || "",
            heading: HeadingLevel.HEADING_2,
          })
        );
      } else if (tagName === "h3") {
        paragraphs.push(
          new Paragraph({
            text: element.textContent || "",
            heading: HeadingLevel.HEADING_3,
          })
        );
      } else if (tagName === "p") {
        paragraphs.push(new Paragraph({ children: [new TextRun(element.textContent || "")] }));
      } else {
        // Recursively process child nodes
        element.childNodes.forEach(processNode);
      }
    }
  };

  tempDiv.childNodes.forEach(processNode);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: "Empty document" })],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${fileName}.docx`);
}

/**
 * Export to HTML
 */
async function exportToHtml(htmlContent: string, fileName: string): Promise<void> {
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    code {
      background: #f4f4f4;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f4f4f4;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 3px solid #ddd;
      margin-left: 0;
      padding-left: 1em;
      color: #666;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5em;
      text-align: left;
    }
    th {
      background: #f4f4f4;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: "text/html" });
  downloadBlob(blob, `${fileName}.html`);
}

/**
 * Export to Markdown
 */
async function exportToMarkdown(htmlContent: string, fileName: string): Promise<void> {
  // For markdown export, you would typically convert HTML back to markdown
  // For now, we'll just save the HTML as-is
  // You could use a library like turndown here
  const blob = new Blob([htmlContent], { type: "text/markdown" });
  downloadBlob(blob, `${fileName}.md`);
}

/**
 * Helper function to download a blob
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
