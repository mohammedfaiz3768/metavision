"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pencil,
  Eraser,
  Square,
  Circle,
  Type,
  MapPin,
  Flag,
  AlertTriangle,
  Compass,
  Skull,
  Box,
  ArrowUpRight,
  Palette,
  Trash2,
  ZoomOut,
  Save,
  Grid,
  ChevronDown
} from "lucide-react";
import type { ToolType } from "@/lib/types/app.types";

const WORD_COLOR_GRID = [
  // Red
  ["#FEE2E2", "#FECACA", "#EF4444", "#DC2626", "#991B1B"],
  // Orange
  ["#FFEDD5", "#FED7AA", "#F97316", "#EA580C", "#9A3412"],
  // Yellow
  ["#FEF9C3", "#FEF08A", "#EAB308", "#CA8A04", "#854D0E"],
  // Green
  ["#DCFCE7", "#BBF7D0", "#22C55E", "#16A34A", "#166534"],
  // Cyan
  ["#ECFEFF", "#CFFAFE", "#06B6D4", "#0891B2", "#155E75"],
  // Blue
  ["#DBEAFE", "#BFDBFE", "#3B82F6", "#2563EB", "#1E3A8A"],
  // Indigo
  ["#E0E7FF", "#C7D2FE", "#6366F1", "#4F46E5", "#312E81"],
  // Purple
  ["#F3E8FF", "#E9D5FF", "#A855F7", "#9333EA", "#581C87"],
  // Pink
  ["#FCE7F3", "#FBCFE8", "#EC4899", "#DB2777", "#831843"],
  // Grays/Monochrome
  ["#FFFFFF", "#E2E8F0", "#94A3B8", "#475569", "#000000"],
];

const COLOR_COLUMN_LABELS = [
  "Reds", "Oranges", "Yellows", "Greens", "Cyans", "Blues", "Indigos", "Purples", "Pinks", "Grays"
];

