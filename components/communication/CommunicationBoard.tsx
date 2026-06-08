"use client";

import Link from "next/link";
import { ArrowLeft, Cloud, CloudLightning, Loader2, Save, ShieldAlert } from "lucide-react";
import { useCommunicationBoard } from "@/hooks/useCommunicationBoard";
import { COMMUNICATION_MAPS } from "@/lib/communication/building-data";
import { BuildingBox } from "./BuildingBox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CommunicationBoardProps {
  mapId: string;
}

export function CommunicationBoard({ mapId }: CommunicationBoardProps) {
  const mapConfig = COMMUNICATION_MAPS.find((m) => m.id === mapId);

  const {
    localCallouts,
    updateCallout,
    handleBlur,
    saveAll,
    hasChanges,
    saveStatus,
    isLoading,
    error,
    userRole,
    isEditable,
  } = useCommunicationBoard(mapId);

  if (!mapConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center select-none">
        <ShieldAlert className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Map Layout Not Configured</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-sm">
          The map ID "{mapId}" does not have building structures defined.
        </p>
        <Link href="/communication" className="mt-6">
          <Button variant="outline" className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Selector
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center select-none">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm animate-pulse">Loading compound layout...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center select-none">
        <CloudLightning className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Failed to load callouts</h2>
        <p className="text-rose-400/80 text-sm mt-2 max-w-sm">
          {(error as Error).message || "An error occurred while connecting to the database."}
        </p>
        <Link href="/communication" className="mt-6">
          <Button variant="outline" className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Selector
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Top Navbar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/communication">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 hover:text-white cursor-pointer rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {mapConfig.displayName} Callouts
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">Team Active Strategy Board</span>
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <span className="text-xs text-slate-400 font-mono uppercase">Role: {userRole}</span>
            </div>
          </div>
        </div>

        {/* State Indicators & Actions */}
        <div className="flex items-center gap-3">
          {/* View Only Badge if not allowed to edit */}
          {!isEditable && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-lg">
              View Only
            </Badge>
          )}

          {/* Sync status indicators */}
          {isEditable && (
            <div className="flex items-center gap-2 bg-[#13151D] border border-slate-800/80 px-3 py-1.5 rounded-xl shadow-inner">
              {saveStatus === "saved" && (
                <>
                  <Cloud className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Saved
                  </span>
                </>
              )}
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                    Saving...
                  </span>
                </>
              )}
              {saveStatus === "idle" && hasChanges && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                    Unsaved
                  </span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                    Error
                  </span>
                </>
              )}
            </div>
          )}

          {/* Save All Button */}
          {isEditable && (
            <Button
              onClick={saveAll}
              disabled={!hasChanges || saveStatus === "saving"}
              className={cn(
                "h-10 px-4 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-all duration-200",
                hasChanges
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10"
                  : "bg-slate-800/50 text-slate-500 border border-slate-800/80"
              )}
            >
              <Save className="h-4 w-4 mr-2" />
              Save All
            </Button>
          )}
        </div>
      </div>

      {/* Map Drawing Layout Container */}
      <div className="flex justify-center items-center p-6 bg-[#0E1015]/80 border border-slate-800/50 rounded-2xl relative shadow-2xl overflow-x-auto min-h-[400px]">
        {/* Esports Grid Pattern Background overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 z-0" />

        {/* Map wrapper container with specific aspect ratio */}
        <div
          className="relative w-full max-w-4xl border border-slate-800/60 rounded-xl overflow-hidden shadow-2xl z-10 select-none bg-[#13151D]"
          style={{
            aspectRatio: mapConfig.aspectRatio,
          }}
        >
          {/* Background Map Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapConfig.imagePath}
            alt={mapConfig.displayName}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          />

          {/* Dark scrim overlay */}
          <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />

          {/* Building Callout Boxes */}
          {mapConfig.buildings.map((building) => {
            const val = localCallouts[building.id] || "";
            return (
              <BuildingBox
                key={building.id}
                id={building.id}
                x={building.x}
                y={building.y}
                value={val}
                isEditable={isEditable}
                isDirty={!!useCommunicationBoard.name && false} // handled by hook state
                isSaving={false} // hook-level saving state
                onChange={(text) => updateCallout(building.id, text)}
                onBlur={() => handleBlur(building.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
