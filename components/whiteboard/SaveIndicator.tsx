"use client";

import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { Cloud, CloudLightning, CloudOff, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SaveIndicator() {
  const { saveStatus, hasUnsavedChanges } = useCanvasStore();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-border text-xs font-medium text-foreground select-none backdrop-blur-sm">
      {saveStatus === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
          <span className="text-muted-foreground">Uploading blueprints...</span>
        </>
      )}

      {saveStatus === "saved" && !hasUnsavedChanges && (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-accent animate-bounce" />
          <span className="text-accent">Blueprints synced</span>
        </>
      )}

      {saveStatus === "idle" && !hasUnsavedChanges && (
        <>
          <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Ready</span>
        </>
      )}

      {hasUnsavedChanges && saveStatus !== "saving" && (
        <>
          <Cloud className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="text-primary font-medium">Unsaved operations</span>
        </>
      )}

      {saveStatus === "error" && (
        <>
          <CloudLightning className="h-3.5 w-3.5 text-destructive animate-bounce" />
          <span className="text-destructive font-semibold">Upload failed</span>
        </>
      )}

      {saveStatus === "offline" && (
        <>
          <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Offline mode</span>
        </>
      )}
    </div>
  );
}
