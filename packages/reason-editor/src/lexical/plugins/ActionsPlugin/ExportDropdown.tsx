/**
 * @fileoverview Export/Import dropdown component for importing and exporting editor content in various formats.
 */

import type { LexicalEditor } from 'lexical';
import type { JSX } from 'react';
import { Download, FileJson, FileIcon, FileText, Upload } from 'lucide-react';
import DropDown, { DropDownItem } from '../../ui/DropDown';
import {
  exportAsJson,
  exportAsMarkdown,
  exportAsHtml,
  exportAsDocx,
  copyForGoogleDocs,
  importCustomFile,
} from './utils';

interface ExportDropdownProps {
  editor: LexicalEditor;
  shouldPreserveNewLinesInMarkdown: boolean;
  showFlashMessage: (message: string) => void;
}

/**
 * Dropdown menu for importing and exporting editor content.
 */
export default function ExportDropdown({
  editor,
  shouldPreserveNewLinesInMarkdown,
  showFlashMessage,
}: ExportDropdownProps): JSX.Element {
  return (
    <DropDown
      buttonClassName="action-button export"
      buttonAriaLabel="Import/Export"
      buttonIcon={<Download size={18} />}
      hideChevron={true}
      stopCloseOnClickSelf={true}
      tooltip="Import or export files">
      <DropDownItem
        onClick={() => importCustomFile(editor, shouldPreserveNewLinesInMarkdown)}
        className="item">
        <Upload size={16} />
        <span>Import File</span>
      </DropDownItem>

      {/* <DropDownItem
        onClick={() => exportAsJson(editor)}
        className="item">
        <FileJson size={16} />
        <span>Export JSON</span>
      </DropDownItem> */}

      <DropDownItem
        onClick={() => exportAsMarkdown(editor, shouldPreserveNewLinesInMarkdown)}
        className="item">
        <FileIcon size={16} />
        <span>Export Markdown</span>
      </DropDownItem>

      <DropDownItem
        onClick={() => exportAsHtml(editor)}
        className="item">
        <FileText size={16} />
        <span>Export HTML</span>
      </DropDownItem>

      <DropDownItem
        onClick={() => exportAsDocx(editor)}
        className="item">
        <FileText size={16} />
        <span>Export DOCX</span>
      </DropDownItem>

      <DropDownItem
        onClick={() => copyForGoogleDocs(editor, showFlashMessage)}
        className="item">
        <FileText size={16} />
        <span>Google Docs (Copy)</span>
      </DropDownItem>
    </DropDown>
  );
}
