"use client";

import { Text } from "react-konva";
import { normalizedToScreen } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";

interface TextRendererProps {
  node: CanvasNode;
  stageWidth: number;
  stageHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  draggable: boolean;
  onDragEnd: (x: number, y: number) => void;
  onDblClick: (e: any) => void;
  isEditing: boolean;
  readOnly?: boolean;
  listening?: boolean;
}

export function TextRenderer({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
  onDblClick,
  isEditing,
  readOnly = false,
  listening = true,
}: TextRendererProps) {
  const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);
  const fontSize = node.fontSize ?? 16;
  const linkedUrl = (node as any).linkedUrl;

  return (
    <Text
      id={node.id}
      x={screenPos.x}
      y={screenPos.y}
      text={node.text ?? "Double click to edit"}
      fontSize={fontSize}
      fill={linkedUrl ? "#22d3ee" : node.color} // Cyan color for clickable link nodes
      fontFamily="sans-serif"
      fontStyle="bold"
      textDecoration={linkedUrl ? "underline" : "none"} // Underline clickable link nodes
      opacity={isEditing ? 0 : (node.opacity ?? 1)}
      draggable={draggable}
      listening={listening}
      onClick={(e) => {
        if (listening === false) return;
        e.cancelBubble = true;
        if (linkedUrl) {
          if (readOnly) {
            window.open(linkedUrl, "_blank");
          } else {
            if (isSelected) {
              window.open(linkedUrl, "_blank");
            } else {
              onSelect();
            }
          }
        } else {
          onSelect();
        }
      }}
      onTap={(e) => {
        if (listening === false) return;
        e.cancelBubble = true;
        if (linkedUrl) {
          if (readOnly) {
            window.open(linkedUrl, "_blank");
          } else {
            if (isSelected) {
              window.open(linkedUrl, "_blank");
            } else {
              onSelect();
            }
          }
        } else {
          onSelect();
        }
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onDblClick(e);
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        onDblClick(e);
      }}
      onDragEnd={(e) => {
        const xNorm = e.target.x() / stageWidth;
        const yNorm = e.target.y() / stageHeight;
        onDragEnd(xNorm, yNorm);
      }}
    />
  );
}

