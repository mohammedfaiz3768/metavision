"use client";

import { Line } from "react-konva";
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

export function FreedrawRenderer({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
}: RendererProps) {
  if (!node.points) return null;

  // Denormalize coordinate values
  const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);
  const screenPoints = denormalizePoints(node.points, stageWidth, stageHeight);

  return (
    <Line
      id={node.id}
      x={screenPos.x}
      y={screenPos.y}
      points={screenPoints}
      stroke={node.color}
      strokeWidth={node.strokeWidth}
      opacity={node.opacity ?? 1}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
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
