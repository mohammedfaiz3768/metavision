"use client";

import { Rect, Circle } from "react-konva";
import { normalizedToScreen } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";

interface RendererProps {
  node: CanvasNode;
  stageWidth: number;
  stageHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  draggable: boolean;
  onDragEnd: (x: number, y: number) => void;
}

export function ShapeRenderer({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
}: RendererProps) {
  const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);

  if (node.type === "circle") {
    const screenRadius = (node.radius ?? 0.05) * stageWidth;
    return (
      <Circle
        id={node.id}
        x={screenPos.x}
        y={screenPos.y}
        radius={screenRadius}
        stroke={node.color}
        strokeWidth={node.strokeWidth}
        fill="transparent"
        opacity={node.opacity ?? 1}
        draggable={draggable}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDragEnd={(e) => {
          const xNorm = e.target.x() / stageWidth;
          const yNorm = e.target.y() / stageHeight;
          onDragEnd(xNorm, yNorm);
        }}
      />
    );
  }

  if (node.type === "rect") {
    const screenWidth = (node.width ?? 0.1) * stageWidth;
    const screenHeight = (node.height ?? 0.1) * stageHeight;
    return (
      <Rect
        id={node.id}
        x={screenPos.x}
        y={screenPos.y}
        width={screenWidth}
        height={screenHeight}
        stroke={node.color}
        strokeWidth={node.strokeWidth}
        fill="transparent"
        opacity={node.opacity ?? 1}
        draggable={draggable}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDragEnd={(e) => {
          const xNorm = e.target.x() / stageWidth;
          const yNorm = e.target.y() / stageHeight;
          onDragEnd(xNorm, yNorm);
        }}
      />
    );
  }

  return null;
}
