'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type MainViewMode = 'research' | 'docs'

type MainViewContextValue = {
  activeView: MainViewMode
  setActiveView: (view: MainViewMode) => void
  /**
   * Whether the REASON document surface is mounted at all. False in the
   * chat-only build (`research-agent-ui`), where the editor and its sidebar
   * are not bundled — chrome that would switch to documents hides itself
   * rather than offering a view nothing can render.
   */
  docsEnabled: boolean
  toggleToDocs: () => void
  toggleToResearch: () => void
  /** Bumped whenever the files sidebar should be opened (e.g. from a dock icon). */
  filesSidebarRequestId: number
  requestFilesSidebar: () => void
}

const MainViewContext = createContext<MainViewContextValue | null>(null)

const STORAGE_KEY = 'qwksearch-main-view'

export function MainViewProvider({
  children,
  docsEnabled = true,
}: {
  children: React.ReactNode
  /** Set false when the host mounts the chat surface without the REASON editor. */
  docsEnabled?: boolean
}) {
  const [activeView, setActiveViewState] = useState<MainViewMode>('research')
  const [filesSidebarRequestId, setFilesSidebarRequestId] = useState(0)

  // Without the editor there is only one view, so every request to switch
  // resolves to 'research' — callers keep working unchanged instead of
  // needing to know which build they are running in.
  const setActiveView = useCallback(
    (view: MainViewMode) => setActiveViewState(docsEnabled ? view : 'research'),
    [docsEnabled],
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !docsEnabled) return

    const saved = window.localStorage.getItem(STORAGE_KEY) as MainViewMode | null
    if (saved === 'research' || saved === 'docs') {
      setActiveViewState(saved)
    }
  }, [docsEnabled])

  useEffect(() => {
    if (typeof window !== 'undefined' && docsEnabled) {
      window.localStorage.setItem(STORAGE_KEY, activeView)
    }
  }, [activeView, docsEnabled])

  const value = useMemo(
    () => ({
      activeView,
      setActiveView,
      docsEnabled,
      toggleToDocs: () => setActiveView('docs'),
      toggleToResearch: () => setActiveView('research'),
      filesSidebarRequestId,
      requestFilesSidebar: () => setFilesSidebarRequestId((id) => id + 1),
    }),
    [activeView, setActiveView, docsEnabled, filesSidebarRequestId],
  )

  return <MainViewContext.Provider value={value}>{children}</MainViewContext.Provider>
}

export function useMainView() {
  const context = useContext(MainViewContext)

  if (!context) {
    throw new Error('useMainView must be used within a MainViewProvider')
  }

  return context
}
