"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Target, TrendingUp } from "lucide-react";

interface OverallStandingsFormProps {
  sessionId: string;
  onSaveComplete: () => void;
  initialStanding?: number | null;
  initialAbove?: number | null;
  initialBelow?: number | null;
  initialFirst?: number | null;
}

export function OverallStandingsForm({
  sessionId,
  onSaveComplete,
  initialStanding = 1,
  initialAbove = null,
  initialBelow = null,
  initialFirst = null,
}: OverallStandingsFormProps) {
  const [standing, setStanding] = useState<number>(initialStanding || 1);
  
  // Dynamic neighboring points inputs
  const [abovePoints, setAbovePoints] = useState<string>(initialAbove !== null ? String(initialAbove) : "");
  const [belowPoints, setBelowPoints] = useState<string>(initialBelow !== null ? String(initialBelow) : "");
  const [firstPlacePoints, setFirstPlacePoints] = useState<string>(initialFirst !== null ? String(initialFirst) : "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: Record<string, any> = {
      overall_standing: standing,
      above_team_points: null,
      below_team_points: null,
      first_place_points: null,
    };

    if (standing === 1) {
      payload.below_team_points = parseInt(belowPoints) || 0; // index 2 team
      payload.first_place_points = parseInt(firstPlacePoints) || 0; // index 3 team
    } else if (standing === 2) {
      payload.above_team_points = parseInt(abovePoints) || 0; // index 1 team
      payload.below_team_points = parseInt(belowPoints) || 0; // index 3 team
      payload.first_place_points = parseInt(firstPlacePoints) || 0; // index 4 team
    } else {
      payload.above_team_points = parseInt(abovePoints) || 0; // position - 1
      payload.below_team_points = parseInt(belowPoints) || 0; // position + 1
      payload.first_place_points = parseInt(firstPlacePoints) || 0; // position 1
    }

    try {
      const response = await fetch(`/api/scrims/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save standings");
      }

      toast.success("Overall lobby standings saved successfully!");
      onSaveComplete();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-[#E5E7EB] bg-white rounded-[12px] shadow-sm">
      <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
          <Target className="h-4.5 w-4.5 text-[#6366F1]" />
          Overall Lobby Standings
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">What position did your team finish?</label>
            <select
              value={standing}
              onChange={(e) => setStanding(Number(e.target.value))}
              className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1} className="text-[#111827]">
                  {i + 1}
                  {i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} Place Overall
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Neighbor inputs */}
          <div className="bg-slate-50 border border-[#E5E7EB] rounded-lg p-3 space-y-3.5">
            <div className="flex items-center gap-1.5 pb-2 border-b border-[#E5E7EB] text-[#6366F1] font-semibold text-[10px] uppercase tracking-wide">
              <TrendingUp className="h-4 w-4" />
              Lobby Standings Comparison Metrics
            </div>

            {standing === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Points of 2nd Place Team</label>
                  <input
                    type="number"
                    min="0"
                    value={belowPoints}
                    onChange={(e) => setBelowPoints(e.target.value)}
                    required
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium font-mono text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Points of 3rd Place Team</label>
                  <input
                    type="number"
                    min="0"
                    value={firstPlacePoints}
                    onChange={(e) => setFirstPlacePoints(e.target.value)}
                    required
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium font-mono text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {standing === 2 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Points of 1st Place Team</label>
                  <input
                    type="number"
                    min="0"
                    value={abovePoints}
                    onChange={(e) => setAbovePoints(e.target.value)}
                    required
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium font-mono text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Points of 3rd Place Team</label>
                  <input
                    type="number"
                    min="0"
                    value={belowPoints}
                    onChange={(e) => setBelowPoints(e.target.value)}
                    required
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium font-mono text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Points of 4th Place Team</label>
                  <input
                    type="number"
                    min="0"
                    value={firstPlacePoints}
                    onChange={(e) => setFirstPlacePoints(e.target.value)}
                    required
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium font-mono text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {standing >= 3 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Points of Team Directly Above ({standing - 1}th)</label>
                  <input
                    type="number"
                    min="0"
                    value={abovePoints}
                    onChange={(e) => setAbovePoints(e.target.value)}
                    required
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium font-mono text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Points of Team Directly Below ({standing + 1}th)</label>
                  <input
                    type="number"
                    min="0"
                    value={belowPoints}
                    onChange={(e) => setBelowPoints(e.target.value)}
                    required
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium font-mono text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Points of 1st Place Team</label>
                  <input
                    type="number"
                    min="0"
                    value={firstPlacePoints}
                    onChange={(e) => setFirstPlacePoints(e.target.value)}
                    required
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-xs font-medium font-mono text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-xs font-bold uppercase tracking-wider py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-[8px]"
          >
            {isSubmitting ? "Saving Standings..." : "Save Standings & Ratios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
