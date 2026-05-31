"use client";

import { useRef, useState } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { normalizedToScreen } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";

interface ToolProps {
  stageRef: React.RefObject<any>;
  nodes: CanvasNode[];
}

export function useSelectTool({ stageRef, nodes }: ToolProps) {
  const {
    selectedNodeIds,
    selectNode,
    deselectAll,
    selectNodes,
    updateNode,
  } = useCanvasStore();

  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const isSelecting = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>({});

  const handleMouseDown = (e: any) => {
    // Only select on left click
    if (e.evt.button !== 0) return;

    const stage = stageRef.current;
    if (!stage) return;

    // Clicked empty area
    if (e.target === stage) {
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePos = transform.point(pos);

      isSelecting.current = true;
      startPos.current = stagePos;

      setSelectionBox({
        x: stagePos.x,
        y: stagePos.y,
        width: 0,
        height: 0,
      });

      // Clear selection unless Shift key is pressed
      if (!e.evt.shiftKey) {
        deselectAll();
      }
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isSelecting.current || !startPos.current) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    const x = Math.min(startPos.current.x, stagePos.x);
    const y = Math.min(startPos.current.y, stagePos.y);
    const width = Math.abs(startPos.current.x - stagePos.x);
    const height = Math.abs(startPos.current.y - stagePos.y);

    setSelectionBox({ x, y, width, height });
  };

  const handleMouseUp = (e: any) => {
    if (!isSelecting.current) return;
    isSelecting.current = false;

    const stage = stageRef.current;
    if (!stage || !selectionBox || !startPos.current) {
      setSelectionBox(null);
      return;
    }

    // Trivial select box click -> just clear or keep
    if (selectionBox.width < 3 && selectionBox.height < 3) {
      setSelectionBox(null);
      return;
    }

    const stageWidth = 1024;
    const stageHeight = 1024;

    // Check which nodes intersect with the selection box
    const intersectedIds: string[] = [];

    nodes.forEach((node) => {
      const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);
      
      const inX = screenPos.x >= selectionBox.x && screenPos.x <= selectionBox.x + selectionBox.width;
      const inY = screenPos.y >= selectionBox.y && screenPos.y <= selectionBox.y + selectionBox.height;

      if (inX && inY) {
        intersectedIds.push(node.id);
      }
    });

    if (intersectedIds.length > 0) {
      if (e.evt.shiftKey) {
        // Toggle selected items
        const newSelection = [...selectedNodeIds];
        intersectedIds.forEach((id) => {
          if (newSelection.includes(id)) {
            const idx = newSelection.indexOf(id);
            newSelection.splice(idx, 1);
          } else {
            newSelection.push(id);
          }
        });
        selectNodes(newSelection);
      } else {
        selectNodes(intersectedIds);
      }
    }

    setSelectionBox(null);
    startPos.current = null;
  };

  // Group dragging logic
  const handleNodeDragStart = (nodeId: string) => {
    // Save starting position of all selected nodes
    const stage = stageRef.current;
    if (!stage) return;

    const stageWidth = 1024;
    const stageHeight = 1024;

    const positions: Record<string, { x: number; y: number }> = {};
    selectedNodeIds.forEach((id) => {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        // Store normalized coordinates
        positions[id] = { x: node.x, y: node.y };
      }
    });

    dragStartPositions.current = positions;
  };

  const handleNodeDragMove = (nodeId: string, currentX: number, currentY: number) => {
    // If the dragged node is not part of the selection, do nothing
    if (!selectedNodeIds.includes(nodeId)) return;

    const mainStart = dragStartPositions.current[nodeId];
    if (!mainStart) return;

    const dxNorm = currentX - mainStart.x;
    const dyNorm = currentY - mainStart.y;

    // Update all other selected nodes by the same normalized displacement delta
    selectedNodeIds.forEach((id) => {
      if (id === nodeId) return; // let Konva drag the main node naturally

      const start = dragStartPositions.current[id];
      if (start) {
        updateNode(id, {
          x: Math.max(0, Math.min(1, start.x + dxNorm)),
          y: Math.max(0, Math.min(1, start.y + dyNorm)),
        });
      }
    });
  };

  const handleNodeDragEnd = (nodeId: string, finalXNorm: number, finalYNorm: number) => {
    // If dragging a single node that is NOT in the active selection group, select it first
    if (!selectedNodeIds.includes(nodeId)) {
      selectNode(nodeId);
      updateNode(nodeId, { x: finalXNorm, y: finalYNorm });
      return;
    }

    // Save final positions for all in the multi-select group
    const start = dragStartPositions.current[nodeId];
    if (!start) {
      updateNode(nodeId, { x: finalXNorm, y: finalYNorm });
      return;
    }

    const dx = finalXNorm - start.x;
    const dy = finalYNorm - start.y;

    selectedNodeIds.forEach((id) => {
      const nodeStart = dragStartPositions.current[id];
      if (nodeStart) {
        updateNode(id, {
          x: Math.max(0, Math.min(1, nodeStart.x + dx)),
          y: Math.max(0, Math.min(1, nodeStart.y + dy)),
          // Update version for LWW conflict checks
          version: (nodes.find((n) => n.id === id)?.version ?? 1) + 1,
        });
      }
    });

    // Clear saved drag origins
    dragStartPositions.current = {};
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
    selectionBox,
  };
}
