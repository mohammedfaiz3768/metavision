"use client";

import { useRef, useState } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import {
  generateNodeId,
  filterClosePoints,
  simplifyPoints,
} from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";

interface ToolProps {
  stageRef: React.RefObject<any>;
  userId: string;
}

export function useRotationTool({ stageRef, userId }: ToolProps) {
  const { addNode, activeColor, strokeWidth, activeLayer } = useCanvasStore();
  const [points, setPoints] = useState<number[]>([]);
  const [tempPoint, setTempPoint] = useState<number[] | null>(null);

  const handleMouseDown = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Only draw on left click
    if (e.evt.button !== 0) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Viewport transform adjustments
    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    const stageWidth = 1024;
    const stageHeight = 1024;
    const normX = stagePos.x / stageWidth;
    const normY = stagePos.y / stageHeight;

    setPoints((prev) => {
      if (prev.length === 0) {
        return [normX, normY];
      } else {
        // Prevent duplicate consecutive points
        const lastX = prev[prev.length - 2];
        const lastY = prev[prev.length - 1];
        if (Math.abs(lastX - normX) < 0.001 && Math.abs(lastY - normY) < 0.001) {
          return prev;
        }
        return [...prev, normX, normY];
      }
    });
  };

  const handleMouseMove = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    const stageWidth = 1024;
    const stageHeight = 1024;
    const normX = stagePos.x / stageWidth;
    const normY = stagePos.y / stageHeight;

    setTempPoint([normX, normY]);
  };

  const handleMouseUp = () => {
    // Point-by-point mode does not complete path on mouse up
  };

  const completePath = () => {
    if (points.length < 4) {
      cancelPath();
      return;
    }

    const newNode: CanvasNode = {
      id: generateNodeId(),
      type: "rotation",
      layer: activeLayer,
      x: 0,
      y: 0,
      points: points,
      color: activeColor,
      strokeWidth: strokeWidth || 5,
      opacity: 0.92,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: Date.now(),
      version: 1,
    };

    addNode(newNode);
    cancelPath();
  };

  const cancelPath = () => {
    setPoints([]);
    setTempPoint(null);
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    points,
    tempPoint,
    completePath,
    cancelPath,
    previewNode: null,
  };
}
