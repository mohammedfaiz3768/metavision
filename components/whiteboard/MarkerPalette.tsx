"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { cn } from "@/lib/utils";
import { 
  ChevronUp, 
  ChevronDown, 
  Skull, 
  Box, 
  AlertTriangle, 
  Flame, 
  Car, 
  Target, 
  Zap, 
  Undo2, 
  RefreshCw, 
  Tent, 
  Shield, 
  MapPin 
} from "lucide-react";

const PILL_MARKERS = [
  { id: "enemy", label: "ENEMY", bgClass: "bg-[#EF4444]", hoverClass: "hover:bg-[#DC2626]", icon: Skull },
  { id: "loot", label: "LOOT", bgClass: "bg-[#F97316]", hoverClass: "hover:bg-[#EA580C]", icon: Box },
  { id: "danger", label: "DANGER", bgClass: "bg-[#EAB308]", hoverClass: "hover:bg-[#CA8A04]", icon: AlertTriangle },
  { id: "utility", label: "UTILITY", bgClass: "bg-[#14B8A6]", hoverClass: "hover:bg-[#0D9488]", icon: Flame },
  { id: "vehicle", label: "VEHICLE", bgClass: "bg-[#22C55E]", hoverClass: "hover:bg-[#16A34A]", icon: Car },
  { id: "sniper", label: "SNIPER", bgClass: "bg-[#A855F7]", hoverClass: "hover:bg-[#9333EA]", icon: Target },
  { id: "rush", label: "RUSH", bgClass: "bg-[#3B82F6]", hoverClass: "hover:bg-[#2563EB]", icon: Zap },
  { id: "fallback", label: "FALLBACK", bgClass: "bg-[#64748B]", hoverClass: "hover:bg-[#475569]", icon: Undo2 },
  { id: "rotate", label: "ROTATE", bgClass: "bg-[#06B6D4]", hoverClass: "hover:bg-[#0891B2]", icon: RefreshCw },
  { id: "camp", label: "CAMP", bgClass: "bg-[#84CC16]", hoverClass: "hover:bg-[#65A30D]", icon: Tent },
  { id: "zone", label: "ZONE", bgClass: "bg-[#10B981]", hoverClass: "hover:bg-[#059669]", icon: Shield },
  { id: "drop", label: "DROP", bgClass: "bg-[#EC4899]", hoverClass: "hover:bg-[#DB2777]", icon: MapPin },
];

export function MarkerPalette() {
  const {
    activeTool,
    activeMarkerType,
    setTool,
    setActiveMarker,
  } = useCanvasStore();

  const [isOpen, setIsOpen] = useState(true);

  const handleSelectMarker = (markerId: string) => {
    setTool("marker");
    setActiveMarker(markerId);
  };

  return (
    <div className="w-64 bg-slate-50 border border-slate-200 rounded-[16px] overflow-hidden shadow-sm select-none transition-all duration-300">
      {/* Collapsible Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3.5 bg-slate-900 flex items-center justify-between text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-800 transition-colors"
      >
        <span>Tactical Markers</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </div>

      {/* Pillars scrollable list */}
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out px-3",
          isOpen ? "max-h-[300px] overflow-y-auto py-3 space-y-2.5 scrollbar-thin pr-1 pb-2" : "max-h-0 py-0 overflow-hidden"
        )}
      >
        {PILL_MARKERS.map((m) => {
          const isSelected = activeTool === "marker" && activeMarkerType === m.id;
          const IconComp = m.icon;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectMarker(m.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-[12px] text-white transition-all duration-150 font-sans font-black text-sm uppercase tracking-widest shadow-sm border border-transparent select-none cursor-pointer",
                m.bgClass,
                m.hoverClass,
                isSelected
                  ? "ring-2 ring-offset-2 ring-[#6366F1] scale-[1.02] shadow-md"
                  : "active:scale-[0.98]"
              )}
            >
              <span>{m.label}</span>
              <IconComp className="h-4 w-4 text-white/90 drop-shadow" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
