"use client"

import { useEffect } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { ThemeDropdown } from "shadcn-theme-menu"
import { cn } from "@/lib/utils"
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock"
import iconRead from '@/components/icons/icon-read.svg'
import iconSettings from '@/components/icons/icon-configure.svg'

const NAV_ITEMS = [
  { href: "/", label: "Research", icon: "/apple-touch-icon.png" },
  { href: "/docs", label: "Docs", icon: iconRead },
]

function DockInstance({
  dockClassName,
  allItems,
}: {
  dockClassName: string
  allItems: { key: string; label: string; icon: any; active: boolean; onClick: () => void }[]
}) {
  const router = useRouter()

  return (
    <div className="flex items-center">
      <Dock direction="middle" className={dockClassName}>
        {allItems.map(({ key, label, icon, active, onClick }) => (
          <DockItem
            key={key}
            onClick={onClick}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-full transition-colors cursor-pointer",
              active
                ? "bg-primary/20 ring-2 ring-primary"
                : "bg-gray-200 dark:bg-neutral-800",
            )}
          >
            <DockLabel>{label}</DockLabel>
            <DockIcon>
              <Image src={icon} alt={label} width={24} height={24} className="w-full h-full" />
            </DockIcon>
          </DockItem>
        ))}
        <DockItem
          onClick={() => router.push('/settings')}
          className="flex flex-col items-center gap-0.5 rounded-full transition-colors cursor-pointer bg-gray-200 dark:bg-neutral-800"
        >
          <DockLabel>Settings</DockLabel>
          <DockIcon>
            <Image src={iconSettings} alt="settings" width={24} height={24} className="w-full h-full" />
          </DockIcon>
        </DockItem>
      </Dock>
      <ThemeDropdown />
    </div>
  )
}

export function CategoryDock() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const numKey = parseInt(event.key, 10)
        if (numKey >= 1 && numKey <= NAV_ITEMS.length) {
          event.preventDefault()
          router.push(NAV_ITEMS[numKey - 1].href)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  const allItems = NAV_ITEMS.map(({ href, label, icon }) => ({
    key: href,
    label,
    icon,
    active:
      href === '/'
        ? pathname === '/' || pathname.startsWith('/c')
        : pathname.startsWith(href),
    onClick: () => router.push(href),
  }))

  return (
    <>
      {/* Desktop: top-left corner */}
      <div className="hidden md:block fixed top-0 left-2 z-50">
        <DockInstance
          dockClassName="h-[52px] shrink-0 !mt-0 !mx-0"
          allItems={allItems}
        />
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <DockInstance
          dockClassName="h-[52px] shrink-0 !mt-0 mx-auto w-max mb-2 !gap-1 !p-1"
          allItems={allItems}
        />
      </div>
    </>
  )
}