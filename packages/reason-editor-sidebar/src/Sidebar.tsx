/**
 * @module Sidebar
 * @description Mobile-aware sidebar shell. Renders the toolbar and content
 * inside a Sheet on mobile and directly in the layout on desktop.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { DocumentTreeHandle } from './file-tree/filetree';
import { expandToggleLabelFor, nextExpandLevel } from './file-tree/expandLevels';
import type { OutlineViewHandle } from './search/OutlineView';
import type { AnyFileSource } from './app-types/fileSource';
import type { SidebarProps } from './layout/sidebar/types';
import { Sheet, SheetContent } from './app-ui/sheet';
import { getFileSources } from './app-utils/file-sources/sources';
import { FileManagerModal } from './dialogs/FileManagerModal';
import { cn } from './app-utils/utils';
import { SidebarToolbar } from './SidebarToolbar';
import { SidebarContent } from './SidebarContent';
import { SidebarFooter } from './SidebarFooter';

/** Translucent, blurred glass background — matches the app dock and weather widget. */
const SIDEBAR_GLASS_CLASSES =
  'bg-white/10 dark:bg-black/20 backdrop-blur-md border-white/15 dark:border-white/10';

export const Sidebar = ({
  documents,
  activeId,
  activeDocument,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onMove,
  onManageTags,
  onRename,
  onSearchFocus,
  isOpen,
  onOpenChange,
  isMobile,
  leftPanels,
  onLeftPanelsChange,
  rightPanels,
  onRightPanelsChange,
  onSettingsClick,
  onRestore,
  newDocumentId,
  showDynamicIsland,
  onToggleDynamicIsland,
  activeFileSourceId = 'local-default',
  onFileSourceChange,
  headings = [],
  onNavigate,
  editorRef,
  openTabs = [],
  activeTab,
  onTabChange,
  onTabClose,
  onTabsClose,
  onTabRename,
  onSplitRight,
  onReopenLastClosed,
  canReopenLastClosed = false,
  aiProps,
  tipsProps,
  topicsProps,
  tabItems,
  onNewChat,
}: SidebarProps) => {
  // Memoized so child components (FileTree) don't see a new array identity
  // on every render, which would reset their internal expansion state.
  const deletedDocs = useMemo(() => documents.filter(doc => doc.isDeleted), [documents]);

  const activeDocuments = useMemo(() => documents.filter(doc => !doc.isDeleted), [documents]);

  // Expansion depth of the file tree, reported by the tree itself: 0 =
  // fully collapsed, then 1, 2, 3... one folder level at a time up to the
  // deepest nesting level, before wrapping back to collapsed. Sourcing it
  // from the tree (rather than counting clicks) keeps the button honest
  // when folders are opened by hand or restored from persisted state.
  const [expandState, setExpandState] = useState({ level: 0, maxLevel: 0 });
  const handleExpandStateChange = useCallback(
    (next: { level: number; maxLevel: number }) => {
      setExpandState((prev) =>
        prev.level === next.level && prev.maxLevel === next.maxLevel ? prev : next,
      );
    },
    [],
  );
  // Track expand/collapse all state for outline
  const [outlineExpanded, setOutlineExpanded] = useState(true);
  // Ref for file tree
  const treeRef = useRef<DocumentTreeHandle>(null);
  // Ref for outline view
  const outlineRef = useRef<OutlineViewHandle>(null);

  // File sources - memoize to prevent infinite loops
  const [sources] = useState<AnyFileSource[]>(() => getFileSources());
  const [activeSource, setActiveSource] = useState<AnyFileSource | null>(() => {
    const loadedSources = getFileSources();
    return loadedSources.find((s) => s.id === activeFileSourceId) || loadedSources[0] || null;
  });

  // File manager modal state
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);

  // Update active source when activeFileSourceId changes
  useEffect(() => {
    const active = sources.find((s) => s.id === activeFileSourceId);
    if (active && active.id !== activeSource?.id) {
      setActiveSource(active);
    }
  }, [activeFileSourceId, activeSource?.id, sources]);

  const handleSourceSelect = (sourceId: string) => {
    const selected = sources.find((s) => s.id === sourceId);
    if (selected) {
      setActiveSource(selected);
      onFileSourceChange?.(sourceId);
    }
  };

  const handleToggleAllExpanded = () => {
    const tree = treeRef.current;
    if (!tree) return;
    // Cycle from the level the tree is actually at (folders may have been
    // expanded/collapsed by hand since the last click), not from a stale
    // local counter.
    const currentLevel = tree.getExpandLevel?.() ?? expandState.level;
    const maxLevel = tree.getMaxExpandLevel?.() ?? expandState.maxLevel;
    if (maxLevel === 0) return;
    const nextLevel = nextExpandLevel(currentLevel, maxLevel);
    if (nextLevel === 0) {
      tree.cancelExpand?.();
      tree.collapseAll();
    } else {
      tree.expandToLevel(nextLevel);
    }
  };

  const isFullyExpanded =
    expandState.maxLevel > 0 && expandState.level >= expandState.maxLevel;
  const expandToggleLabel = expandToggleLabelFor(expandState.level, expandState.maxLevel);

  const handleToggleOutlineExpanded = () => {
    const newState = !outlineExpanded;
    setOutlineExpanded(newState);
    if (outlineRef.current) {
      if (newState) {
        outlineRef.current.expandAll();
      } else {
        outlineRef.current.collapseAll();
      }
    }
  };

  // Trigger edit mode for newly created documents
  useEffect(() => {
    if (newDocumentId && treeRef.current) {
      const timer = setTimeout(() => {
        const treeElement = treeRef.current as any;
        if (treeElement && typeof treeElement.edit === 'function') {
          treeElement.edit(newDocumentId);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [newDocumentId]);

  const toolbarProps = {
    leftPanels,
    onLeftPanelsChange,
    rightPanels,
    onRightPanelsChange,
    activeId,
    onAdd,
    onSearchFocus,
    onFileManagerOpen: () => setIsFileManagerOpen(true),
    sources,
    activeSource,
    activeFileSourceId,
    onFileSourceChange,
    onSourceSelect: handleSourceSelect,
    allExpanded: isFullyExpanded,
    expandToggleLabel,
    outlineExpanded,
    onToggleAllExpanded: handleToggleAllExpanded,
    onToggleOutlineExpanded: handleToggleOutlineExpanded,
    treeRef,
    outlineRef,
    deletedDocs,
    onRestore,
    onSettingsClick,
    showDynamicIsland,
    onToggleDynamicIsland,
    isMobile,
    openTabs,
    activeTab,
    onTabChange,
    onTabClose,
    documents,
    tabItems,
  };

  const contentProps = {
    onExpandStateChange: handleExpandStateChange,
    panels: leftPanels,
    persistenceKey: 'left',
    activeDocuments,
    activeId,
    activeDocument,
    headings,
    isMobile,
    onSelect,
    onAdd,
    onDelete,
    onDuplicate,
    onMove,
    onManageTags,
    onRename,
    onOpenChange,
    treeRef,
    outlineRef,
    editorRef,
    openTabs,
    activeTab,
    onTabChange,
    onTabClose,
    onTabsClose,
    onTabRename,
    onSplitRight,
    onReopenLastClosed,
    canReopenLastClosed,
    onNavigate,
    aiProps,
    tipsProps,
    topicsProps,
    tabItems,
    onNewChat,
    onFileManagerOpen: () => setIsFileManagerOpen(true),
    deletedDocs,
    onRestore,
  };

  const footerProps = {
    leftPanels,
    onLeftPanelsChange,
    rightPanels,
    onRightPanelsChange,
    isMobile,
    deletedDocs,
    onRestore,
    onSettingsClick,
  };

  // Mobile: render in a drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="left" className={cn('w-80 p-0', SIDEBAR_GLASS_CLASSES)}>
          <aside className="h-full flex flex-col">
            <SidebarToolbar {...toolbarProps} />
            <div className="flex-1 min-h-0 overflow-hidden">
              <SidebarContent {...contentProps} />
            </div>
            <SidebarFooter {...footerProps} />
            <FileManagerModal open={isFileManagerOpen} onOpenChange={setIsFileManagerOpen} documents={activeDocuments} onSelectDocument={onSelect} />
          </aside>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render as sidebar, full height
  return (
    <aside className={cn('h-screen w-full flex flex-col pt-14', SIDEBAR_GLASS_CLASSES)}>
      <SidebarToolbar {...toolbarProps} />
      <div className="flex-1 min-h-0 overflow-hidden">
        <SidebarContent {...contentProps} />
      </div>
      <SidebarFooter {...footerProps} />
      <FileManagerModal open={isFileManagerOpen} onOpenChange={setIsFileManagerOpen} documents={activeDocuments} onSelectDocument={onSelect} />
    </aside>
  );
};
