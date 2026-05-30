"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Group } from "react-konva";
import useImage from "use-image";
import { getMapConfig } from "@/lib/whiteboard/map-config";
import { NodeRenderer } from "@/components/whiteboard/renderers/NodeRenderer";
import { Loader2, Layers, Eye, EyeOff } from "lucide-react";
import type { MapId, CanvasNode } from "@/lib/types/app.types";

interface ReadOnlyBoardProps {
  mapId: MapId;
  canvasData: { schemaVersion: number; nodes: CanvasNode[] } | null;
  interactive?: boolean;
  fit?: "contain" | "cover";
}

export function ReadOnlyBoard({ mapId, canvasData, interactive = true, fit = "contain" }: ReadOnlyBoardProps) {
  const [mounted, setMounted] = useState(false);
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mapConfig = getMapConfig(mapId);
  const [mapImage, mapImageStatus] = useImage(mapConfig?.publicPath || "", "anonymous");

  const canvasWidth = 1024;
  const canvasHeight = 1024;

  const [viewport, setViewport] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
  const [stageSize, setStageSize] = useState({ width: 320, height: 320 });

  // Floating layers visibility state
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    rotations: true,
    routes: true,
    zones: true,
  });

  const hasUserInteracted = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && containerRef.current) {
      const updateSize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth || containerRef.current.offsetWidth || 320;
        const h = containerRef.current.clientHeight || containerRef.current.offsetHeight || 320;
        if (w > 0 && h > 0) {
          setStageSize({ width: w, height: h });

          if (!hasUserInteracted.current) {
            // Calculate scale to fit map inside container
            const scale = fit === "cover" ? Math.max(w / 1024, h / 1024) : Math.min(w / 1024, h / 1024);
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

  // Simple drag-panning viewport inside observer mode (zoom via wheel)
  const handleWheel = (e: any) => {
    if (!interactive) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    hasUserInteracted.current = true;

    const oldScale = viewport.scaleX;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.1, Math.min(6, newScale));

    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };

    setViewport({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
      scaleX: newScale,
      scaleY: newScale,
    });
  };

  const handleDragEnd = (e: any) => {
    if (!interactive) return;
    if (e.target === stageRef.current) {
      hasUserInteracted.current = true;
      setViewport((prev) => ({
        ...prev,
        x: e.target.x(),
        y: e.target.y(),
      }));
    }
  };

  if (!mounted) {
    return (
      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center border border-slate-800 rounded-2xl relative select-none">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin mb-2" />
        <span className="text-xs text-slate-450">Loading strategy board...</span>
      </div>
    );
  }

  const nodes = (canvasData?.nodes || []).filter((node) => {
    const layer = node.layer || "rotations";
    return visibleLayers[layer] !== false;
  });

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden bg-slate-950 select-none border border-slate-800 rounded-xl flex items-center justify-center">
      {/* Floating Layers Panel */}
      {interactive && (
        <div className="absolute top-4 left-4 z-20 bg-slate-950/85 backdrop-blur-sm border border-slate-800 rounded-xl p-3 w-44 shadow-2xl select-none">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-350">Tactical Layers</span>
          </div>
          <div className="space-y-1.5">
            {[
              { id: "rotations", label: "Team Rotations", color: "bg-cyan-400" },
              { id: "routes", label: "Enemy Routes", color: "bg-rose-500" },
              { id: "zones", label: "Tactical Zones", color: "bg-emerald-400" },
            ].map((layer) => {
              const isVisible = visibleLayers[layer.id];
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setVisibleLayers((prev) => ({ ...prev, [layer.id]: !prev[layer.id] }))}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs bg-slate-900/40 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 transition-all font-mono"
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${layer.color}`} />
                    <span className="text-[9px] text-slate-350">{layer.label}</span>
                  </span>
                  {isVisible ? (
                    <Eye className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-slate-650" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scaleX}
        scaleY={viewport.scaleY}
        draggable={interactive} // Allow panning the map around in detail mode only
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        className={`${interactive ? "cursor-grab active:cursor-grabbing" : "cursor-default"} shadow-2xl overflow-hidden bg-slate-900`}
      >
        {/* Layer 1: Map Image */}
        <Layer id="background-layer">
          {mapImageStatus === "loaded" && mapImage ? (
            <KonvaImage
              image={mapImage}
              width={canvasWidth}
              height={canvasHeight}
              opacity={0.9}
            />
          ) : (
            <Rect
              width={canvasWidth}
              height={canvasHeight}
              fill="hsl(220, 15%, 8%)"
            />
          )}
        </Layer>

        {/* Layer 2: Whiteboard Nodes drawing */}
        <Layer id="drawing-layer">
          {nodes.map((node) => (
            <NodeRenderer
              key={node.id}
              node={node}
              stageWidth={canvasWidth}
              stageHeight={canvasHeight}
              isSelected={false}
              onSelect={() => {}} // No selection in ReadOnly mode
              draggable={false} // Disable dragging
              onDragEnd={() => {}}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
