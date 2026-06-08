"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BuildingBoxProps {
  id: string;
  x: number;
  y: number;
  value: string;
  isEditable: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onChange: (text: string) => void;
  onBlur: () => void;
}

export function BuildingBox({
  x,
  y,
  value,
  isEditable,
  isDirty,
  isSaving,
  onChange,
  onBlur,
}: BuildingBoxProps) {
  return (
    <div
      className="absolute select-none pointer-events-auto"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 30,
      }}
    >
      <div className="relative group">
        {/* Glow indicator behind the box */}
        <div
          className={cn(
            "absolute -inset-0.5 rounded-lg opacity-35 blur-sm transition-all duration-300",
            isSaving && "bg-indigo-500 animate-pulse opacity-60",
            isDirty && !isSaving && "bg-amber-500 opacity-50",
            !isDirty && value && "bg-emerald-500/30 group-hover:opacity-50"
          )}
        />

        {/* Input Text Box */}
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={!isEditable}
          placeholder={isEditable ? "Add callout..." : ""}
          className={cn(
            "w-36 h-8 text-[11px] font-black uppercase tracking-wider text-center rounded-lg border bg-slate-950/80 backdrop-blur-md text-white transition-all duration-200 shadow-lg px-2",
            isEditable
              ? "placeholder:text-slate-600 focus:placeholder:text-transparent border-slate-800/80 hover:border-slate-700/80 focus:border-indigo-500/80 focus:ring-0 cursor-text"
              : "border-slate-800/30 text-slate-300 disabled:opacity-100 disabled:cursor-not-allowed",
            isDirty && "border-amber-500/50 focus:border-amber-500",
            isSaving && "border-indigo-500/50",
            !isDirty && value && "border-emerald-500/30 hover:border-emerald-500/50"
          )}
        />

        {/* Small Status Dot Indicator */}
        {isEditable && (isDirty || isSaving) && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                isSaving ? "bg-indigo-400" : "bg-amber-400"
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                isSaving ? "bg-indigo-500" : "bg-amber-500"
              )}
            />
          </span>
        )}
      </div>
    </div>
  );
}
