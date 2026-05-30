"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTeam } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MAP_LIST } from "@/lib/whiteboard/map-config";
import { ArrowLeft, Loader2, Map as MapIcon, Compass } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NewBoardPage() {
  const { currentTeam } = useTeam();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selectedMap, setSelectedMap] = useState<string>("bermuda");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          map: selectedMap,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create strategy board");
      }

      const board = await response.json();
      toast.success("Strategy board created successfully!");
      router.push(`/boards/${board.id}`);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 select-none text-[#F1F1F3]">
        <div className="h-12 w-12 rounded-full bg-[#1E1F28] border border-[#2A2B35] flex items-center justify-center mb-4">
          <MapIcon className="h-6 w-6 text-[#9CA3AF]" />
        </div>
        <h2 className="text-xl font-bold text-white">No Active Roster</h2>
        <p className="text-sm text-[#9CA3AF] mt-1 max-w-sm">
          Please join or create a team from your dashboard to create strategy boards.
        </p>
        <Link href="/dashboard" className="mt-4">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#F1F1F3] select-none">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-[#2A2B35]/40 pb-4">
        <Link href="/boards">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-[#2A2B35] bg-[#13141A] hover:bg-[#1E1F28] hover:text-white rounded-[8px] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-[22px] font-bold text-white tracking-tight">
            Create Strategy Board
          </h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Establish a drawing canvas on a competitive Free Fire map.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate}>
        <div className="grid grid-cols-1 gap-6">
          {/* Card: Details & Selection */}
          <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
            <CardHeader className="pb-4 border-b border-[#2A2B35]/40 bg-[#09090C]/20">
              <div className="flex items-center gap-2 text-[#7C3AED] text-xs font-semibold uppercase tracking-wider mb-1 font-mono">
                <Compass className="h-4 w-4 text-[#7C3AED]" />
                <span>Map Deployment settings</span>
              </div>
              <CardTitle className="text-lg font-bold text-white">Canvas Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
              {/* Board Title Input */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-semibold text-[#9CA3AF]">
                  Board Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Bermuda Round 2 Rotations, Purgatory Hotdrop Plan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={100}
                  className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 rounded-[8px] focus-visible:ring-[#7C3AED] placeholder-[#6B7280]"
                />
              </div>

              {/* Map Selection Grid */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Select Map</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {MAP_LIST.map((map) => {
                    const isSelected = selectedMap === map.id;
                    return (
                      <div
                        key={map.id}
                        onClick={() => !loading && setSelectedMap(map.id)}
                        className={cn(
                          "relative aspect-[4/3] rounded-[8px] border bg-[#1E1F28] overflow-hidden cursor-pointer select-none group transition-all duration-300",
                          isSelected
                            ? "border-[#7C3AED] ring-2 ring-[#7C3AED]/40 scale-[1.02]"
                            : "border-[#2A2B35] hover:border-[#7C3AED]/40"
                        )}
                      >
                        {/* Map Background image */}
                        <img
                          src={map.publicPath}
                          alt={map.displayName}
                          className={cn(
                            "object-cover w-full h-full transition-transform duration-300",
                            isSelected ? "opacity-90" : "opacity-45 group-hover:opacity-75 group-hover:scale-105"
                          )}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                        {/* Display Name text overlay */}
                        <span className="absolute bottom-2.5 left-2.5 text-xs font-extrabold tracking-tight text-white capitalize select-none">
                          {map.displayName}
                        </span>

                        {/* Selected Indicator marker */}
                        {isSelected && (
                          <span className="absolute top-2 right-2 h-4.5 w-4.5 rounded-full bg-[#7C3AED] border border-[#2A2B35] flex items-center justify-center text-[10px] text-white font-bold select-none shadow">
                            ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t border-[#2A2B35]/40 pt-4 px-6 pb-6 select-none bg-[#09090C]/10">
              <Link href="/boards">
                <Button type="button" variant="ghost" disabled={loading} className="text-[#9CA3AF] hover:text-white hover:bg-[#1E1F28] rounded-[8px] transition-colors">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading || !title.trim()}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-1.5 cursor-pointer font-mono uppercase tracking-wider"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Deploy Canvas
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
