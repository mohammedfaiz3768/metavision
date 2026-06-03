"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-500 font-mono">Loading logo slots...</span>
      </div>
    );
  }

  return (
    <div className="w-full select-none space-y-3">
      <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
        Upload squad logos. Click a logo slot to place circular clipped markers on the strategy whiteboard.
      </p>

      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-0.5 scrollbar-thin">
        {Array.from({ length: 12 }, (_, idx) => {
          const slotNum = idx + 1;
          const slot = slotMap[slotNum];
          const isEditing = activeSlot === slotNum;

          if (isEditing) {
            return (
              <div key={slotNum} className="p-3 rounded-xl border border-slate-800/60 bg-[#1C1E26] space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Setup Team Slot #{slotNum}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-xs text-slate-500 hover:text-slate-100" onClick={() => setActiveSlot(null)}>
                    ✕
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold text-slate-500">Team Name</Label>
                  <Input
                    placeholder="e.g. Total Gaming"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="bg-[#0B0C10] border-slate-800 text-[11px] h-8 text-slate-100 focus-visible:ring-indigo-500"
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
                      className="flex-1 flex items-center justify-center gap-2 border border-slate-800 border-dashed rounded-lg bg-[#0B0C10] p-2 text-slate-500 hover:text-slate-300 hover:border-slate-700 cursor-pointer text-[10px] h-10 transition-colors shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {logoBase64 ? "Image Loaded" : "Choose Image"}
                    </label>
                    {logoBase64 && (
                      <Avatar className="h-10 w-10 border border-slate-800">
                        <AvatarImage src={logoBase64} />
                        <AvatarFallback className="text-[10px] bg-slate-900 text-slate-400">T</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/40">
                  <Button size="sm" variant="ghost" className="text-[10px] text-slate-500 hover:text-slate-100 border border-slate-800/40 h-7 px-2.5" onClick={() => setActiveSlot(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-sm text-[10px] h-7 px-2.5" onClick={() => handleSaveSlot(slotNum)}>
                    Save Slot
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={slotNum}
              className="flex items-center justify-between p-2 rounded-xl border border-slate-800/40 bg-[#1C1E26]/40 hover:bg-[#1C1E26] transition-all shadow-sm"
            >
              {slot ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-slate-800 shadow-sm">
                    <AvatarImage src={slot.logo_url} />
                    <AvatarFallback className="bg-slate-900 text-slate-400 text-[10px] font-bold">
                      {slot.team_name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200 leading-none">{slot.team_name}</p>
                    <span className="text-[9px] font-mono text-slate-500 uppercase leading-none">Slot #{slotNum}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full border border-slate-800 border-dashed bg-[#0B0C10] flex items-center justify-center text-slate-600">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-500 italic leading-none">Empty Slot</p>
                    <span className="text-[9px] font-mono text-slate-600 uppercase leading-none">Slot #{slotNum}</span>
                  </div>
                </div>
              )}

              {slot ? (
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold h-7 gap-1 shadow-sm px-2.5"
                  onClick={() => onAddMarkerToCanvas(slot.team_name, slot.logo_url)}
                >
                  Place Marker
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[9px] h-7 hover:bg-indigo-600/10 text-slate-500 hover:text-indigo-400 border border-slate-800/40 px-2.5"
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
      </div>
    </div>
  );
}
