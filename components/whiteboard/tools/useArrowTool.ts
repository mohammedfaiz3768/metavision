"use client";

import { useRef, useState } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { generateNodeId, normalizePoints } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";

interface ToolProps {
  stageRef: React.RefObject<any>;
  userId: string;
}

export function useArrowTool({ stageRef, userId }: ToolProps) {
  const { addNode, activeColor, strokeWidth, activeLayer } = useCanvasStore();
  const [drawingNode, setDrawingNode] = useState<CanvasNode | null>(null);
  const drawingNodeRef = useRef<CanvasNode | null>(null);
  const isDrawing = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (e.evt.button !== 0) return;

    isDrawing.current = true;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    const stageWidth = 1024;
    const stageHeight = 1024;

    const normX = stagePos.x / stageWidth;
    const normY = stagePos.y / stageHeight;

    startPos.current = { x: normX, y: normY };

    const newNode: CanvasNode = {
      id: generateNodeId(),
      type: "arrow",
      layer: activeLayer,
      x: 0,
      y: 0,
      points: [normX, normY, normX, normY],
      color: activeColor,
      strokeWidth,
      opacity: 0.8,
      pointerLength: 12,
      pointerWidth: 10,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: Date.now(),
      version: 1,
    };

    drawingNodeRef.current = newNode;
    setDrawingNode(newNode);
  };

  const handleMouseMove = (e: any) => {
    const start = startPos.current;
    if (!isDrawing.current || !drawingNodeRef.current || !start) return;
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    const stageWidth = 1024;
    const stageHeight = 1024;

    const normEndX = stagePos.x / stageWidth;
    const normEndY = stagePos.y / stageHeight;

    const updated: CanvasNode = {
      ...drawingNodeRef.current,
      points: [start.x, start.y, normEndX, normEndY],
    };
    drawingNodeRef.current = updated;
    setDrawingNode(updated);
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || !drawingNodeRef.current || !startPos.current) return;
    isDrawing.current = false;

    const stage = stageRef.current;
    if (!stage) {
      setDrawingNode(null);
      drawingNodeRef.current = null;
      return;
    }

    const points = drawingNodeRef.current.points;
    if (!points || points.length < 4) {
      setDrawingNode(null);
      drawingNodeRef.current = null;
      return;
    }

    const finalNode: CanvasNode = {
      ...drawingNodeRef.current,
      opacity: 1,
      updatedAt: Date.now(),
    };

    addNode(finalNode);
    setDrawingNode(null);
    drawingNodeRef.current = null;
    startPos.current = null;
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    previewNode: drawingNode,
  };
}
