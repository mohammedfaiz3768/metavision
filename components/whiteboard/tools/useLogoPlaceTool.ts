"use client";

import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { generateNodeId, screenToNormalized } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";

interface ToolProps {
  stageRef: React.RefObject<any>;
  userId: string;
}

export function useLogoPlaceTool({ stageRef, userId }: ToolProps) {
  const { addNode, pendingLogo, activeLayer, setPendingLogo, setTool } = useCanvasStore();

  const handleStageClick = (e: any) => {
    // Only place logo if we clicked on the background (stage or map image)
    const isDrawingNode = e.target !== stageRef.current && e.target.id() && e.target.id() !== "";
    if (isDrawingNode) return;
    if (!pendingLogo) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Viewport transform adjustments
    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    // Convert coordinates to normalized 0-1 coordinates
    const normPos = screenToNormalized(stagePos.x, stagePos.y, 1024, 1024);

    const activeColor = useCanvasStore.getState().activeColor || "#ffffff";

    const newNode: CanvasNode = {
      id: generateNodeId(),
      type: "logo-marker" as any,
      layer: activeLayer,
      x: normPos.x,
      y: normPos.y,
      radius: 0.035,
      markerType: pendingLogo.url,
      text: pendingLogo.name,
      isCircular: pendingLogo.isCircular,
      color: activeColor,
      strokeWidth: 1,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: Date.now(),
      version: 1,
    };

    addNode(newNode);

    // Clear pending logo and reset tool to select
    setPendingLogo(null);
    setTool("select");
  };

  return {
    handleStageClick,
  };
}
