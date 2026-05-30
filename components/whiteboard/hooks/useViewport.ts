"use client";

import type Konva from "konva";
import type { Viewport } from "@/lib/types/app.types";

interface UseViewportProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  viewport: Viewport;
  setViewport: (viewport: Partial<Viewport>) => void;
  activeTool: string;
  onUserInteract?: () => void;
}

export function useViewport({
  stageRef,
  viewport,
  setViewport,
  activeTool,
  onUserInteract,
}: UseViewportProps) {
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    if (onUserInteract) onUserInteract();

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Zoom speed
    const scaleBy = 1.1;
    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Constrain scale between 0.2x and 8x
    newScale = Math.max(0.2, Math.min(8, newScale));

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setViewport({
      x: newPos.x,
      y: newPos.y,
      scaleX: newScale,
      scaleY: newScale,
    });
  };

  const handleDragEnd = (e: any) => {
    // Only capture stage drag events, not node drag events
    if (e.target !== stageRef.current) return;
    
    const stage = stageRef.current;
    if (!stage) return;

    if (onUserInteract) onUserInteract();

    setViewport({
      x: stage.x(),
      y: stage.y(),
    });
  };

  // Determine if the stage itself is draggable.
  // Stage is draggable if the user holds Space, or if the active tool is 'select' and they drag empty canvas.
  // In Konva, we can make the stage draggable only when activeTool is hand, or Space key is held down.
  // Let's configure draggable true/false in the Stage element itself based on these states.

  return {
    handleWheel,
    handleDragEnd,
  };
}
