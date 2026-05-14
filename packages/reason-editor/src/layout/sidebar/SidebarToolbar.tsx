/**
 * @module SidebarToolbar
 * @description Compact icon toolbar rendered at the top of the sidebar. Shows
 * context-sensitive controls based on `viewMode`: file-source switcher, search,
 * file manager, new file/folder, and expand/collapse buttons.
 */
import { RefObject } from 'react';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../ui/dropdown-menu';
import { Search, FilePlus, FolderPlus, ChevronsDownUp, ChevronsUpDown, Check, Folders } from 'lucide-react';
import { AnyFileSource } from '../../types/fileSource';
import { getSourceIcon, getSourceTypeLabel } from './fileSourceUtils';
import type { DocumentTreeHandle } from '../../filetree/filetree';
import type { OutlineViewHandle } from '../../search/OutlineView';
import type { ViewMode } from './types';

/** Props for the {@link SidebarToolbar} component. */
interface SidebarToolbarProps {
  /** Active sidebar view mode — controls which toolbar buttons are shown. */
  viewMode: ViewMode;
  /** ID of the currently selected document (used when creating a new sibling). */
  activeId: string | null;
  /** Creates a new note (`isFolder=false`) or folder (`isFolder=true`) under `parentId`. */
  onAdd: (parentId: string | null, isFolder?: boolean) => void;
  /** Focuses the sidebar search input. */
  onSearchFocus: () => void;
  /** Opens the file manager modal. */
  onFileManagerOpen: () => void;
  /** Available file source configurations. */
  sources: AnyFileSource[];
  /** The currently active file source object, or `null` if none selected. */
  activeSource: AnyFileSource | null;
  /** ID of the currently active file source. */
  activeFileSourceId: string;
  /** Called when the user selects a different file source from the dropdown. */
  onFileSourceChange?: (sourceId: string) => void;
  /** Selects a source by ID and updates the active source state. */
  onSourceSelect: (sourceId: string) => void;
  /** Whether all tree nodes are currently expanded. */
  allExpanded: boolean;
  /** Whether all outline entries are currently expanded. */
  outlineExpanded: boolean;
  /** Toggles expand/collapse of all tree nodes. */
  onToggleAllExpanded: () => void;
  /** Toggles expand/collapse of all outline entries. */
  onToggleOutlineExpanded: () => void;
  /** Ref forwarded to the `FileTree` for imperative operations. */
  treeRef: RefObject<DocumentTreeHandle | null>;
  /** Ref forwarded to the `OutlineView` for imperative operations. */
  outlineRef: RefObject<OutlineViewHandle | null>;
}

/**
 * Sidebar toolbar strip. Renders different button sets based on `viewMode`:
 * tree/split modes show file-source, search, file-manager, new-file/folder,
 * and collapse-all buttons; outline/split modes additionally show an
 * outline expand/collapse toggle.
 */
export const SidebarToolbar = ({
  viewMode,
  activeId,
  onAdd,
  onSearchFocus,
  onFileManagerOpen,
  sources,
  activeSource,
  activeFileSourceId,
  onFileSourceChange,
  onSourceSelect,
  allExpanded,
  outlineExpanded,
  onToggleAllExpanded,
  onToggleOutlineExpanded,
  treeRef,
  outlineRef,
}: SidebarToolbarProps) => {
  return (
    <div className='mt-[100px]'>
      <div className='h-[100px]'> </div>
      <div className="flex flex-wrap items-center gap-2 bg-sidebar-accent/50 rounded-md p-1 pl-0 pr-2">
        <TooltipProvider delayDuration={300}>
          {/* Show file/folder buttons only in tree or split view */}
          {(viewMode === 'tree' || viewMode === 'split') && (
            <>
              {/* File Source Dropdown */}
              {onFileSourceChange && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-8 px-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                          {activeSource && getSourceIcon(activeSource.type)}
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Storage Source: {activeSource?.name || 'Select Source'}</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="start" className="w-56">
                    {sources.map((source, index) => (
                      <div key={source.id}>
                        {index > 0 && sources[index - 1]?.type !== source.type && (
                          <DropdownMenuSeparator />
                        )}
                        <DropdownMenuItem
                          onClick={() => onSourceSelect(source.id)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getSourceIcon(source.type)}
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate text-sm">{source.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {getSourceTypeLabel(source.type)}
                              </span>
                            </div>
                          </div>
                          {source.id === activeFileSourceId && (
                            <Check className="h-4 w-4 ml-2 shrink-0" />
                          )}
                        </DropdownMenuItem>
                      </div>
                    ))}
                    {sources.length === 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled className="text-xs text-center text-muted-foreground">
                          Add sources in Settings
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSearchFocus}
                    className="flex-1 h-8 px-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Search Notes</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onFileManagerOpen}
                    className="flex-1 h-8 px-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Folders className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>File Manager</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAdd(activeId, false)}
                    className="flex-1 h-8 px-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <FilePlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>New File</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAdd(activeId, true)}
                    className="flex-1 h-8 px-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>New Folder</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleAllExpanded}
                    className="flex-1 h-8 px-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    {allExpanded ? (
                      <ChevronsUpDown className="h-4 w-4" />
                    ) : (
                      <ChevronsDownUp className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{allExpanded ? 'Collapse All' : 'Expand All'}</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Show expand/collapse in outline or split view */}
          {(viewMode === 'outline' || viewMode === 'split') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleOutlineExpanded}
                  className="flex-1 h-8 px-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  {outlineExpanded ? (
                    <ChevronsUpDown className="h-4 w-4" />
                  ) : (
                    <ChevronsDownUp className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{outlineExpanded ? 'Collapse All' : 'Expand All'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
};
