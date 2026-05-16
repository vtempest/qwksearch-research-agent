
# PDF To HTML with Docling OCR Model 

![docling_pdf_logo](https://i.imgur.com/2VFpwzF.png)

Convert PDF documents to HTML using the [`ibm-granite/granite-docling-258M`](https://huggingface.co/ibm-granite/granite-docling-258M) AI model from Hugging Face.

This system processes documents by extracting text with OCR while preserving layout, structure, and bounding boxes. It supports recognition of code, formulas, tables, lists, charts, and figures, ensuring accurate formatting and correspondence of captions. Full-page conversion integrates all elements—text, equations, tables, and graphics—into a cohesive output. It is designed for both scientific and non-scientific documents, offering comprehensive document processing capabilities.

## Features

- 📄 Convert complex PDF files to structured HTML
- 🤖 Uses advanced Granite Docling AI model for accurate text extraction
- 📐 Layout and Localization – Preserves document structure and document element bounding boxes.
- 💻 Code Recognition – Detects and formats code blocks including identation.
- 🔢 Formula Recognition – Identifies and processes mathematical expressions.
- 📊 Chart Recognition – Extracts and interprets chart data.
- 📑 Table Recognition – Supports column and row headers for structured table extraction.
- 🖼️ Figure Classification – Differentiates figures and graphical elements.
- 📝 Caption Correspondence – Links captions to relevant images and figures.
- 📜 List Grouping – Organizes and structures list elements correctly.
- 📄 Full-Page Conversion – Processes entire pages for comprehensive document conversion including all page elements (code, equations, tables, charts etc.)
- 🔲 OCR with Bounding Boxes – OCR regions using a bounding box.

## Configuration Options

The converter accepts several options when used programmatically:

```javascript
// PDF to images conversion options
const imageOptions = {
  density: 150,        // DPI for image conversion
  format: 'png',       // Output format
  width: 1600,         // Max width
  height: 1600,        // Max height
  savePath: './temp'   // Temporary directory
};

const imagePaths = await converter.convertPDFToImages(pdfPath, imageOptions);
```

## Output Features

The generated HTML includes:

- **Clean styling** with modern CSS
- **Responsive design** that works on mobile devices
- **Page separation** with clear page headers
- **Structured content** with proper headings and lists
- **Conversion metadata** showing date and model used

## Performance Notes

- **Processing time**: Approximately 1-3 minutes per page (depending on content complexity)
- **Model**: Uses the optimized `mlx-bf16` variant for better performance
- **Image optimization**: Automatically resizes images for optimal model processing
- **Retry logic**: Handles model loading delays with automatic retries


## Comparison: Docling vs Chandra vs Paddle OCR

Docling stands out for its emphasis on preserving semantic structure and producing highly accurate markdown or HTML outputs, making it particularly valuable for documents with complex layouts, tables, and formulas. Compared to Chandra OCR, Docling offers robust formula extraction with a specialized model and excels in maintaining layout/heading hierarchy for finance, legal, and scientific PDFs. However, Chandra surpasses Docling in overall extraction accuracy, especially for advanced table detection, handwriting, and multilingual documents, and is generally faster in batch scenarios due to efficient architecture and optional quantization. Chandra is thus preferred for large-scale, highly diverse datasets, while Docling is favored for projects that require deep structure recovery and granular content annotation.

When compared to PaddleOCR, Docling delivers superior structured output and semantic fidelity, ensuring table and figure relationships are retained in markdown/HTML even from complex scanned PDFs. PaddleOCR is renowned for its speed, scalability, and ease of deployment, which makes it ideal for rapid processing and commercial batches. However, PaddleOCR often produces less accurate table and layout segmentation, sometimes misaligning content from scientific papers or multi-column documents, whereas Docling’s transformer-based approach better preserves the source document’s logical flow and structure. PaddleOCR is an excellent choice for multilingual and quick turnaround applications, but Docling remains the go-to tool for projects where document detail and structured output are essential.
