"use client";

import { useRef, useState } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { generateNodeId, screenToNormalized } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode, ToolType } from "@/lib/types/app.types";

interface ToolProps {
  stageRef: React.RefObject<any>;
  userId: string;
}

export function useShapeTool({ stageRef, userId }: ToolProps) {
  const { addNode, activeColor, strokeWidth, activeLayer, activeTool } = useCanvasStore();
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
    const type = activeTool === "circle" ? "circle" : "rect";

    const newNode: CanvasNode = {
      id: generateNodeId(),
      type,
      layer: activeLayer,
      x: normX,
      y: normY,
      color: activeColor,
      strokeWidth,
      opacity: 0.8,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: Date.now(),
      version: 1,
    };

    if (type === "circle") {
      newNode.radius = 0;
    } else {
      newNode.width = 0;
      newNode.height = 0;
    }

    drawingNodeRef.current = newNode;
    setDrawingNode(newNode);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !drawingNodeRef.current || !startPos.current) return;
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

    const startX = startPos.current.x;
    const startY = startPos.current.y;

    let updated: CanvasNode;
    if (drawingNodeRef.current.type === "circle") {
      const radius = Math.sqrt(
        Math.pow(normEndX - startX, 2) + Math.pow(normEndY - startY, 2)
      );
      updated = {
        ...drawingNodeRef.current,
        radius,
      };
    } else {
      const width = normEndX - startX;
      const height = normEndY - startY;

      updated = {
        ...drawingNodeRef.current,
        x: width < 0 ? normEndX : startX,
        y: height < 0 ? normEndY : startY,
        width: Math.abs(width),
        height: Math.abs(height),
      };
    }

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

    const finalNode: CanvasNode = {
      ...drawingNodeRef.current,
      opacity: 1,
      updatedAt: Date.now(),
    };

    if (finalNode.type === "circle") {
      if ((finalNode.radius ?? 0) < 0.001) {
        setDrawingNode(null);
        drawingNodeRef.current = null;
        return;
      }
    } else {
      if ((finalNode.width ?? 0) < 0.001 || (finalNode.height ?? 0) < 0.001) {
        setDrawingNode(null);
        drawingNodeRef.current = null;
        return;
      }
    }

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
