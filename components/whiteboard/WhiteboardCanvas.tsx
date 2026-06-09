"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Transformer, Group, Line as KonvaLine, Circle as KonvaCircle } from "react-konva";
import useImage from "use-image";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { denormalizePoints } from "@/lib/whiteboard/konva-utils";
import { cn } from "@/lib/utils";
import { useViewport } from "./hooks/useViewport";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useFreedrawTool } from "./tools/useFreedrawTool";
import { useRotationTool } from "./tools/useRotationTool";
import { useArrowTool } from "./tools/useArrowTool";
import { useShapeTool } from "./tools/useShapeTool";
import { useTextTool } from "./tools/useTextTool";
import { useMarkerTool } from "./tools/useMarkerTool";
import { useLogoPlaceTool } from "./tools/useLogoPlaceTool";
import { useSelectTool } from "./tools/useSelectTool";
import { NodeRenderer } from "./renderers/NodeRenderer";
import { CursorOverlay } from "./CursorOverlay";
import { getMapConfig } from "@/lib/whiteboard/map-config";
import { Loader2, Copy, Clipboard, Trash2, ArrowUp, ArrowDown, Lock, Unlock, CopyPlus, ExternalLink } from "lucide-react";
import type { MapId } from "@/lib/types/app.types";
import { calculateAuthoritativeBounds } from "@/lib/whiteboard/validation";

interface WhiteboardCanvasProps {
  mapId: MapId;
  userId: string;
  username: string;
  realtimeCursors?: any[];
  realtimeMouseMoveHandler?: (e: any) => void;
  stageRef?: React.RefObject<any>;
}

