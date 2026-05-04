"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { UserCircle2, Moon, Sun, Palette, Settings } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import SettingsDialogue from "@/components/Settings/SettingsDialogue"
import { useTheme } from "next-themes"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import iconRead from '@/components/icons/icon-read.svg'
import iconNews from '@/components/icons/icon-news-title.svg'
import iconSettings from '@/components/icons/icon-configure.svg'

const themeNames = [
  "modern-minimal",
  "elegant-luxury",
  "cyberpunk",
  "twitter",
  "mocha-mousse",
  "amethyst-haze",
  "notebook",
  "doom-64",
  "catppuccin",
  "graphite",
  "perpetuity",
  "kodama-grove",
  "cosmic-night",
  "tangerine",
  "nature",
  "bold-tech",
  "amber-minimal",
  "supabase",
  "neo-brutalism",
  "quantum-rose",
  "solar-dusk",
  "bubblegum",
  "pink-lemonade",
  "claymorphism",
  "pastel-dreams"
]

const themeColors: Record<string, { primary: string; secondary: string }> = {
  "modern-minimal": { primary: "#3b82f6", secondary: "#f3f4f6" },
  "elegant-luxury": { primary: "#9b2c2c", secondary: "#fdf2d6" },
  "cyberpunk": { primary: "#ff00c8", secondary: "#f0f0ff" },
  "twitter": { primary: "#1e9df1", secondary: "#0f1419" },
  "mocha-mousse": { primary: "#A37764", secondary: "#BAAB92" },
  "bubblegum": { primary: "#d04f99", secondary: "#8acfd1" },
  "amethyst-haze": { primary: "#8a79ab", secondary: "#dfd9ec" },
  "pink-lemonade": { primary: "#a84370", secondary: "#f1c4e6" },
  "notebook": { primary: "#606060", secondary: "#dedede" },
  "doom-64": { primary: "#b71c1c", secondary: "#556b2f" },
  "catppuccin": { primary: "#8839ef", secondary: "#ccd0da" },
  "graphite": { primary: "#606060", secondary: "#e0e0e0" },
  "perpetuity": { primary: "#06858e", secondary: "#d9eaea" },
  "kodama-grove": { primary: "#8d9d4f", secondary: "#decea0" },
  "cosmic-night": { primary: "#6e56cf", secondary: "#e4dfff" },
  "tangerine": { primary: "#e05d38", secondary: "#f3f4f6" },
  "quantum-rose": { primary: "#e6067a", secondary: "#ffd6ff" },
  "nature": { primary: "#2e7d32", secondary: "#e8f5e9" },
  "bold-tech": { primary: "#8b5cf6", secondary: "#f3f0ff" },
  "amber-minimal": { primary: "#f59e0b", secondary: "#f3f4f6" },
  "supabase": { primary: "#72e3ad", secondary: "#fdfdfd" },
  "neo-brutalism": { primary: "#ff3333", secondary: "#ffff00" },
  "solar-dusk": { primary: "#B45309", secondary: "#E4C090" },
  "claymorphism": { primary: "#6366f1", secondary: "#d6d3d1" },
  "pastel-dreams": { primary: "#a78bfa", secondary: "#e9d8fd" }
}

const formatThemeName = (name: string) => {
  return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function useThemeState() {
  const { theme, setTheme } = useTheme()
  const [colorTheme, setColorTheme] = useState("modern-minimal")
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("color-theme")
    if (saved && themeNames.includes(saved)) {
      setColorTheme(saved)
    }
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    localStorage.setItem("color-theme", newTheme)
    document.cookie = `color-theme=${newTheme}; path=/; max-age=31536000`

    // Remove all theme classes
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    // Add new theme class
    document.documentElement.classList.add(`theme-${newTheme}`)

    setPreviewTheme(null)
  }

  const handleThemePreview = (themeName: string) => {
    setPreviewTheme(themeName)
    // Remove all theme classes
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    // Add preview theme class
    document.documentElement.classList.add(`theme-${themeName}`)
  }

  const handlePreviewEnd = () => {
    if (previewTheme) {
      // Restore the actual selected theme
      themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
      document.documentElement.classList.add(`theme-${colorTheme}`)
      setPreviewTheme(null)
    }
  }

  const toggleLightDark = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return {
    theme,
    colorTheme,
    isDark: theme === "dark",
    mounted,
    handleThemeChange,
    handleThemePreview,
    handlePreviewEnd,
    toggleLightDark,
  }
}

