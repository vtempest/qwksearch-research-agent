'use client'

import * as React from 'react'
import { GripVerticalIcon } from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'

import { cn } from '../../lib/utils'

function ResizablePanelGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn(
        'flex h-full w-full data-[panel-group-direction=vertical]:flex-col',
        className,
      )}
      {...props}
    >
      {children}
    </Group>
  )
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle = true,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        // base layout — horizontal by default, vertical when library sets the attribute
        'group relative flex items-center justify-center',
        'w-px cursor-col-resize data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize',
        // hover / active zone (wider than the 1px line so it's easy to grab)
        'after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2',
        'data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:top-1/2 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0',
        'bg-border/50 transition-colors hover:bg-primary/40 active:bg-primary/60',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            'relative z-10 flex items-center justify-center',
            'h-7 w-4 rounded-sm border border-border bg-background shadow-sm',
            'transition-all duration-150',
            'group-hover:border-primary/60 group-hover:shadow-md',
            'group-active:scale-95 group-active:bg-accent',
            // rotate grip icon for vertical orientation
            'group-data-[panel-group-direction=vertical]:h-4 group-data-[panel-group-direction=vertical]:w-7',
          )}
        >
          <GripVerticalIcon
            className={cn(
              'size-3 text-muted-foreground transition-colors group-hover:text-foreground',
              'group-data-[panel-group-direction=vertical]:rotate-90',
            )}
          />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
