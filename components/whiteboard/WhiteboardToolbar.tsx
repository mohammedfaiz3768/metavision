"use client";

import { useState, useRef } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MousePointer,
  Hand,
  Pencil,
  Compass,
  ArrowUpRight,
  Square,
  Circle,
  Type,
  MapPin,
  Image as ImageIcon,
  Eraser,
  Shield,
  ChevronRight,
} from "lucide-react";
import type { ToolType } from "@/lib/types/app.types";

interface WhiteboardToolbarProps {
  onAddLogo?: () => void;
}

const QUICK_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#10B981", 
  "#06B6D4", "#3B82F6", "#6366F1", "#A855F7", "#EC4899", 
  "#FFFFFF", "#94A3B8", "#475569", "#000000"
];

export function WhiteboardToolbar({ onAddLogo }: WhiteboardToolbarProps) {
  const {
    activeTool,
    setTool,
    setActiveMarker,
    activeLayer,
    activeColor,
    setColor,
  } = useCanvasStore();

  // Controlled Popover state to prevent overlapping menus
  const [openMenu, setOpenMenu] = useState<"draw" | "shapes" | "color" | null>(null);

  const handleSelectMarkerTool = (markerId: string) => {
    setTool("marker");
    setActiveMarker(markerId);
    setOpenMenu(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 3MB = 3 * 1024 * 1024 bytes
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image size exceeds the 3MB limit!");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (!base64Url) return;

      const store = useCanvasStore.getState();
      store.setPendingLogo({
        name: file.name.substring(0, 15),
        url: base64Url,
        isCircular: false, // uploaded custom images are rectangular by default
      });
      store.setTool("logo-place");
      toast.info(`Image "${file.name}" loaded! Click on the map to place it.`);
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="w-[65px] bg-[#13151D]/95 backdrop-blur-md border border-slate-800/80 p-2.5 rounded-[16px] shadow-2xl flex flex-col gap-4.5 items-center select-none max-h-full py-5 text-slate-400">
      
      {/* 1. SELECT TOOL */}
      <button
        type="button"
        onClick={() => {
          setTool("select");
          setOpenMenu(null);
        }}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border group relative",
          activeTool === "select"
            ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
            : "bg-[#1C1E26] hover:bg-[#252833] border-slate-800 hover:text-slate-100"
        )}
        title="Select Tool (V)"
      >
        <MousePointer className="h-4.5 w-4.5" />
        <span className="absolute left-[54px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold text-white shadow-md font-mono pointer-events-none whitespace-nowrap">
          Select (V)
        </span>
      </button>

      {/* 2. HAND / PAN TOOL */}
      <button
        type="button"
        onClick={() => {
          setTool("pan");
          setOpenMenu(null);
        }}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border group relative",
          activeTool === "pan"
            ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] animate-pulse"
            : "bg-[#1C1E26] hover:bg-[#252833] border-slate-800 hover:text-slate-100"
        )}
        title="Hand Pan Tool (H / Spacebar)"
      >
        <Hand className="h-4.5 w-4.5" />
        <span className="absolute left-[54px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold text-white shadow-md font-mono pointer-events-none whitespace-nowrap">
          Pan Map (H)
        </span>
      </button>

      <div className="h-[1px] w-6 bg-slate-800/80" />

      {/* 3. NESTED DRAW MENU POPUP */}
      <Popover open={openMenu === "draw"} onOpenChange={(open) => setOpenMenu(open ? "draw" : null)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-10 w-10 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border group relative",
              ["freedraw", "rotation", "arrow"].includes(activeTool)
                ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                : "bg-[#1C1E26] hover:bg-[#252833] border-slate-800 hover:text-slate-100"
            )}
            title="Expand Drawing Paths"
          >
            <Pencil className="h-4 w-4" />
            <ChevronRight className="h-2.5 w-2.5 mt-0.5 text-slate-500 group-hover:text-slate-300" />
            <span className="absolute left-[54px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold text-white shadow-md font-mono pointer-events-none whitespace-nowrap">
              Draw Tools
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 bg-[#13151D] border border-slate-800 p-2.5 rounded-[12px] shadow-2xl animate-in fade-in-0 slide-in-from-left-2 duration-100" align="start" side="right">
          <div className="space-y-1.5 select-none text-slate-400">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 border-b border-slate-800/60 pb-1">Drawing Actions</h4>
            
            {/* Free Draw */}
            <button
              type="button"
              onClick={() => {
                setTool("freedraw");
                setOpenMenu(null);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition",
                activeTool === "freedraw" ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 font-bold" : "hover:bg-[#1C1E26] hover:text-slate-100 border border-transparent"
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Freehand Pencil</span>
            </button>

            {/* Rotation Path */}
            <button
              type="button"
              onClick={() => {
                setTool("rotation");
                setOpenMenu(null);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition",
                activeTool === "rotation" ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 font-bold animate-pulse" : "hover:bg-[#1C1E26] hover:text-slate-100 border border-transparent"
              )}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Rotation Path</span>
            </button>

            {/* Arrow Path */}
            <button
              type="button"
              onClick={() => {
                setTool("arrow");
                setOpenMenu(null);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition",
                activeTool === "arrow" ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 font-bold" : "hover:bg-[#1C1E26] hover:text-slate-100 border border-transparent"
              )}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Line Arrow</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* 4. NESTED SHAPES MENU POPUP */}
      <Popover open={openMenu === "shapes"} onOpenChange={(open) => setOpenMenu(open ? "shapes" : null)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-10 w-10 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border group relative",
              ["circle", "rect"].includes(activeTool)
                ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                : "bg-[#1C1E26] hover:bg-[#252833] border-slate-800 hover:text-slate-100"
            )}
            title="Expand Vector Shapes"
          >
            <Square className="h-4 w-4" />
            <ChevronRight className="h-2.5 w-2.5 mt-0.5 text-slate-500 group-hover:text-slate-300" />
            <span className="absolute left-[54px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold text-white shadow-md font-mono pointer-events-none whitespace-nowrap">
              Shapes Tool
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 bg-[#13151D] border border-slate-800 p-2.5 rounded-[12px] shadow-2xl animate-in fade-in-0 slide-in-from-left-2 duration-100" align="start" side="right">
          <div className="space-y-1.5 select-none text-slate-400">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 border-b border-slate-800/60 pb-1">Vector Objects</h4>
            
            {/* Rectangle */}
            <button
              type="button"
              onClick={() => {
                setTool("rect");
                setOpenMenu(null);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition",
                activeTool === "rect" ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 font-bold" : "hover:bg-[#1C1E26] hover:text-slate-100 border border-transparent"
              )}
            >
              <Square className="h-3.5 w-3.5" />
              <span>Rectangle Shape</span>
            </button>

            {/* Circle */}
            <button
              type="button"
              onClick={() => {
                setTool("circle");
                setOpenMenu(null);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition",
                activeTool === "circle" ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 font-bold" : "hover:bg-[#1C1E26] hover:text-slate-100 border border-transparent"
              )}
            >
              <Circle className="h-3.5 w-3.5" />
              <span>Circle Boundary</span>
            </button>

            {/* Safe Zone */}
            <button
              type="button"
              onClick={() => {
                setTool("circle");
                setOpenMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition hover:bg-[#1C1E26] hover:text-slate-100 border border-transparent"
            >
              <Shield className="h-3.5 w-3.5 text-[#10B981]" />
              <span>Safe Zone Area</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* 5. TEXT TOOL */}
      <button
        type="button"
        onClick={() => {
          setTool("text");
          setOpenMenu(null);
        }}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border group relative",
          activeTool === "text"
            ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
            : "bg-[#1C1E26] hover:bg-[#252833] border-slate-800 hover:text-slate-100"
        )}
        title="Insert Text Node (T)"
      >
        <Type className="h-4.5 w-4.5" />
        <span className="absolute left-[54px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold text-white shadow-md font-mono pointer-events-none whitespace-nowrap">
          Text (T)
        </span>
      </button>

      {/* 6. MARKER TOOL QUICK TRIGGER */}
      <button
        type="button"
        onClick={() => handleSelectMarkerTool("drop")}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border group relative",
          activeTool === "marker"
            ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
            : "bg-[#1C1E26] hover:bg-[#252833] border-slate-800 hover:text-slate-100"
        )}
        title="Marker Mode (M)"
      >
        <MapPin className="h-4.5 w-4.5" />
        <span className="absolute left-[54px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold text-white shadow-md font-mono pointer-events-none whitespace-nowrap">
          Markers (M)
        </span>
      </button>

      {/* 7. COLOR PALETTE PICKER */}
      <Popover open={openMenu === "color"} onOpenChange={(open) => setOpenMenu(open ? "color" : null)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border border-slate-800 hover:border-slate-700 bg-[#1C1E26] hover:bg-[#252833] relative group shadow-sm"
            title="Choose Drawing Color"
          >
            <span
              className="h-4.5 w-4.5 rounded-full border border-white/20 shadow-inner transition-transform group-hover:scale-110"
              style={{ backgroundColor: activeColor }}
            />
            <span className="absolute left-[54px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold text-white shadow-md font-mono pointer-events-none whitespace-nowrap">
              Color Palette
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 bg-[#13151D] border border-slate-800 p-2.5 rounded-[12px] shadow-2xl animate-in fade-in-0 slide-in-from-left-2 duration-100" align="start" side="right">
          <div className="space-y-2 select-none text-slate-400">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 border-b border-slate-800/60 pb-1">Color Swatches</h4>
            <div className="grid grid-cols-4 gap-1.5 p-0.5">
              {QUICK_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setColor(color);
                    setOpenMenu(null);
                  }}
                  className={cn(
                    "h-6 w-full rounded-md border border-white/10 transition-transform hover:scale-110 cursor-pointer relative",
                    activeColor === color && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#13151D]"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 8. IMAGE OVERLAY UPLOAD */}
      <button
        type="button"
        onClick={() => {
          setOpenMenu(null);
          document.getElementById("whiteboard-image-upload")?.click();
        }}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border group relative",
          activeTool === "logo-place"
            ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse"
            : "bg-[#1C1E26] hover:bg-[#252833] border-slate-800 hover:text-slate-100"
        )}
        title={activeTool === "logo-place" ? "Logo Placement Active — Click on map to place" : "Upload Custom Image (Max 3MB)"}
      >
        <ImageIcon className={cn("h-4.5 w-4.5", activeTool === "logo-place" ? "text-white" : "text-[#10B981]")} />
        <span className="absolute left-[54px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold text-white shadow-md font-mono pointer-events-none whitespace-nowrap">
          {activeTool === "logo-place" ? "Placing Logo..." : "Upload Image"}
        </span>
      </button>
      <input
        type="file"
        id="whiteboard-image-upload"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <div className="h-[1px] w-6 bg-slate-800/80 mt-auto" />

      {/* 9. ERASER TOOL */}
      <button
        type="button"
        onClick={() => {
          setTool("eraser");
          setOpenMenu(null);
        }}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border group relative shadow-sm",
          activeTool === "eraser"
            ? "bg-rose-600 border-rose-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]"
            : "bg-[#1C1E26] hover:bg-rose-950/20 hover:border-rose-900/50 border-slate-800 text-rose-400 hover:text-rose-300"
        )}
        title="Eraser Tool (E) - Click nodes to erase"
      >
        <Eraser className="h-4.5 w-4.5" />
        <span className="absolute left-[54px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold text-white shadow-md font-mono pointer-events-none whitespace-nowrap">
          Eraser Tool (E)
        </span>
      </button>
    </div>
  );
}
