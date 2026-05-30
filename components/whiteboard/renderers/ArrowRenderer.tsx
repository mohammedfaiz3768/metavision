"use client";

import { Arrow } from "react-konva";
import { denormalizePoints, normalizedToScreen } from "@/lib/whiteboard/konva-utils";
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

export function ArrowRenderer({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
}: RendererProps) {
  if (!node.points) return null;

  const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);
  const screenPoints = denormalizePoints(node.points, stageWidth, stageHeight);

  return (
    <Arrow
      id={node.id}
      x={screenPos.x}
      y={screenPos.y}
      points={screenPoints}
      pointerLength={node.pointerLength ?? 10}
      pointerWidth={node.pointerWidth ?? 8}
      fill={node.color}
      stroke={node.color}
      strokeWidth={node.strokeWidth}
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
