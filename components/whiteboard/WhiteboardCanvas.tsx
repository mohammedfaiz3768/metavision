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
import { useSelectTool } from "./tools/useSelectTool";
import { NodeRenderer } from "./renderers/NodeRenderer";
import { CursorOverlay } from "./CursorOverlay";
import { getMapConfig } from "@/lib/whiteboard/map-config";
import { Loader2 } from "lucide-react";
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

  // ---- Initialize Tool Hooks ----
  const selectTool = useSelectTool({ stageRef: activeStageRef, nodes });
  const freedrawTool = useFreedrawTool({ stageRef: activeStageRef, userId });
  const rotationTool = useRotationTool({ stageRef: activeStageRef, userId });
  const arrowTool = useArrowTool({ stageRef: activeStageRef, userId });
  const shapeTool = useShapeTool({ stageRef: activeStageRef, userId });
  const textTool = useTextTool({ stageRef: activeStageRef, userId });
  const markerTool = useMarkerTool({ stageRef: activeStageRef, userId });

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
    if (id && nodes.some((n) => n.id === id)) {
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
    if (id && nodes.some((n) => n.id === id) && (activeTool === "select" || activeTool === "pan")) {
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
          (spacePressed || activeTool === "pan") ? "cursor-grab active:cursor-grabbing" : "cursor-default"
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
            return (
              <NodeRenderer
                key={node.id}
                node={node}
                stageWidth={canvasWidth}
                stageHeight={canvasHeight}
                isSelected={isSelected}
                onSelect={() => selectNode(node.id, false)}
                draggable={activeTool === "select" || activeTool === "pan"}
                onDragEnd={(xNorm, yNorm) => handleNodeDragEnd(node.id, xNorm, yNorm)}
                onTextDblClick={textTool.handleTextDblClick}
                editingTextNodeId={textTool.editingNodeId}
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
            onTransformStart={() => {
              useCanvasStore.getState().pushHistory();
            }}
            borderStroke="hsl(210, 100%, 60%)"
            anchorStroke="hsl(210, 100%, 60%)"
            anchorFill="#000"
            anchorSize={8}
            rotateAnchorOffset={15}
            keepRatio={false}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "top-center",
              "bottom-center",
              "left-center",
              "right-center",
            ]}
            onTransformEnd={(e) => {
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
                });
              } else if (node.type === "circle") {
                const finalRadius = (transformerNode.width() * transformerNode.scaleX()) / 2 / canvasWidth;
                const finalX = transformerNode.x() / canvasWidth;
                const finalY = transformerNode.y() / canvasHeight;

                transformerNode.scaleX(1);
                transformerNode.scaleY(1);

                updateNode(activeId, {
                  x: finalX,
                  y: finalY,
                  radius: finalRadius,
                });
              } else {
                // Update rotation angle (degrees) for all node types
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
    </div>
  );
}