export function WhiteboardCanvas({
  mapId,
  userId,
  username,
  realtimeCursors = [],
  realtimeMouseMoveHandler,
  stageRef,
}: WhiteboardCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const localStageRef = useRef<any>(null);
  const activeStageRef = stageRef || localStageRef;
  const transformerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 1024, height: 1024 });
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);

  const {
    nodes,
    activeTool,
    activeColor,
    snapToGrid,
    viewport,
    setViewport,
    layerVisibility,
    selectedNodeIds,
    selectNode,
    deselectAll,
    updateNode,
    layers,
    deleteNode,
    copyStyle,
    pasteStyle,
    styleClipboard,
    bringToFront,
    sendToBack,
    duplicateNode,
    toggleNodeLock,
    pendingLogo,
    setPendingLogo,
    setTool,
    setFitScale,
  } = useCanvasStore();

  // Load Map config and Preload image
  const mapConfig = getMapConfig(mapId);
  const [mapImage, mapImageStatus] = useImage(mapConfig?.publicPath || "", "anonymous");

  // Dimensions of canvas (esports maps are fixed at 1024x1024)
  const canvasWidth = 1024;
  const canvasHeight = 1024;

  // Track spacebar for panning
  const [spacePressed, setSpacePressed] = useState(false);

  const hasUserInteracted = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && containerRef.current) {
      const updateSize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth || containerRef.current.offsetWidth || 1024;
        const h = containerRef.current.clientHeight || containerRef.current.offsetHeight || 1024;
        if (w > 0 && h > 0) {
          setStageSize({ width: w, height: h });

          if (!hasUserInteracted.current) {
            const scale = Math.min(w / 1024, h / 1024) * 0.95;
            const initX = (w - 1024 * scale) / 2;
            const initY = (h - 1024 * scale) / 2;

            setViewport({
              x: initX,
              y: initY,
              scaleX: scale,
              scaleY: scale,
            });
            setFitScale(scale);
          }
        }
      };

      updateSize();
      const timer = setTimeout(updateSize, 100);

      const observer = new ResizeObserver(updateSize);
      observer.observe(containerRef.current);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    }
  }, [mounted]);

  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }
    if (e.code === "Space") {
      setSpacePressed(true);
      if (e.target === document.body) {
        e.preventDefault();
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      setSpacePressed(false);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Keyboard undo/redo/delete shortcuts
  useKeyboardShortcuts();

  // Middle-mouse drag panning state
  const [isMiddleDragging, setIsMiddleDragging] = useState(false);
  const middleDragStart = useRef({ x: 0, y: 0 });
  const middleDragViewport = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleWindowMouseUp = () => {
      setIsMiddleDragging(false);
    };
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!isMiddleDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (hasUserInteracted.current === false) {
        hasUserInteracted.current = true;
      }
      const dx = e.clientX - middleDragStart.current.x;
      const dy = e.clientY - middleDragStart.current.y;
      setViewport({
        x: middleDragViewport.current.x + dx,
        y: middleDragViewport.current.y + dy,
      });
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
    };
  }, [isMiddleDragging]);

  const isNodeLocked = (node: any) => {
    if (node.isLocked) return true;
    const layer = layers.find((l) => l.id === node.layer);
    return layer ? layer.isLocked : false;
  };

  const selectedNode = nodes.find((n) => selectedNodeIds.includes(n.id));
  const isSelectedNodeLocked = selectedNode ? isNodeLocked(selectedNode) : false;

  const getSelectedNodeCenter = () => {
    if (selectedNodeIds.length !== 1 || !selectedNode) return null;
    const node = selectedNode;

    let cx = node.x;
    let cy = node.y;
    let w = 0;
    let h = 0;

    if (node.type === "rect") {
      w = node.width ?? 0.1;
      h = node.height ?? 0.1;
      cx = node.x + w / 2;
      cy = node.y;
    } else if (node.type === "circle" || (node.type as string) === "logo-marker") {
      const isLogo = (node.type as string) === "logo-marker";
      const ry = isLogo ? (node.radius ?? 0.035) : (node.radiusY ?? node.radius ?? 0.05);
      cx = node.x;
      cy = node.y - ry;
    } else if (node.type === "text") {
      w = node.width ?? 0.15;
      h = node.height ?? 0.05;
      cx = node.x + w / 2;
      cy = node.y;
    } else if (node.points && node.points.length >= 4) {
      const minX = node.min_x ?? calculateAuthoritativeBounds(node).min_x;
      const maxX = node.max_x ?? calculateAuthoritativeBounds(node).max_x;
      const minY = node.min_y ?? calculateAuthoritativeBounds(node).min_y;
      cx = (minX + maxX) / 2;
      cy = minY;
    }

    const localScale = viewport.scaleX || 1;
    const screenX = cx * 1024 * localScale + viewport.x;
    const screenY = cy * 1024 * localScale + viewport.y;

    return { x: screenX, y: screenY };
  };

  const pos = getSelectedNodeCenter();

  // ---- Initialize Tool Hooks ----
  const selectTool = useSelectTool({ stageRef: activeStageRef, nodes });
  const freedrawTool = useFreedrawTool({ stageRef: activeStageRef, userId });
  const rotationTool = useRotationTool({ stageRef: activeStageRef, userId });
  const arrowTool = useArrowTool({ stageRef: activeStageRef, userId });
  const shapeTool = useShapeTool({ stageRef: activeStageRef, userId });
  const textTool = useTextTool({ stageRef: activeStageRef, userId });
  const markerTool = useMarkerTool({ stageRef: activeStageRef, userId });
  const logoPlaceTool = useLogoPlaceTool({ stageRef: activeStageRef, userId });

  // Panning & Zoom Viewport
  const { handleWheel, handleDragEnd } = useViewport({
    stageRef: activeStageRef,
    viewport,
    setViewport,
    activeTool,
    onUserInteract: () => {
      hasUserInteracted.current = true;
    },
  });

  // ---- Drag Selection and Transform attachment ----
  useEffect(() => {
    if (!mounted) return;
    const stage = activeStageRef.current;
    const tr = transformerRef.current;

    if (!stage || !tr) return;

    if (selectedNodeIds.length === 1) {
      // Find selected node in Konva stage
      const selectedId = selectedNodeIds[0];
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        tr.nodes([selectedNode]);
        tr.getLayer().batchDraw();
      } else {
        tr.nodes([]);
      }
    } else {
      tr.nodes([]);
    }
  }, [selectedNodeIds, nodes, mounted]);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-background flex flex-col items-center justify-center border border-border rounded-2xl relative select-none">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <span className="text-xs text-muted-foreground">Booting canvas grid...</span>
      </div>
    );
  }

  // Spatial Viewport Culling & Bounding Box Overlap Filter
  const scale = viewport.scaleX || 1;
  const pad = 0.05; // 5% coordinate padding for fast panning safety margin

  const minVisibleX = -viewport.x / (scale * 1024) - pad;
  const maxVisibleX = (-viewport.x + 1024) / (scale * 1024) + pad;
  const minVisibleY = -viewport.y / (scale * 1024) - pad;
  const maxVisibleY = (-viewport.y + 1024) / (scale * 1024) + pad;

  const visibleNodes = nodes.filter((node) => {
    if (!layerVisibility[node.layer]) return false;

    // Retrieve database bounds or compute on the fly for newly drawn unsaved lines
    const minX = node.min_x ?? calculateAuthoritativeBounds(node).min_x;
    const maxX = node.max_x ?? calculateAuthoritativeBounds(node).max_x;
    const minY = node.min_y ?? calculateAuthoritativeBounds(node).min_y;
    const maxY = node.max_y ?? calculateAuthoritativeBounds(node).max_y;

    const overlapsX = minX <= maxVisibleX && maxX >= minVisibleX;
    const overlapsY = minY <= maxVisibleY && maxY >= minVisibleY;

    return overlapsX && overlapsY;
  });

  // Determine stage events based on active drawing tool
  const getStageDrawHandlers = () => {
    switch (activeTool) {
      case "freedraw":
        return {
          onMouseDown: freedrawTool.handleMouseDown,
          onMouseMove: freedrawTool.handleMouseMove,
          onMouseUp: freedrawTool.handleMouseUp,
          onTouchStart: freedrawTool.handleMouseDown,
          onTouchMove: freedrawTool.handleMouseMove,
          onTouchEnd: freedrawTool.handleMouseUp,
        };
      case "rotation":
        return {
          onMouseDown: rotationTool.handleMouseDown,
          onMouseMove: rotationTool.handleMouseMove,
          onMouseUp: rotationTool.handleMouseUp,
          onTouchStart: rotationTool.handleMouseDown,
          onTouchMove: rotationTool.handleMouseMove,
          onTouchEnd: rotationTool.handleMouseUp,
        };
      case "arrow":
        return {
          onMouseDown: arrowTool.handleMouseDown,
          onMouseMove: arrowTool.handleMouseMove,
          onMouseUp: arrowTool.handleMouseUp,
          onTouchStart: arrowTool.handleMouseDown,
          onTouchMove: arrowTool.handleMouseMove,
          onTouchEnd: arrowTool.handleMouseUp,
        };
      case "circle":
      case "rect":
        return {
          onMouseDown: shapeTool.handleMouseDown,
          onMouseMove: shapeTool.handleMouseMove,
          onMouseUp: shapeTool.handleMouseUp,
          onTouchStart: shapeTool.handleMouseDown,
          onTouchMove: shapeTool.handleMouseMove,
          onTouchEnd: shapeTool.handleMouseUp,
        };
      case "text":
        return {
          onClick: textTool.handleStageClick,
          onTap: textTool.handleStageClick,
        };
      case "marker":
        return {
          onClick: markerTool.handleStageClick,
          onTap: markerTool.handleStageClick,
        };
      case "logo-place":
        return {
          onClick: logoPlaceTool.handleStageClick,
          onTap: logoPlaceTool.handleStageClick,
        };
      case "select":
      default:
        return {
          onMouseDown: selectTool.handleMouseDown,
          onMouseMove: selectTool.handleMouseMove,
          onMouseUp: selectTool.handleMouseUp,
          onTouchStart: selectTool.handleMouseDown,
          onTouchMove: selectTool.handleMouseMove,
          onTouchEnd: selectTool.handleMouseUp,
        };
    }
  };

  const handleStageEvent = (e: any, handlerName: string) => {
    // Intercept middle-click for panning
    if (e.evt) {
      if (handlerName === "onMouseDown" && e.evt.button === 1) {
        e.evt.preventDefault();
        setIsMiddleDragging(true);
        middleDragStart.current = { x: e.evt.clientX, y: e.evt.clientY };
        middleDragViewport.current = { x: viewport.x, y: viewport.y };
        return;
      }
      
      if (handlerName === "onMouseMove" && isMiddleDragging) {
        e.evt.preventDefault();
        const dx = e.evt.clientX - middleDragStart.current.x;
        const dy = e.evt.clientY - middleDragStart.current.y;
        setViewport({
          x: middleDragViewport.current.x + dx,
          y: middleDragViewport.current.y + dy,
        });
        
        if (realtimeMouseMoveHandler) {
          realtimeMouseMoveHandler(e);
        }
        return;
      }
      
      if (handlerName === "onMouseUp" && isMiddleDragging) {
        e.evt.preventDefault();
        setIsMiddleDragging(false);
        return;
      }
    }

    // 1. Core draw/select handler
    const drawHandlers = getStageDrawHandlers() as any;
    if (drawHandlers[handlerName]) {
      drawHandlers[handlerName](e);
    }

    // 2. Realtime cursor coordinates tracker
    if (realtimeMouseMoveHandler && handlerName === "onMouseMove") {
      realtimeMouseMoveHandler(e);
    }
  };

  // Grid Snapping logic helper during node movement
  const handleNodeDragEnd = (nodeId: string, finalXNorm: number, finalYNorm: number) => {
    let targetX = finalXNorm;
    let targetY = finalYNorm;

    if (snapToGrid) {
      // Snap to nearest 10px in screen space, then normalize
      const screenX = finalXNorm * canvasWidth;
      const screenY = finalYNorm * canvasHeight;
      const snappedX = Math.round(screenX / 15) * 15;
      const snappedY = Math.round(screenY / 15) * 15;
      targetX = Math.max(0, Math.min(1, snappedX / canvasWidth));
      targetY = Math.max(0, Math.min(1, snappedY / canvasHeight));
    }

    selectTool.handleNodeDragEnd(nodeId, targetX, targetY);
  };

  const handleStageDragStart = (e: any) => {
    const target = e.target;
    const id = target.id();
    const node = nodes.find((n) => n.id === id);
    if (node) {
      if (isNodeLocked(node)) {
        target.stopDrag();
        return;
      }
      // It's a node! Push history once at the start of the drag
      useCanvasStore.getState().pushHistory();

      // If we are in select or pan mode, initialize group dragging
      if (activeTool === "select" || activeTool === "pan") {
        selectTool.handleNodeDragStart(id);
      }
    }
  };

  const handleStageDragMove = (e: any) => {
    const target = e.target;
    const id = target.id();
    const node = nodes.find((n) => n.id === id);
    if (node && !isNodeLocked(node) && (activeTool === "select" || activeTool === "pan")) {
      const currentXNorm = target.x() / canvasWidth;
      const currentYNorm = target.y() / canvasHeight;
      selectTool.handleNodeDragMove(id, currentXNorm, currentYNorm);
    }
  };

  const isStageDraggable = spacePressed || activeTool === "pan" || (activeTool === "select" && selectedNodeIds.length === 0);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden bg-[#0d0e12] select-none">
      {/* Floating Draft Control Bar */}
      {rotationTool.points && rotationTool.points.length > 0 && activeTool === "rotation" && (
        <div
          onMouseDown={(evt) => evt.stopPropagation()}
          onTouchStart={(evt) => evt.stopPropagation()}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-full shadow-xl flex items-center gap-3 text-xs font-semibold select-none text-slate-800"
        >
          <span className="text-[#6366F1] font-bold animate-pulse flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1] animate-ping" />
            Drawing Path ({rotationTool.points.length / 2} pts)
          </span>
          <div className="h-3 w-[1px] bg-slate-200" />
          <button
            type="button"
            onClick={(evt) => {
              evt.stopPropagation();
              rotationTool.completePath();
            }}
            disabled={rotationTool.points.length < 4}
            className="h-6 px-3 text-[10px] font-extrabold bg-[#10B981] text-white hover:bg-[#059669] rounded-full transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Path
          </button>
          <button
            type="button"
            onClick={(evt) => {
              evt.stopPropagation();
              rotationTool.cancelPath();
            }}
            className="h-6 px-3 text-[10px] font-extrabold border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-full transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* HTML overlay text editor textarea */}
      {textTool.editingNodeId && (
        <textarea
          style={textTool.textareaStyle}
          value={textTool.textValue}
          onChange={(e) => textTool.setTextValue(e.target.value)}
          onBlur={textTool.handleTextareaSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              textTool.handleTextareaSubmit();
            }
            if (e.key === "Escape") {
              textTool.handleTextareaSubmit();
            }
          }}
          autoFocus
        />
      )}

      {/* Main Konva Stage */}
      <Stage
        ref={activeStageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scaleX}
        scaleY={viewport.scaleY}
        draggable={isStageDraggable}
        onWheel={handleWheel}
        onDragStart={handleStageDragStart}
        onDragMove={handleStageDragMove}
        onDragEnd={handleDragEnd}
        onMouseDown={(e) => handleStageEvent(e, "onMouseDown")}
        onMouseMove={(e) => handleStageEvent(e, "onMouseMove")}
        onMouseUp={(e) => handleStageEvent(e, "onMouseUp")}
        onTouchStart={(e) => handleStageEvent(e, "onTouchStart")}
        onTouchMove={(e) => handleStageEvent(e, "onTouchMove")}
        onTouchEnd={(e) => handleStageEvent(e, "onTouchEnd")}
        onClick={(e) => handleStageEvent(e, "onClick")}
        onTap={(e) => handleStageEvent(e, "onTap")}
        className={cn(
          "shadow-2xl border border-border overflow-hidden bg-secondary/10",
          (spacePressed || activeTool === "pan") ? "cursor-grab active:cursor-grabbing" : activeTool === "eraser" ? "cursor-crosshair" : activeTool === "logo-place" ? "cursor-crosshair" : "cursor-default"
        )}
      >
        {/* Layer 1: Map Image and grid lines */}
        <Layer id="background-layer">
          {mapImageStatus === "loaded" && mapImage ? (
            <KonvaImage
              image={mapImage}
              width={canvasWidth}
              height={canvasHeight}
              opacity={0.85}
              onClick={() => deselectAll()}
              onTap={() => deselectAll()}
            />
          ) : (
            <Rect
              width={canvasWidth}
              height={canvasHeight}
              fill="hsl(220, 15%, 8%)"
            />
          )}

          {/* Grid lines (Visual representation of Snap to Grid) */}
          {snapToGrid && (
            <Group opacity={0.15}>
              {Array.from({ length: Math.floor(canvasWidth / 30) }).map((_, i) => (
                <Rect
                  key={`v-${i}`}
                  x={i * 30}
                  y={0}
                  width={1}
                  height={canvasHeight}
                  fill="#ffffff"
                />
              ))}
              {Array.from({ length: Math.floor(canvasHeight / 30) }).map((_, i) => (
                <Rect
                  key={`h-${i}`}
                  x={0}
                  y={i * 30}
                  width={canvasWidth}
                  height={1}
                  fill="#ffffff"
                />
              ))}
            </Group>
          )}
        </Layer>

        {/* Layer 2: Whiteboard Nodes drawing */}
        <Layer id="drawing-layer">
          {visibleNodes.map((node) => {
            const isSelected = selectedNodeIds.includes(node.id);
            const listening = activeTool === "select" || activeTool === "eraser" || (activeTool === "text" && node.type === "text");
            return (
              <NodeRenderer
                key={node.id}
                node={node}
                stageWidth={canvasWidth}
                stageHeight={canvasHeight}
                isSelected={isSelected}
                onSelect={() => {
                  if (activeTool === "eraser") {
                    deleteNode(node.id);
                  } else {
                    selectNode(node.id, false);
                  }
                }}
                draggable={(activeTool === "select" || activeTool === "pan") && !isNodeLocked(node)}
                onDragEnd={(xNorm, yNorm) => handleNodeDragEnd(node.id, xNorm, yNorm)}
                onTextDblClick={textTool.handleTextDblClick}
                editingTextNodeId={textTool.editingNodeId}
                listening={listening}
              />
            );
          })}

          {/* Tool drawings preview nodes */}
          {freedrawTool.previewNode && (
            <NodeRenderer
              node={freedrawTool.previewNode}
              stageWidth={canvasWidth}
              stageHeight={canvasHeight}
              isSelected={false}
              onSelect={() => {}}
              draggable={false}
              onDragEnd={() => {}}
            />
          )}

          {rotationTool.points && rotationTool.points.length > 0 && (() => {
            const previewPoints = rotationTool.tempPoint && activeTool === "rotation"
              ? [...rotationTool.points, ...rotationTool.tempPoint]
              : rotationTool.points;
            
            const screenPoints = denormalizePoints(previewPoints, canvasWidth, canvasHeight);
            
            return (
              <Group>
                {/* Dashed preview line */}
                <KonvaLine
                  points={screenPoints}
                  stroke={activeColor}
                  strokeWidth={4 / scale}
                  opacity={0.8}
                  dash={[8 / scale, 6 / scale]}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dots at each point */}
                {Array.from({ length: rotationTool.points.length / 2 }).map((_, idx) => {
                  const x = rotationTool.points[idx * 2] * canvasWidth;
                  const y = rotationTool.points[idx * 2 + 1] * canvasHeight;
                  return (
                    <KonvaCircle
                      key={idx}
                      x={x}
                      y={y}
                      radius={4.5 / scale}
                      fill="#ffffff"
                      stroke={activeColor}
                      strokeWidth={2 / scale}
                    />
                  );
                })}
              </Group>
            );
          })()}

          {arrowTool.previewNode && (
            <NodeRenderer
              node={arrowTool.previewNode}
              stageWidth={canvasWidth}
              stageHeight={canvasHeight}
              isSelected={false}
              onSelect={() => {}}
              draggable={false}
              onDragEnd={() => {}}
            />
          )}

          {shapeTool.previewNode && (
            <NodeRenderer
              node={shapeTool.previewNode}
              stageWidth={canvasWidth}
              stageHeight={canvasHeight}
              isSelected={false}
              onSelect={() => {}}
              draggable={false}
              onDragEnd={() => {}}
            />
          )}

          {/* Konva Transformer overlay */}
          <Transformer
            ref={transformerRef}
            onTransformStart={(e) => {
              useCanvasStore.getState().pushHistory();
              const anchor = transformerRef.current?.getActiveAnchor();
              if (anchor) {
                setActiveAnchor(anchor);
              }
            }}
            borderStroke={isSelectedNodeLocked ? "#f59e0b" : "hsl(210, 100%, 60%)"}
            borderDash={isSelectedNodeLocked ? [4, 4] : undefined}
            anchorStroke={isSelectedNodeLocked ? "#f59e0b" : "hsl(210, 100%, 60%)"}
            anchorFill={isSelectedNodeLocked ? "transparent" : "#000"}
            anchorSize={isSelectedNodeLocked ? 0 : 8}
            resizeEnabled={!isSelectedNodeLocked}
            rotateEnabled={!isSelectedNodeLocked}
            rotateAnchorOffset={15}
            keepRatio={
              !activeAnchor || 
              !(selectedNode?.type === "circle" || selectedNode?.type === "rect") || 
              !["top-center", "bottom-center", "middle-left", "middle-right"].includes(activeAnchor)
            }
            enabledAnchors={isSelectedNodeLocked ? [] : [
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "top-center",
              "bottom-center",
              "middle-left",
              "middle-right",
            ]}
            onTransformEnd={(e) => {
              setActiveAnchor(null);
              // Get transformed scale / size and update node in Zustand
              const activeId = selectedNodeIds[0];
              const node = nodes.find((n) => n.id === activeId);
              if (!node) return;

              const transformerNode = e.target;
              
              if (node.type === "rect") {
                const finalW = (transformerNode.width() * transformerNode.scaleX()) / canvasWidth;
                const finalH = (transformerNode.height() * transformerNode.scaleY()) / canvasHeight;
                const finalX = transformerNode.x() / canvasWidth;
                const finalY = transformerNode.y() / canvasHeight;

                // Reset Konva node scales so it doesn't build up
                transformerNode.scaleX(1);
                transformerNode.scaleY(1);

                updateNode(activeId, {
                  x: finalX,
                  y: finalY,
                  width: finalW,
                  height: finalH,
                  rotation: transformerNode.rotation(),
                });
              } else if (node.type === "circle") {
                const baseRadiusX = node.radiusX ?? node.radius ?? 0.05;
                const baseRadiusY = node.radiusY ?? node.radius ?? 0.05;
                const finalRadiusX = baseRadiusX * transformerNode.scaleX();
                const finalRadiusY = baseRadiusY * transformerNode.scaleY();
                const finalX = transformerNode.x() / canvasWidth;
                const finalY = transformerNode.y() / canvasHeight;

                transformerNode.scaleX(1);
                transformerNode.scaleY(1);

                updateNode(activeId, {
                  x: finalX,
                  y: finalY,
                  radiusX: finalRadiusX,
                  radiusY: finalRadiusY,
                  rotation: transformerNode.rotation(),
                });
              } else if ((node.type as string) === "logo-marker") {
                const baseRadius = node.radius ?? 0.035;
                const finalRadius = baseRadius * transformerNode.scaleX();
                const finalX = transformerNode.x() / canvasWidth;
                const finalY = transformerNode.y() / canvasHeight;

                transformerNode.scaleX(1);
                transformerNode.scaleY(1);

                updateNode(activeId, {
                  x: finalX,
                  y: finalY,
                  radius: finalRadius,
                  rotation: transformerNode.rotation(),
                });
              } else if (node.type === "text") {
                const finalFontSize = Math.round((node.fontSize ?? 16) * transformerNode.scaleX());
                const finalX = transformerNode.x() / canvasWidth;
                const finalY = transformerNode.y() / canvasHeight;

                transformerNode.scaleX(1);
                transformerNode.scaleY(1);

                updateNode(activeId, {
                  x: finalX,
                  y: finalY,
                  fontSize: finalFontSize,
                  rotation: transformerNode.rotation(),
                });
              } else {
                // Update rotation angle (degrees) for all other node types
                updateNode(activeId, {
                  rotation: transformerNode.rotation(),
                });
              }
            }}
          />

          {/* Overlay dragging selection box rectangle */}
          {selectTool.selectionBox && (
            <Rect
              x={selectTool.selectionBox.x}
              y={selectTool.selectionBox.y}
              width={selectTool.selectionBox.width}
              height={selectTool.selectionBox.height}
              fill="rgba(51, 153, 255, 0.08)"
              stroke="hsl(210, 100%, 60%)"
              strokeWidth={1}
              dash={[4, 4]}
            />
          )}
        </Layer>

        {/* Layer 3: Teammate Presence Cursors */}
        <CursorOverlay
          cursors={realtimeCursors}
          stageWidth={canvasWidth}
          stageHeight={canvasHeight}
        />
      </Stage>

      {/* Absolute HTML Context Floating Toolbar above selected element */}
      {pos && selectedNode && (
        <div
          style={{
            position: "absolute",
            left: `${pos.x}px`,
            top: `${pos.y - 14}px`,
            transform: "translate(-50%, -100%)",
          }}
          className="z-30 flex items-center gap-1 bg-[#13151D]/90 backdrop-blur-md border border-white/10 px-2 py-1.5 rounded-xl shadow-2xl text-xs font-semibold text-zinc-300 select-none animate-in fade-in zoom-in-95 duration-150"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Open Link if node has a URL annotation */}
          {selectedNode.type === "text" && (selectedNode as any).linkedUrl && (
            <>
              <button
                type="button"
                onClick={() => window.open((selectedNode as any).linkedUrl, "_blank")}
                title="Follow Annotation Link"
                className="h-8 px-2 flex items-center gap-1.5 rounded-lg bg-indigo-650/40 hover:bg-indigo-600/50 text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer border border-indigo-500/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Go to Link</span>
              </button>
              <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
            </>
          )}

          {/* Lock / Unlock */}
          <button
            type="button"
            onClick={() => toggleNodeLock(selectedNode.id)}
            title={isSelectedNodeLocked ? "Unlock Element" : "Lock Element"}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
              isSelectedNodeLocked
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "hover:bg-white/10 text-zinc-400 hover:text-zinc-200"
            )}
          >
            {isSelectedNodeLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* Front / Back */}
          <button
            type="button"
            onClick={() => bringToFront(selectedNode.id)}
            disabled={isSelectedNodeLocked}
            title="Bring to Front"
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            onClick={() => sendToBack(selectedNode.id)}
            disabled={isSelectedNodeLocked}
            title="Send to Back"
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowDown className="h-4 w-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* Copy / Paste Style */}
          <button
            type="button"
            onClick={() => copyStyle(selectedNode.id)}
            title="Copy Style"
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <Copy className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => pasteStyle(selectedNode.id)}
            disabled={!styleClipboard || isSelectedNodeLocked}
            title="Paste Style"
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <Clipboard className="h-4 w-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* Duplicate */}
          <button
            type="button"
            onClick={() => duplicateNode(selectedNode.id)}
            disabled={isSelectedNodeLocked}
            title="Duplicate"
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <CopyPlus className="h-4 w-4" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => deleteNode(selectedNode.id)}
            disabled={isSelectedNodeLocked}
            title="Delete"
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Floating Logo Placement Banner */}
      {activeTool === "logo-place" && pendingLogo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 text-xs font-semibold select-none text-white animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="text-[#6366F1] font-bold animate-pulse flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1] animate-ping" />
            Placing: {pendingLogo.name}
          </span>
          <div className="h-3 w-[1px] bg-slate-800" />
          <span className="text-slate-400 text-[10px]">Click map to place or press Esc to cancel</span>
          <button
            type="button"
            onClick={(evt) => {
              evt.stopPropagation();
              setPendingLogo(null);
              setTool("select");
            }}
            className="h-6 px-3 text-[10px] font-extrabold border border-slate-700 text-slate-400 hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
