"use client";

import { useRef, useState } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import {
  generateNodeId,
  normalizePoints,
  filterClosePoints,
  simplifyPoints,
} from "@/lib/whiteboard/konva-utils";
import type { CanvasNode, LayerType } from "@/lib/types/app.types";

interface ToolProps {
  stageRef: React.RefObject<any>;
  userId: string;
}

export function useFreedrawTool({ stageRef, userId }: ToolProps) {
  const { addNode, activeColor, strokeWidth, activeLayer } = useCanvasStore();
  const [drawingNode, setDrawingNode] = useState<CanvasNode | null>(null);
  const drawingNodeRef = useRef<CanvasNode | null>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<number[]>([]);

  const handleMouseDown = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Only draw on left click
    if (e.evt.button !== 0) return;

    isDrawing.current = true;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Viewport transform adjustments
    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    const stageWidth = 1024;
    const stageHeight = 1024;
    const normX = stagePos.x / stageWidth;
    const normY = stagePos.y / stageHeight;

    currentPoints.current = [normX, normY];

    const newNode: CanvasNode = {
      id: generateNodeId(),
      type: "freedraw",
      layer: activeLayer,
      x: 0,
      y: 0,
      points: [normX, normY], // Stored in normalized space live during drawing
      color: activeColor,
      strokeWidth,
      opacity: 0.8,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: Date.now(),
      version: 1,
    };

    drawingNodeRef.current = newNode;
    setDrawingNode(newNode);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !drawingNodeRef.current) return;
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

    // Append new point in normalized space
    const rawPoints = [...currentPoints.current, normEndX, normEndY];
    
    // Apply distance threshold live filtering (0.003 threshold in normalized 0-1 space ≈ 3px)
    const filteredPoints = filterClosePoints(rawPoints, 0.003);
    currentPoints.current = filteredPoints;

    const updated: CanvasNode = {
      ...drawingNodeRef.current,
      points: filteredPoints,
    };
    drawingNodeRef.current = updated;
    setDrawingNode(updated);
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || !drawingNodeRef.current) return;
    isDrawing.current = false;

    const stage = stageRef.current;
    if (!stage) {
      setDrawingNode(null);
      drawingNodeRef.current = null;
      return;
    }

    const points = currentPoints.current;
    if (points.length < 4) {
      setDrawingNode(null);
      drawingNodeRef.current = null;
      return;
    }

    // Points are already stored in normalized 0-1 coordinates during drawing
    // Apply Douglas-Peucker point simplification on completion
    // 0.002 on a 1024px canvas ≈ 2px tolerance — imperceptible
    const simplified = simplifyPoints(points, 0.002);

    const finalNode: CanvasNode = {
      ...drawingNodeRef.current,
      points: simplified,
      opacity: 1,
      updatedAt: Date.now(),
    };

    addNode(finalNode);
    setDrawingNode(null);
    drawingNodeRef.current = null;
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    previewNode: drawingNode,
  };
}
