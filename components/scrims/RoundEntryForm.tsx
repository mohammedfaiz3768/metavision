"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculateTotalPoints } from "@/lib/points";
import { MAP_LIST } from "@/lib/whiteboard/map-config";
import { toast } from "sonner";
import { Swords, Eye } from "lucide-react";

interface RoundEntryFormProps {
  sessionId: string;
  totalRounds: number;
  existingRounds: any[];
  onRoundAdded: () => void;
}

export function RoundEntryForm({
  sessionId,
  totalRounds,
  existingRounds,
  onRoundAdded,
}: RoundEntryFormProps) {
  const [roundNumber, setRoundNumber] = useState<number>(() => {
    // Default to the first available round number
    const roundNums = existingRounds.map((r) => r.round_number);
    for (let i = 1; i <= totalRounds; i++) {
      if (!roundNums.includes(i)) return i;
    }
    return 1;
  });

  const [placement, setPlacement] = useState<number>(1);
  const [kills, setKills] = useState<number>(0);
  const [map, setMap] = useState<string>("bermuda");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live points calculation preview
  const { placementPoints, killPoints, totalPoints } = calculateTotalPoints(placement, kills);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/scrims/${sessionId}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round_number: roundNumber,
          placement,
          kills,
          map,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add round");
      }

      toast.success(`Successfully saved Match ${roundNumber}!`);
      onRoundAdded();
      
      // Auto advance round select if rounds remaining
      const nextRoundNums = [...existingRounds, { round_number: roundNumber }].map((r) => r.round_number);
      let nextAvailable = 1;
      for (let i = 1; i <= totalRounds; i++) {
        if (!nextRoundNums.includes(i)) {
          nextAvailable = i;
          break;
        }
      }
      setRoundNumber(nextAvailable);
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormComplete = existingRounds.length >= totalRounds;

  return (
    <Card className="border-[#E5E7EB] bg-white rounded-[12px] shadow-sm">
      <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
          <Swords className="h-4.5 w-4.5 text-[#6366F1]" />
          Record Match Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isFormComplete ? (
          <div className="text-center py-4 space-y-1">
            <span className="text-xs text-slate-500 font-medium block">All {totalRounds} matches have been recorded!</span>
            <span className="text-[10px] text-slate-400 block">Proceed below to save overall standings details.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              {/* Round Number select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 font-mono">Match Number</label>
                <select
                  value={roundNumber}
                  onChange={(e) => setRoundNumber(Number(e.target.value))}
                  className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                >
                  {Array.from({ length: totalRounds }).map((_, i) => {
                    const rNum = i + 1;
                    const isRecorded = existingRounds.some((r) => r.round_number === rNum);
                    return (
                      <option key={rNum} value={rNum} disabled={isRecorded} className="text-[#111827]">
                        Match {rNum} {isRecorded ? "(Saved)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Map Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 font-mono">Map</label>
                <select
                  value={map}
                  onChange={(e) => setMap(e.target.value)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium text-[#111827] capitalize focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                >
                  {MAP_LIST.map((m) => (
                    <option key={m.id} value={m.id} className="text-[#111827]">
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Placement */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 font-mono">Placement</label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(Number(e.target.value))}
                  className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={i + 1} className="text-[#111827]">
                      {i + 1}
                      {i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} Place
                    </option>
                  ))}
                </select>
              </div>

              {/* Kills */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 font-mono">Kills</label>
                <input
                  type="number"
                  min="0"
                  value={kills}
                  onChange={(e) => setKills(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium text-[#111827] font-mono focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                />
              </div>
            </div>

            {/* Live Point Math Preview */}
            <div className="bg-slate-50 border border-[#E5E7EB] rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block font-mono">Placement Points</span>
                <span className="text-xs font-mono font-bold text-[#111827]">{placementPoints} pts</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block font-mono">Kill Points</span>
                <span className="text-xs font-mono font-bold text-[#111827]">{killPoints} pts</span>
              </div>
              <div className="border-l border-[#E5E7EB]">
                <span className="text-[9px] uppercase font-bold text-[#6366F1] block font-mono">Total Points</span>
                <span className="text-sm font-mono font-extrabold text-[#6366F1]">{totalPoints} pts</span>
              </div>
            </div>

            {/* Placement Reference Image Modal Trigger / Display */}
            <div className="bg-slate-50 border border-[#E5E7EB] rounded-lg p-3 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase font-bold text-[#6366F1] font-mono">Placement Point Matrix</span>
                <span className="text-[10px] text-slate-500">Reference standard lobby points values.</span>
              </div>
              <a
                href="/scrim-placement-points.png"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold text-[#6366F1] uppercase tracking-wide hover:text-[#4F46E5] hover:underline font-mono"
              >
                <Eye className="h-3.5 w-3.5" />
                View Points Matrix
              </a>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-xs font-bold uppercase tracking-wider py-2.5 font-mono bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-[8px]"
            >
              {isSubmitting ? "Saving Match Data..." : "Submit Match Points"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
