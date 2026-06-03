"use client";

import { Rect, Ellipse } from "react-konva";
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
  listening?: boolean;
}

function getFillColor(hexColor: string, opacity: number) {
  if (!hexColor || !hexColor.startsWith("#")) return hexColor;
  
  let normalized = hexColor;
  if (hexColor.length === 4) {
    normalized = "#" + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2] + hexColor[3] + hexColor[3];
  }
  
  const alphaValue = Math.max(0, Math.min(255, Math.round(opacity * 255)));
  const alphaHex = alphaValue.toString(16).padStart(2, "0");
  
  return normalized.substring(0, 7) + alphaHex;
}

export function ShapeRenderer({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
  listening = true,
}: RendererProps) {
  const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);

  if (node.type === "circle") {
    const rx = (node.radiusX ?? node.radius ?? 0.05) * stageWidth;
    const ry = (node.radiusY ?? node.radius ?? 0.05) * stageHeight;
    return (
      <Ellipse
        id={node.id}
        x={screenPos.x}
        y={screenPos.y}
        radiusX={rx}
        radiusY={ry}
        rotation={node.rotation ?? 0}
        stroke={node.color}
        strokeWidth={node.strokeWidth}
        fill={node.isFilled ? getFillColor(node.color, node.fillOpacity ?? 0.35) : "transparent"}
        opacity={node.opacity ?? 1}
        draggable={draggable}
        listening={listening}
        onClick={(e) => {
          if (listening === false) return;
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          if (listening === false) return;
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
        rotation={node.rotation ?? 0}
        stroke={node.color}
        strokeWidth={node.strokeWidth}
        fill={node.isFilled ? getFillColor(node.color, node.fillOpacity ?? 0.35) : "transparent"}
        opacity={node.opacity ?? 1}
        draggable={draggable}
        listening={listening}
        onClick={(e) => {
          if (listening === false) return;
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          if (listening === false) return;
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
