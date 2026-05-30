"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Plus, Upload, Swords, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

interface LogoUpload {
  id?: string;
  slot_number: number;
  team_name: string;
  logo_url: string;
}

interface LogoUploadPanelProps {
  tournamentId: string;
  onAddMarkerToCanvas: (teamName: string, logoUrl: string) => void;
}

export function LogoUploadPanel({ tournamentId, onAddMarkerToCanvas }: LogoUploadPanelProps) {
  const queryClient = useQueryClient();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch all registered logo slots
  const { data: logoSlots, isLoading, error } = useQuery<LogoUpload[]>({
    queryKey: ["tournament-logos", tournamentId],
    queryFn: async () => {
      const res = await fetch(`/api/owner/logos?tournament_id=${tournamentId}`);
      if (!res.ok) throw new Error("Failed to load team logos");
      return res.json();
    },
  });

  // Create slot map
  const slotMap = React.useMemo(() => {
    const map: Record<number, LogoUpload> = {};
    if (logoSlots) {
      for (const slot of logoSlots) {
        map[slot.slot_number] = slot;
      }
    }
    return map;
  }, [logoSlots]);

  // Upload Logo slot mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (payload: LogoUpload) => {
      const res = await fetch("/api/owner/logos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_tournament_id: tournamentId,
          ...payload,
        }),
      });
      if (!res.ok) throw new Error("Failed to save logo slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-logos", tournamentId] });
      toast.success("Team logo slot registered successfully!");
      setActiveSlot(null);
      setTeamName("");
      setLogoBase64("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register slot");
    },
  });

  // Convert uploaded file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSlot = (slotNum: number) => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name.");
      return;
    }
    if (!logoBase64) {
      toast.error("Please select a team logo image.");
      return;
    }

    uploadLogoMutation.mutate({
      slot_number: slotNum,
      team_name: teamName,
      logo_url: logoBase64,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-2">
        <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
        <span className="text-xs text-slate-500 font-mono">Loading logo slots...</span>
      </div>
    );
  }

  return (
    <Card className="border-slate-200 bg-white text-slate-800 w-full select-none shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-200 bg-[#F9FAFB]">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
          <Swords className="h-4.5 w-4.5 text-[#6366F1]" />
          Roster Marker Panel (12 Slots)
        </CardTitle>
        <CardDescription className="text-[10px] text-slate-450 leading-relaxed font-mono">
          Upload 12 squad logos. Drag or click a logo slot to place circular clipped markers on the strategy whiteboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {Array.from({ length: 12 }, (_, idx) => {
          const slotNum = idx + 1;
          const slot = slotMap[slotNum];
          const isEditing = activeSlot === slotNum;

          if (isEditing) {
            return (
              <div key={slotNum} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-[10px] font-mono text-[#6366F1] font-bold uppercase">Setup Team Slot #{slotNum}</span>
                  <Button variant="ghost" size="icon-sm" className="h-5 w-5 text-xs text-slate-400 hover:text-slate-900" onClick={() => setActiveSlot(null)}>
                    ✕
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold text-slate-500">Team Name</Label>
                  <Input
                    placeholder="e.g. Total Gaming"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="bg-white border-slate-200 text-[11px] h-8 text-slate-900 focus-visible:ring-[#6366F1]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold text-slate-500">Team Logo (PNG/JPG, Max 2MB)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id={`file-slot-${slotNum}`}
                    />
                    <label
                      htmlFor={`file-slot-${slotNum}`}
                      className="flex-1 flex items-center justify-center gap-2 border border-slate-200 border-dashed rounded-md bg-white p-2 text-slate-500 hover:text-slate-800 hover:border-slate-350 cursor-pointer text-[10px] h-10 transition-colors shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {logoBase64 ? "Image Loaded" : "Choose Image"}
                    </label>
                    {logoBase64 && (
                      <Avatar className="h-10 w-10 border border-slate-200">
                        <AvatarImage src={logoBase64} />
                        <AvatarFallback className="text-[10px]">T</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/40">
                  <Button size="xs" variant="ghost" className="text-[10px] text-slate-500 hover:text-slate-900 border border-slate-200/40" onClick={() => setActiveSlot(null)}>
                    Cancel
                  </Button>
                  <Button size="xs" className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold shadow-sm" onClick={() => handleSaveSlot(slotNum)}>
                    Save Slot
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={slotNum}
              className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 transition-all shadow-sm"
            >
              {slot ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-slate-200 shadow-sm">
                    <AvatarImage src={slot.logo_url} />
                    <AvatarFallback className="bg-slate-100 text-slate-500 text-[10px] font-bold">
                      {slot.team_name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 leading-none">{slot.team_name}</p>
                    <span className="text-[9px] font-mono text-slate-400 uppercase leading-none">Slot #{slotNum}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full border border-slate-200 border-dashed bg-white flex items-center justify-center text-slate-400">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-400 italic leading-none">Empty Slot</p>
                    <span className="text-[9px] font-mono text-slate-400 uppercase leading-none">Slot #{slotNum}</span>
                  </div>
                </div>
              )}

              {slot ? (
                <Button
                  size="xs"
                  className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[9px] font-bold h-7 gap-1 shadow-sm"
                  onClick={() => onAddMarkerToCanvas(slot.team_name, slot.logo_url)}
                >
                  Place Marker
                </Button>
              ) : (
                <Button
                  size="xs"
                  variant="ghost"
                  className="text-[9px] h-7 hover:bg-[#6366F1]/5 text-slate-500 hover:text-[#6366F1] border border-slate-200/40"
                  onClick={() => {
                    setActiveSlot(slotNum);
                    setTeamName("");
                    setLogoBase64("");
                  }}
                >
                  Configure
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