const NAV_ITEMS = [
  { href: "/", label: "Research", icon: "/apple-touch-icon.png" },
  { href: "/docs", label: "Docs", icon: iconRead },
  // { href: "/news", label: "News", icon: iconNews },
]

function SettingsMenu({ side, onOpenSettings }: { side: "bottom" | "top"; onOpenSettings: () => void }) {
  const themeState = useThemeState()

  return (
    <DropdownMenuContent side={side} align="end" className="w-48">
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); themeState.toggleLightDark() }}>
        {themeState.isDark ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
        {themeState.isDark ? "Dark Mode" : "Light Mode"}
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Palette className="mr-2 h-4 w-4" />
          Theme
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-56 max-h-[min(400px,70vh)] overflow-y-auto" collisionPadding={8} avoidCollisions>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); themeState.toggleLightDark() }}>
            {themeState.isDark ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
            {themeState.isDark ? "Switch to Light" : "Switch to Dark"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {themeNames.map((name) => {
            const colors = themeColors[name]
            return (
              <DropdownMenuItem
                key={name}
                onClick={() => themeState.handleThemeChange(name)}
                onMouseEnter={() => themeState.handleThemePreview(name)}
                onMouseLeave={() => themeState.handlePreviewEnd()}
                className={cn("cursor-pointer", themeState.colorTheme === name && "bg-accent")}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: colors.primary }} />
                      <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: colors.secondary }} />
                    </div>
                    <span>{formatThemeName(name)}</span>
                  </div>
                  {themeState.colorTheme === name && <span className="text-xs">✓</span>}
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onOpenSettings}>
        <Settings className="mr-2 h-4 w-4" />
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem>
        <UserCircle2 className="mr-2 h-4 w-4" />
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem>
        <span className="text-muted-foreground">Sign Out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

/**
 * Renders a single dock instance with all items inline as direct children.
 * This ensures Dock's cloneElement passes mousex/magnification/distance properly.
 */
function DockInstance({
  dockClassName,
  side,
  allItems,
}: {
  dockClassName: string
  side: "bottom" | "top"
  allItems: { key: string; label: string; icon: any; active: boolean; onClick: () => void }[]
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const isMobile = useIsMobile()
  const router = useRouter()

  const handleOpenSettings = () => {
    if (isMobile) {
      router.push('/settings')
    } else {
      setIsSettingsOpen(true)
    }
  }

  return (
    <>
      <DropdownMenu>
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
          <DropdownMenuTrigger asChild>
            <DockItem className="flex flex-col items-center gap-0.5 rounded-full transition-colors cursor-pointer bg-gray-200 dark:bg-neutral-800">
              <DockLabel>Settings</DockLabel>
              <DockIcon>
                <Image src={iconSettings} alt="settings" width={24} height={24} className="w-full h-full" />
              </DockIcon>
            </DockItem>
          </DropdownMenuTrigger>
        </Dock>
        <SettingsMenu side={side} onOpenSettings={handleOpenSettings} />
      </DropdownMenu>
      <AnimatePresence>
        {isSettingsOpen && <SettingsDialogue isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />}
      </AnimatePresence>
    </>
  )
}

/**
 * Unified navigation dock.
 * Desktop (md+): fixed top-left corner, compact width.
 * Mobile: fixed bottom, full-width centered, does not overlap content.
 */
export function CategoryDock() {
  const pathname = usePathname()
  const router = useRouter()

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

  // Keyboard shortcuts: Alt+1 through Alt+3 for navigation items
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

  return (
    <>
      {/* Desktop: top-left corner */}
      <div className="hidden md:block fixed top-0 left-2 z-50">
        <DockInstance
          dockClassName="h-[52px] shrink-0 !mt-0 !mx-0"
          side="bottom"
          allItems={allItems}
        />
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <DockInstance
          dockClassName="h-[52px] shrink-0 !mt-0 mx-auto w-max mb-2 !gap-1 !p-1"
          side="top"
          allItems={allItems}
        />
      </div>
    </>
  )
}
