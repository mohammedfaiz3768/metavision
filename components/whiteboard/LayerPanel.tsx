"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { LayerType } from "@/lib/types/app.types";

const LAYER_DETAILS: Record<
  "rotations" | "enemy_routes" | "zones" | "utility" | "notes",
  { label: string; color: string; desc: string; switchColor: string }
> = {
  rotations: {
    label: "Rotation Lines",
    color: "#2563EB",
    desc: "Blue",
    switchColor: "bg-[#2563EB]",
  },
  enemy_routes: {
    label: "Enemy Routes",
    color: "#DC2626",
    desc: "Red",
    switchColor: "bg-[#DC2626]",
  },
  zones: {
    label: "Tactical Zones",
    color: "#10B981",
    desc: "Yellow / Green",
    switchColor: "bg-[#10B981]",
  },
  utility: {
    label: "Utility Spots",
    color: "#F97316",
    desc: "Orange",
    switchColor: "bg-[#F97316]",
  },
  notes: {
    label: "Strategic Notes",
    color: "#A855F7",
    desc: "Purple",
    switchColor: "bg-[#A855F7]",
  },
};

export function LayerPanel() {
  const {
    activeLayer,
    setActiveLayer,
    layerVisibility,
    toggleLayerVisibility,
  } = useCanvasStore();

  const [isOpen, setIsOpen] = useState(true);

  const layersList = ["rotations", "enemy_routes", "zones", "utility", "notes"] as const;

  return (
    <div className="w-64 bg-slate-50 border border-slate-200 rounded-[16px] overflow-hidden shadow-sm select-none transition-all duration-300">
      {/* Collapsible Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3.5 bg-slate-900 flex items-center justify-between text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-800 transition-colors"
      >
        <span>Tactical Layers</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </div>

      {/* Collapsible Layer List Card Cards */}
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out px-3",
          isOpen ? "max-h-[250px] overflow-y-auto py-3 space-y-2.5 scrollbar-thin pr-1 pb-2" : "max-h-0 py-0 overflow-hidden"
        )}
      >
        {layersList.map((layer) => {
          const detail = LAYER_DETAILS[layer];
          const isVisible = layerVisibility[layer as LayerType] !== false;
          const isActive = activeLayer === layer;

          return (
            <div
              key={layer}
              onClick={() => setActiveLayer(layer as LayerType)}
              className={cn(
                "group flex items-center justify-between p-3 rounded-[12px] transition-all duration-150 cursor-pointer border select-none",
                isActive
                  ? "bg-white border-[#6366F1] shadow-[0_2px_10px_rgba(99,102,241,0.08)] ring-1 ring-[#6366F1]/20"
                  : "bg-white border-slate-100 hover:border-slate-250 hover:bg-slate-50/20"
              )}
            >
              {/* Left Side: Color indicator & text */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: detail.color }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-800 tracking-tight leading-none">
                    {detail.label}
                  </span>
                  <span className="text-[10px] text-slate-450 font-bold mt-1 font-mono leading-none">
                    {detail.desc}
                  </span>
                </div>
              </div>

              {/* Right Side: ON/OFF Custom Toggle Switch */}
              <button
                type="button"
                className={cn(
                  "relative w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center shrink-0 shadow-inner",
                  isVisible ? detail.switchColor : "bg-slate-200"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(layer as LayerType);
                }}
                title={isVisible ? "Hide layer" : "Show layer"}
              >
                {/* ON/OFF Labels inside switch */}
                <span className={cn("text-[7px] font-black text-white uppercase ml-1.5 transition-opacity", !isVisible && "opacity-0 select-none")}>ON</span>
                <span className={cn("text-[7px] font-black text-slate-400 uppercase mr-1.5 ml-auto transition-opacity", isVisible && "opacity-0 select-none")}>OFF</span>
                
                {/* Circular thumb slider */}
                <span
                  className={cn(
                    "absolute w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md",
                    isVisible ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
