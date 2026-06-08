"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";

export function useKeyboardShortcuts() {
  const { undo, redo, deleteSelectedNodes, activeTool } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in a textarea or input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Check key combos
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Ctrl + Z: Undo
      if (isCtrl && !isShift && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }

      // Ctrl + Shift + Z or Ctrl + Y: Redo
      if (
        (isCtrl && isShift && e.key.toLowerCase() === "z") ||
        (isCtrl && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        redo();
      }

      // Escape: Cancel logo placement or reset tool
      if (e.key === "Escape") {
        const store = useCanvasStore.getState();
        if (store.activeTool === "logo-place") {
          e.preventDefault();
          store.setPendingLogo(null);
          store.setTool("select");
        }
      }

      // Delete or Backspace: Delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelectedNodes();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo, deleteSelectedNodes]);
}
