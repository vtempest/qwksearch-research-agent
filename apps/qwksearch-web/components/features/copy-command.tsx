"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A shell one-liner with a copy button. Long commands wrap rather than scroll,
 * so nothing is hidden on a phone, and the button reports what happened —
 * `navigator.clipboard` is unavailable over plain HTTP and in some embedded
 * webviews, and a button that silently did nothing is worse than one that says
 * so.
 */
export function CopyCommand({
  command,
  className,
  label = "Copy command",
}: {
  command: string;
  className?: string;
  /** Accessible name for the button, when the page has more than one. */
  label?: string;
}) {
  const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");

  React.useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className={cn("text-left", className)}>
      <div className="bg-muted/60 flex items-start gap-3 rounded-xl border p-3">
        <code className="min-w-0 flex-1 font-mono text-xs leading-relaxed break-all sm:text-sm">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={label}
          title={label}
          className="text-muted-foreground hover:text-foreground hover:bg-background focus-visible:ring-ring/50 shrink-0 rounded-lg border p-2 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        >
          {state === "copied" ? (
            <Check className="size-4 text-emerald-500" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>
      <p aria-live="polite" className="text-muted-foreground mt-2 text-xs">
        {state === "copied"
          ? "Copied to clipboard."
          : state === "failed"
            ? "Could not reach the clipboard — select the command above and copy it manually."
            : " "}
      </p>
    </div>
  );
}
