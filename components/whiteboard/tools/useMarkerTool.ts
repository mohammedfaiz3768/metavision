"use client";

import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { generateNodeId, screenToNormalized } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";

interface ToolProps {
  stageRef: React.RefObject<any>;
  userId: string;
}

export function useMarkerTool({ stageRef, userId }: ToolProps) {
  const { addNode, activeMarkerType, activeLayer, setTool, setActiveMarker } = useCanvasStore();

  const handleStageClick = (e: any) => {
    // Only spawn marker if we clicked on the background (stage or map image)
    // Existing drawing nodes have a custom id() set
    const isDrawingNode = e.target !== stageRef.current && e.target.id() && e.target.id() !== "";
    if (isDrawingNode) return;
    if (!activeMarkerType) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Viewport transform adjustments
    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    // Convert coordinates to normalized 0-1 coordinates
    const normPos = screenToNormalized(stagePos.x, stagePos.y, 1024, 1024);

    const newNode: CanvasNode = {
      id: generateNodeId(),
      type: "marker",
      layer: activeLayer,
      x: normPos.x,
      y: normPos.y,
      markerType: activeMarkerType,
      color: "#ffffff", // marker color is default, using emoji as glyph
      strokeWidth: 2,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: Date.now(),
      version: 1,
    };

    addNode(newNode);
  };

  return {
    handleStageClick,
  };
}
