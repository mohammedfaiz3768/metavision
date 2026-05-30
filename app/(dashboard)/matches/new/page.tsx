"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTeam } from "@/hooks/useTeam";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MAP_LIST } from "@/lib/whiteboard/map-config";
import { ArrowLeft, Loader2, UploadCloud, RefreshCw, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { preprocessScoreboard } from "@/lib/ocr/ocr-preprocessor";
import { ocrWorkerInstance } from "@/lib/ocr/tesseract-worker";

interface PlayerScoreRow {
  player_name: string;
  kills: number;
  damage: number;
  survived: boolean;
}

export default function NewMatchPage() {
  const { currentTeam } = useTeam();
  const router = useRouter();
  const [map, setMap] = useState<string>("bermuda");
  const [placement, setPlacement] = useState<number>(12);
  const [totalKills, setTotalKills] = useState<number>(0);
  const [players, setPlayers] = useState<PlayerScoreRow[]>([
    { player_name: "Player 1", kills: 0, damage: 0, survived: false },
    { player_name: "Player 2", kills: 0, damage: 0, survived: false },
    { player_name: "Player 3", kills: 0, damage: 0, survived: false },
    { player_name: "Player 4", kills: 0, damage: 0, survived: false },
  ]);

  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to load mock tournament stats for high-fidelity out-of-the-box DX testing
  const loadMockStats = () => {
    setMap("bermuda");
    setPlacement(2);
    setTotalKills(8);
    setPlayers([
      { player_name: "Faiz", kills: 4, damage: 1650, survived: true },
      { player_name: "Ayan", kills: 2, damage: 980, survived: true },
      { player_name: "Viper", kills: 2, damage: 1200, survived: false },
      { player_name: "Xero", kills: 0, damage: 450, survived: false },
    ]);
    toast.success("Loaded mock Free Fire tournament scoreboard stats!");
  };

  const handlePlayerChange = (index: number, field: keyof PlayerScoreRow, value: any) => {
    const updated = [...players];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setPlayers(updated);

    // Keep total kills in sync automatically if kills are modified
    if (field === "kills") {
      const sum = updated.reduce((acc, p) => acc + (p.kills || 0), 0);
      setTotalKills(sum);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    toast.info("Scoreboard loaded. Initializing OCR parser worker...");

    try {
      // Step 1: Create Image element to render canvas preprocessing
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          try {
            // Apply grayscale + contrast thresholding preprocessor
            const processedBase64 = preprocessScoreboard(img);
            
            toast.info("Running spatial Y-axis proximity row clustering...");
            const ocrResult = await ocrWorkerInstance.processScreenshot(processedBase64);

            // Populate state with parsed OCR values
            if (ocrResult.placement) setPlacement(ocrResult.placement);
            if (ocrResult.total_kills) setTotalKills(ocrResult.total_kills);
            if (ocrResult.players && ocrResult.players.length === 4) {
              setPlayers(
                ocrResult.players.map((p) => ({
                  player_name: p.name || "Player",
                  kills: p.kills || 0,
                  damage: p.damage || 0,
                  survived: p.survived || false,
                }))
              );
            }

            toast.success("OCR scoreboard scans completed! Please review and adjust the extracted stats below.");
          } catch (ocrErr: any) {
            console.error("OCR execution error:", ocrErr);
            toast.error(ocrErr.message || "OCR scans failed. Switch to manual entry.");
          } finally {
            setOcrLoading(false);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("File loading error:", err);
      toast.error("Failed to load image file. Switched to manual scorecard entry.");
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam) return;

    // Validation
    const invalidPlayer = players.some((p) => !p.player_name.trim());
    if (invalidPlayer) {
      toast.error("All 4 player roster spots must have a valid nickname.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_id: currentTeam.id,
          map,
          placement,
          total_kills: totalKills,
          players,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save match stats");
      }

      const match = await response.json();
      toast.success("Scorecard and player damage stats successfully committed!");
      router.push(`/matches/${match.id}`);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 select-none bg-[#F8F9FA]">
        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#E5E7EB]">
          <AlertTriangle className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-[#111827]">No active roster</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Please join or create a team from your dashboard to record competitive match stats.
        </p>
        <Link href="/dashboard" className="mt-4">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#374151]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-4 select-none">
        <div className="flex items-center gap-3">
          <Link href="/matches">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-[#E5E7EB] bg-white hover:bg-slate-50 hover:text-[#111827] rounded-[8px] transition-colors cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Record Match Stats</h1>
            <p className="text-[13px] text-slate-500 mt-1">
              Upload scoreboard screenshots or manually input placements, kills, and damage.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={loadMockStats}
          disabled={loading || ocrLoading}
          className="bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/30 text-[#6366F1] text-[13px] font-semibold px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Sparkles className="h-4 w-4" />
          Load Demo Roster Stats
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Image OCR Dropzone (Locked during scanning) */}
          <div className="md:col-span-1 space-y-4">
            <Card className="border border-[#E5E7EB] bg-white relative overflow-hidden select-none rounded-[12px] shadow-sm">
              <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Ingest Scoreboard</CardTitle>
                <CardDescription className="text-[11px] text-slate-400">Accelerate data-entry using assistive OCR</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div
                  onClick={() => !ocrLoading && !loading && fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed border-[#D1D5DB] rounded-[12px] aspect-square flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-[#6366F1] hover:bg-[#6366F1]/5 transition-all duration-200 select-none",
                    ocrLoading && "pointer-events-none opacity-40 bg-slate-50 border-[#E5E7EB]"
                  )}
                >
                  {ocrLoading ? (
                    <div className="space-y-3">
                      <RefreshCw className="h-8 w-8 text-[#6366F1] animate-spin mx-auto" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#111827]">Scanning Scoreboard...</p>
                        <p className="text-[10px] text-slate-500 leading-normal">Spatial Y-proximity row clustering in progress</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-[#E5E7EB]">
                        <UploadCloud className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#111827]">Upload screenshot</p>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Drag & drop or click to upload match results PNG/JPG
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={ocrLoading || loading}
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-[#E5E7EB] p-3.5 text-[10px] text-slate-500 flex gap-2 select-none leading-relaxed font-mono">
                <Sparkles className="h-4 w-4 text-[#6366F1] shrink-0" />
                <span>OCR scanning detects roster metrics. You can correct all fields manually before committing data.</span>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column: Scorecard Inputs Form */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
              <CardHeader className="pb-4 border-b border-[#E5E7EB] bg-slate-50/50">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">Scoreboard Sheet</CardTitle>
                <CardDescription className="text-[11px] text-slate-400">Adjust match placement and kills records below.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                {/* Match Row Metadata */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="map" className="text-xs font-semibold text-slate-500">Deployment Map</Label>
                    <Select
                      value={map}
                      onValueChange={(val) => setMap(val || "bermuda")}
                      disabled={loading || ocrLoading}
                    >
                      <SelectTrigger className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 rounded-[8px] focus:ring-[#6366F1]">
                        <SelectValue placeholder="Map" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#E5E7EB] text-[#111827]">
                        {MAP_LIST.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs hover:bg-slate-50 focus:bg-slate-50 capitalize cursor-pointer">
                            {m.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="placement" className="text-xs font-semibold text-slate-500">Placement Rank</Label>
                    <Input
                      id="placement"
                      type="number"
                      min={1}
                      max={48}
                      value={placement}
                      onChange={(e) => setPlacement(parseInt(e.target.value) || 12)}
                      required
                      disabled={loading || ocrLoading}
                      className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 rounded-[8px] focus-visible:ring-[#6366F1]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalKills" className="text-xs font-semibold text-slate-500">Team Total Kills</Label>
                    <Input
                      id="totalKills"
                      type="number"
                      min={0}
                      value={totalKills}
                      onChange={(e) => setTotalKills(parseInt(e.target.value) || 0)}
                      required
                      disabled={loading || ocrLoading}
                      className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 font-semibold rounded-[8px] focus-visible:ring-[#6366F1]"
                    />
                  </div>
                </div>

                {/* Teammates Roster Table Grid */}
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Roster performance scorecard</Label>
                  <div className="border border-[#E5E7EB] rounded-[10px] overflow-hidden bg-slate-50/30">
                    <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-[#E5E7EB] bg-slate-50/80 text-[10px] font-extrabold text-slate-500 uppercase select-none tracking-wider font-mono">
                      <div className="col-span-5">Teammate Nickname</div>
                      <div className="col-span-2 text-center">Kills</div>
                      <div className="col-span-3 text-center">Damage Mapped</div>
                      <div className="col-span-2 text-center">Survived</div>
                    </div>

                    <div className="divide-y divide-[#E5E7EB]">
                      {players.map((p, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-slate-50/50 transition-colors">
                          {/* Name Input */}
                          <div className="col-span-5">
                            <Input
                              placeholder={`Teammate ${idx + 1}`}
                              value={p.player_name}
                              onChange={(e) => handlePlayerChange(idx, "player_name", e.target.value)}
                              disabled={loading || ocrLoading}
                              required
                              className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 rounded-[8px] focus-visible:ring-[#6366F1]"
                            />
                          </div>

                          {/* Kills Input */}
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min={0}
                              value={p.kills}
                              onChange={(e) => handlePlayerChange(idx, "kills", parseInt(e.target.value) || 0)}
                              disabled={loading || ocrLoading}
                              required
                              className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 text-center rounded-[8px] focus-visible:ring-[#6366F1]"
                            />
                          </div>

                          {/* Damage Input */}
                          <div className="col-span-3">
                            <Input
                              type="number"
                              min={0}
                              value={p.damage}
                              onChange={(e) => handlePlayerChange(idx, "damage", parseInt(e.target.value) || 0)}
                              disabled={loading || ocrLoading}
                              required
                              className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 text-center font-mono rounded-[8px] focus-visible:ring-[#6366F1]"
                            />
                          </div>

                          {/* Survived Checkbox */}
                          <div className="col-span-2 flex justify-center">
                            <Checkbox
                              checked={p.survived}
                              onCheckedChange={(val) => handlePlayerChange(idx, "survived", !!val)}
                              disabled={loading || ocrLoading}
                              className="h-[18px] w-[18px] border-[#D1D5DB] bg-white data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1] rounded-[4px]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-[#E5E7EB] pt-4 px-6 pb-6 select-none bg-slate-50/50">
                <Link href="/matches">
                  <Button type="button" variant="ghost" disabled={loading || ocrLoading} className="text-slate-500 hover:text-[#111827] hover:bg-slate-100 rounded-[8px] transition-colors cursor-pointer border border-[#E5E7EB]">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || ocrLoading} className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-sm flex items-center gap-2 cursor-pointer">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record Scorecard
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
