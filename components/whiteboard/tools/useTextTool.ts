"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { generateNodeId, screenToNormalized } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";

interface ToolProps {
  stageRef: React.RefObject<any>;
  userId: string;
}

export function useTextTool({ stageRef, userId }: ToolProps) {
  const { addNode, updateNode, deleteNode, activeColor, activeLayer } = useCanvasStore();
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [textareaStyle, setTextareaStyle] = useState<React.CSSProperties>({});
  const [textValue, setTextValue] = useState("");
  const [isNewNode, setIsNewNode] = useState(false);

  // 1. Double click existing text node to edit it
  const handleTextDblClick = (node: CanvasNode, e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Get exact screen position of the Konva Text Node, accounting for stage pan and zoom!
    const textNode = e.target;
    const textPosition = textNode.getAbsolutePosition();
    const stageBox = stage.container().getBoundingClientRect();

    const scale = stage.scaleX();
    const fontSize = (node.fontSize ?? 16) * scale;

    setIsNewNode(false);
    setEditingNodeId(node.id);
    setTextValue(node.text ?? "");
    
    // Style the textarea to overlay exactly over the Konva Text
    setTextareaStyle({
      position: "absolute",
      top: `${textPosition.y - 4}px`,
      left: `${textPosition.x - 4}px`,
      fontSize: `${fontSize}px`,
      color: node.color,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      background: "transparent",
      border: "1px solid hsl(210, 100%, 60%)",
      outline: "none",
      padding: "2px 4px",
      margin: "0",
      resize: "both",
      overflow: "hidden",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      lineHeight: "1.1",
      zIndex: 100,
    });
  };

  // 2. Click empty area to spawn a NEW text node
  const handleStageClick = (e: any) => {
    // Allow spawning a new text node anywhere EXCEPT on an existing text node
    const isTextNode = e.target && e.target.getClassName && e.target.getClassName() === "Text";
    if (isTextNode) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const scale = stage.scaleX();

    // Viewport transform adjustments
    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    // Normalize coordinates for the DB representation
    const normPos = screenToNormalized(stagePos.x, stagePos.y, 1024, 1024);

    const newId = generateNodeId();
    const newNode: CanvasNode = {
      id: newId,
      type: "text",
      layer: activeLayer,
      x: normPos.x,
      y: normPos.y,
      text: "Text",
      color: activeColor,
      strokeWidth: 2,
      fontSize: 16,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: Date.now(),
      version: 1,
    };

    // Add to Zustand immediately, but hidden (set as editing)
    addNode(newNode);
    setIsNewNode(true);
    setEditingNodeId(newId);
    setTextValue("");

    // Overlay text area on the screen position clicked
    setTextareaStyle({
      position: "absolute",
      top: `${pos.y - 8}px`,
      left: `${pos.x - 8}px`,
      fontSize: `${16 * scale}px`,
      color: activeColor,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      background: "transparent",
      border: "1px solid hsl(210, 100%, 60%)",
      outline: "none",
      padding: "2px 4px",
      margin: "0",
      resize: "both",
      overflow: "hidden",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      lineHeight: "1.1",
      zIndex: 100,
    });
  };

  // 3. Save text and close editing
  const handleTextareaSubmit = () => {
    if (!editingNodeId) return;

    const trimmedValue = textValue.trim();

    if (trimmedValue === "") {
      // If text is empty, delete node
      deleteNode(editingNodeId);
    } else {
      // Save text content to Zustand node
      updateNode(editingNodeId, { text: trimmedValue });
    }

    // Reset editing state
    setEditingNodeId(null);
    setTextValue("");
  };

  return {
    editingNodeId,
    textareaStyle,
    textValue,
    setTextValue,
    handleTextDblClick,
    handleStageClick,
    handleTextareaSubmit,
  };
}
