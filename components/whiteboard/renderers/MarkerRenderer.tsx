"use client";

import { Group, Circle, Text } from "react-konva";
import { normalizedToScreen } from "@/lib/whiteboard/konva-utils";
import { getMarker } from "@/lib/whiteboard/tactical-markers";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
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

export function MarkerRenderer({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
}: RendererProps) {
  const { viewport } = useCanvasStore();
  const scale = viewport.scaleX || 1;

  const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);
  const markerDef = getMarker(node.markerType ?? "");
  const emoji = markerDef?.icon ?? "📍";

  // Base dimensions scaled inversely to viewport scale factor
  const baseFontSize = 16;
  const baseRadius = 12;
  const baseStrokeWidth = 1.5;

  const scaledFontSize = baseFontSize / scale;
  const scaledRadius = baseRadius / scale;
  const scaledStrokeWidth = baseStrokeWidth / scale;
  const offset = scaledFontSize / 2;

  return (
    <Group
      id={node.id}
      x={screenPos.x}
      y={screenPos.y}
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
    >
      {/* Background Outer Ring (Selected State Highlight) */}
      <Circle
        radius={scaledRadius}
        fill={isSelected ? "hsl(210, 100%, 60%, 0.25)" : "transparent"}
        stroke={isSelected ? "hsl(210, 100%, 60%)" : "transparent"}
        strokeWidth={scaledStrokeWidth}
      />

      {/* Emoji Text */}
      <Text
        text={emoji}
        fontSize={scaledFontSize}
        x={-offset}
        y={-offset}
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
}