export function WhiteboardToolbar() {
  const {
    activeTool,
    setTool,
    activeColor,
    setColor,
    activeMarkerType,
    setActiveMarker,
    deleteSelectedNodes,
    viewport,
    setViewport,
    snapToGrid,
    toggleSnapToGrid,
  } = useCanvasStore();

  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);

  const handleSelectMarkerTool = (markerId: string) => {
    setTool("marker");
    setActiveMarker(markerId);
  };

  const handleResetZoom = () => {
    setViewport({
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
    });
  };

  return (
    <div className="flex flex-col gap-3 bg-white/95 backdrop-blur-md border border-slate-200/80 p-4 rounded-[20px] shadow-2xl select-none w-[520px]">
      
      {/* ROW 1: PRIMARY TOOLS */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        
        {/* DRAW TOOL */}
        <button
          type="button"
          onClick={() => setTool("freedraw")}
          className={cn(
            "flex flex-col items-center gap-1 group cursor-pointer",
            activeTool === "freedraw" ? "text-[#6366F1]" : "text-slate-500 hover:text-slate-900"
          )}
          title="Draw Freehand (P)"
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
            activeTool === "freedraw" ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
          )}>
            <Pencil className="h-4.5 w-4.5" />
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase font-sans leading-none">Draw</span>
        </button>

        {/* ERASE / SELECT TOOL */}
        <button
          type="button"
          onClick={() => setTool("select")}
          className={cn(
            "flex flex-col items-center gap-1 group cursor-pointer",
            activeTool === "select" ? "text-[#6366F1]" : "text-slate-500 hover:text-slate-900"
          )}
          title="Erase / Select Node (V)"
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
            activeTool === "select" ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
          )}>
            <Eraser className="h-4.5 w-4.5" />
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase font-sans leading-none">Erase</span>
        </button>

        {/* SHAPES TOOL (Circle / Rect toggle short-circuit) */}
        <button
          type="button"
          onClick={() => setTool(activeTool === "circle" ? "rect" : "circle")}
          className={cn(
            "flex flex-col items-center gap-1 group cursor-pointer",
            (activeTool === "circle" || activeTool === "rect") ? "text-[#6366F1]" : "text-slate-500 hover:text-slate-900"
          )}
          title="Draw Shape (O / R)"
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all gap-0.5",
            (activeTool === "circle" || activeTool === "rect") ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
          )}>
            {activeTool === "rect" ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase font-sans leading-none">Shapes</span>
        </button>

        {/* TEXT TOOL */}
        <button
          type="button"
          onClick={() => setTool("text")}
          className={cn(
            "flex flex-col items-center gap-1 group cursor-pointer",
            activeTool === "text" ? "text-[#6366F1]" : "text-slate-500 hover:text-slate-900"
          )}
          title="Insert Text (T)"
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
            activeTool === "text" ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
          )}>
            <Type className="h-4.5 w-4.5" />
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase font-sans leading-none">Text</span>
        </button>

        {/* MARKERS PALETTE SELECTOR */}
        <button
          type="button"
          onClick={() => handleSelectMarkerTool("drop")}
          className={cn(
            "flex flex-col items-center gap-1 group cursor-pointer",
            activeTool === "marker" ? "text-[#6366F1]" : "text-slate-500 hover:text-slate-900"
          )}
          title="Tactical Marker Placement Mode"
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
            activeTool === "marker" ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
          )}>
            <MapPin className="h-4.5 w-4.5" />
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase font-sans leading-none">Markers</span>
        </button>

        {/* LOOT SHORTCUT */}
        <button
          type="button"
          onClick={() => handleSelectMarkerTool("loot")}
          className={cn(
            "flex flex-col items-center gap-1 group cursor-pointer",
            (activeTool === "marker" && activeMarkerType === "loot") ? "text-[#F97316]" : "text-slate-500 hover:text-slate-900"
          )}
          title="Place Loot Area Crate"
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
            (activeTool === "marker" && activeMarkerType === "loot") ? "bg-[#F97316] text-white" : "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
          )}>
            <Box className="h-4.5 w-4.5" />
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase font-sans leading-none">Loot</span>
        </button>

        {/* FLAG SHORTCUT */}
        <button
          type="button"
          onClick={() => handleSelectMarkerTool("drop")}
          className={cn(
            "flex flex-col items-center gap-1 group cursor-pointer",
            (activeTool === "marker" && activeMarkerType === "drop") ? "text-[#EC4899]" : "text-slate-500 hover:text-slate-900"
          )}
          title="Place Drop Location Flag"
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
            (activeTool === "marker" && activeMarkerType === "drop") ? "bg-[#EC4899] text-white" : "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
          )}>
            <Flag className="h-4.5 w-4.5" />
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase font-sans leading-none">Flag</span>
        </button>

        {/* DANGER SHORTCUT */}
        <button
          type="button"
          onClick={() => handleSelectMarkerTool("danger")}
          className={cn(
            "flex flex-col items-center gap-1 group cursor-pointer",
            (activeTool === "marker" && activeMarkerType === "danger") ? "text-[#EAB308]" : "text-slate-500 hover:text-slate-900"
          )}
          title="Place Danger Warning"
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
            (activeTool === "marker" && activeMarkerType === "danger") ? "bg-[#EAB308] text-white" : "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
          )}>
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase font-sans leading-none">Danger</span>
        </button>

        {/* DYNAMIC ROTATION PATH TOOL (Our refactored click point-by-point drawing!) */}
        <button
          type="button"
          onClick={() => setTool("rotation")}
          className={cn(
            "flex flex-col items-center gap-1 group cursor-pointer",
            activeTool === "rotation" ? "text-[#6366F1]" : "text-slate-500 hover:text-slate-900"
          )}
          title="Draw Point-by-Point Rotation Path (Compass)"
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
            activeTool === "rotation" ? "bg-slate-900 text-white animate-pulse" : "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
          )}>
            <Compass className="h-4.5 w-4.5" />
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase font-sans leading-none text-[#6366F1] font-mono">Path</span>
        </button>
      </div>

      {/* ROW 2: SHADES & ACTION UTILS */}
      <div className="flex items-center justify-between pt-1">
        
        {/* Left Side: Solid quick marker pills & Line Arrow */}
        <div className="flex items-center gap-1.5">
          {/* Enemy Marker Pill */}
          <button
            type="button"
            onClick={() => handleSelectMarkerTool("enemy")}
            className={cn(
              "h-8 px-2.5 rounded-full text-[10px] font-mono font-black uppercase text-white shadow-sm flex items-center gap-1 border border-transparent cursor-pointer transition-all",
              (activeTool === "marker" && activeMarkerType === "enemy")
                ? "bg-[#EF4444] scale-102 ring-2 ring-offset-2 ring-red-400"
                : "bg-[#EF4444]/90 hover:bg-[#EF4444]"
            )}
          >
            <Skull className="h-3 w-3" />
            <span>Enemy</span>
          </button>

          {/* Loot Marker Pill */}
          <button
            type="button"
            onClick={() => handleSelectMarkerTool("loot")}
            className={cn(
              "h-8 px-2.5 rounded-full text-[10px] font-mono font-black uppercase text-white shadow-sm flex items-center gap-1 border border-transparent cursor-pointer transition-all",
              (activeTool === "marker" && activeMarkerType === "loot")
                ? "bg-[#F97316] scale-102 ring-2 ring-offset-2 ring-orange-400"
                : "bg-[#F97316]/90 hover:bg-[#F97316]"
            )}
          >
            <Box className="h-3 w-3" />
            <span>Loot</span>
          </button>

          {/* Flag Marker Pill */}
          <button
            type="button"
            onClick={() => handleSelectMarkerTool("drop")}
            className={cn(
              "h-8 px-2.5 rounded-full text-[10px] font-mono font-black uppercase text-white shadow-sm flex items-center gap-1 border border-transparent cursor-pointer transition-all",
              (activeTool === "marker" && activeMarkerType === "drop")
                ? "bg-[#EC4899] scale-102 ring-2 ring-offset-2 ring-pink-400"
                : "bg-[#EC4899]/90 hover:bg-[#EC4899]"
            )}
          >
            <Flag className="h-3 w-3" />
            <span>Flag</span>
          </button>

          {/* Line Arrow Tool Pill */}
          <button
            type="button"
            onClick={() => setTool("arrow")}
            className={cn(
              "h-8 px-3 rounded-full text-[10px] font-mono font-black uppercase text-white shadow-sm flex items-center gap-1 border border-transparent cursor-pointer transition-all",
              activeTool === "arrow"
                ? "bg-[#3B82F6] scale-102 ring-2 ring-offset-2 ring-blue-400"
                : "bg-[#3B82F6]/90 hover:bg-[#3B82F6]"
            )}
          >
            <ArrowUpRight className="h-3 w-3" />
            <span>Line</span>
          </button>
        </div>

        {/* Right Side: MS Word Color Picker, Snap, Delete, Zoom & Save */}
        <div className="flex items-center gap-1.5">
          {/* Microsoft Word Color Picker Popover */}
          <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                title="Select MS Word Custom Color Hex"
              >
                <div 
                  className="h-3.5 w-3.5 rounded-full border border-slate-200" 
                  style={{ backgroundColor: activeColor }}
                />
                <Palette className="h-3.5 w-3.5 text-slate-500" />
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[310px] border border-slate-200 bg-white p-4 shadow-xl rounded-[16px]" align="end" side="top">
              <div className="space-y-3 select-none">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-800 font-sans">Theme Color Swatches</h4>
                  <p className="text-[9px] text-slate-450 mt-0.5 leading-none">Select fine custom hex shades for strategic whiteboard drawing</p>
                </div>
                
                {/* MS Word Grid of standard colors columns */}
                <div className="grid grid-cols-10 gap-1.5 bg-slate-50/50 p-2 border border-slate-100 rounded-lg">
                  {WORD_COLOR_GRID.map((colColors, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-1 items-center" title={COLOR_COLUMN_LABELS[colIdx]}>
                      {colColors.map((hex) => {
                        const isSelected = activeColor === hex;
                        return (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => {
                              setColor(hex);
                              setColorPopoverOpen(false);
                            }}
                            className={cn(
                              "h-5 w-5 rounded-md border hover:scale-115 active:scale-95 transition shadow-sm cursor-pointer shrink-0",
                              isSelected ? "border-slate-800 ring-1 ring-slate-800/40" : "border-slate-200/50"
                            )}
                            style={{ backgroundColor: hex }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-2 font-mono">
                  <span>Current Hex:</span>
                  <span className="font-bold text-slate-800">{activeColor.toUpperCase()}</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Snap Grid utility */}
          <button
            type="button"
            onClick={toggleSnapToGrid}
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer",
              snapToGrid
                ? "bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981] shadow-sm"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"
            )}
            title={snapToGrid ? "Align to grid active" : "Align drawings to grid"}
          >
            <Grid className="h-4 w-4" />
          </button>

          {/* Erase selected nodes utility */}
          <button
            type="button"
            onClick={deleteSelectedNodes}
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer shadow-sm transition-all"
            title="Delete Selected drawings (Backspace / Del)"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* Zoom Out view reset utility */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer shadow-sm transition-all"
            title="Reset Map Zoom and Pan coordinates"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Save Status mock utility */}
          <button
            type="button"
            className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center cursor-default shadow-sm"
            title="Drawing database automatically saved"
          >
            <Save className="h-4 w-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
