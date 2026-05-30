"use client";

import React, { use, useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WhiteboardCanvas } from "@/components/whiteboard/WhiteboardCanvas";
import { WhiteboardToolbar } from "@/components/whiteboard/WhiteboardToolbar";
import { LayerPanel } from "@/components/whiteboard/LayerPanel";
import { LogoUploadPanel } from "@/components/analysis-board/LogoUploadPanel";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Save,
  Video,
  Link as LinkIcon,
  HelpCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { CanvasNode } from "@/lib/types/app.types";

export default function OwnerWhiteboardPage() {
  const params = useParams() as { tournamentId: string; stageId: string; matchId: string };
  const { tournamentId, stageId, matchId } = params;
  
  const router = useRouter();
  const { user } = useAuth();
  const stageRef = useRef<any>(null);
  const queryClient = useQueryClient();

  const {
    nodes,
    loadDocument,
    addNode,
    updateNode,
    selectedNodeIds,
    deselectAll,
  } = useCanvasStore();

  const [videoUrl, setVideoUrl] = useState("");
  const [activeTextNode, setActiveTextNode] = useState<CanvasNode | null>(null);

  // ---- 1. Fetch Strategic Match Details ----
  const { data: match, isLoading: matchLoading, error: matchError } = useQuery({
    queryKey: ["analysis-match", matchId],
    queryFn: async () => {
      const response = await fetch(`/api/owner/analysis/${tournamentId}/stages/${stageId}/matches/${matchId}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to load strategic match details");
      }
      return response.json();
    },
    enabled: !!matchId,
  });

  // ---- 2. Initialize Zustand Canvas on load ----
  useEffect(() => {
    if (match?.canvas_data) {
      loadDocument(match.canvas_data);
    }
  }, [match, loadDocument]);

  // Track if a text node is selected to attach video URLs
  useEffect(() => {
    if (selectedNodeIds.length === 1) {
      const selectedId = selectedNodeIds[0];
      const node = nodes.find((n) => n.id === selectedId);
      if (node && node.type === "text") {
        setActiveTextNode(node);
        setVideoUrl((node as any).linkedUrl || "");
      } else {
        setActiveTextNode(null);
      }
    } else {
      setActiveTextNode(null);
    }
  }, [selectedNodeIds, nodes]);

  // ---- 3. Save Whiteboard Strategy Mutation ----
  const saveMutation = useMutation({
    mutationFn: async (payload: { canvas_data: any }) => {
      const res = await fetch(`/api/owner/analysis/${tournamentId}/stages/${stageId}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save strategy canvas to server");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-match", matchId] });
      toast.success("Strategy whiteboard canvas saved successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not save whiteboard data");
    },
  });

  const handleSaveBoard = () => {
    saveMutation.mutate({
      canvas_data: {
        schemaVersion: 1,
        nodes,
      },
    });
  };

  const handleSaveAndExit = () => {
    saveMutation.mutate({
      canvas_data: {
        schemaVersion: 1,
        nodes,
      },
    }, {
      onSuccess: () => {
        router.push(`/owner/analysis-boards/${tournamentId}`);
      }
    });
  };

  // Add Logo Marker Node helper from panel
  const handleAddLogoMarker = (teamName: string, logoUrl: string) => {
    if (!user) return;
    
    const newNode: CanvasNode = {
      id: `logo-marker-${Date.now()}`,
      type: "logo-marker" as any, // Cast since extended type
      layer: "rotations",
      x: 0.5,
      y: 0.5,
      radius: 0.035, // About 35px in 1024px coordinate system
      markerType: logoUrl, // We store logo Url in markerType
      text: teamName,
      color: "#ffffff",
      strokeWidth: 1,
      createdBy: user.id,
      updatedBy: user.id,
      updatedAt: Date.now(),
      version: 1,
    };

    addNode(newNode);
    toast.success(`Marker added for ${teamName}! Arrange on board.`);
  };

  // Attach video URL to active selected Text node
  const handleAttachVideoLink = () => {
    if (!activeTextNode) return;
    
    // Simple verification
    if (videoUrl.trim() && !videoUrl.startsWith("http://") && !videoUrl.startsWith("https://")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    updateNode(activeTextNode.id, {
      linkedUrl: videoUrl.trim() || undefined,
    } as any);

    toast.success("Video URL successfully annotated to text node!");
  };

  if (matchLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <p className="text-sm text-slate-500 animate-pulse font-mono font-semibold">Rebuilding whiteboard vectors...</p>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 bg-[#F8F9FA] text-slate-800">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold">Failed to load strategy board</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Verify your permissions and server connection.
        </p>
        <Link href={`/owner/analysis-boards/${tournamentId}`} className="mt-4">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs shadow-sm">Back to stages</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col justify-between select-none relative text-slate-850 bg-[#F8F9FA]">
      {/* Top navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 select-none">
        <div className="flex items-center gap-3">
          <Link href={`/owner/analysis-boards/${tournamentId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 font-mono">
                {match.match_name} Strategy Canvas
              </h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-semibold uppercase tracking-wide select-none font-mono shadow-sm">
                {match.map}
              </span>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3">
          {/* Attach video link helper popover */}
          {activeTextNode && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="border-slate-200 text-slate-650 hover:text-slate-900 bg-white hover:bg-slate-50 font-semibold gap-1.5 shadow-sm">
                  <Video className="h-4 w-4 text-rose-500 animate-pulse" />
                  <span>Attach Video Link</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 border-slate-200 bg-white text-slate-800 shadow-lg" align="end">
                <div className="space-y-3 p-1">
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs flex items-center gap-1 font-mono text-slate-900">
                      <LinkIcon className="h-3.5 w-3.5 text-cyan-500" /> Link Video URL
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Attach YouTube or Instagram clips to this text node. Observers will be redirected on click.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-semibold text-slate-500 font-mono">Video Link URL</Label>
                    <Input
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="bg-white border-slate-200 text-xs h-8 text-slate-900"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-xs font-bold uppercase tracking-wider h-8 bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-sm"
                    onClick={handleAttachVideoLink}
                  >
                    Save Annotation URL
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Save & Exit button */}
          <Button
            size="sm"
            variant="outline"
            className="border-slate-200 bg-white text-amber-600 hover:text-white hover:bg-amber-500 hover:border-amber-500 font-semibold gap-1.5 h-8.5 px-4 font-mono uppercase tracking-wider transition-colors shadow-sm"
            onClick={handleSaveAndExit}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save & Exit</span>
          </Button>

          {/* Save button */}
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 h-8.5 px-4 font-mono uppercase tracking-wider shadow-sm"
            onClick={handleSaveBoard}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Canvas</span>
          </Button>
        </div>
      </div>

      {/* Main split grid */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0 select-none">
        {/* Left Column: Layers and Logo panel */}
        <div className="flex flex-col gap-4 overflow-y-auto shrink-0 select-none w-64 no-scrollbar">
          <LayerPanel />
          <LogoUploadPanel
            tournamentId={tournamentId}
            onAddMarkerToCanvas={handleAddLogoMarker}
          />
        </div>

        {/* Center column: Stage drawing viewport */}
        <div className="flex-1 rounded-xl border border-slate-200 overflow-hidden bg-white select-none relative shadow-sm">
          <WhiteboardCanvas
            mapId={match.map}
            userId={user?.id || ""}
            username={user?.email?.split("@")[0] || "Owner"}
            stageRef={stageRef}
          />

          {/* Draw toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 select-none animate-bounce-short">
            <WhiteboardToolbar />
          </div>
        </div>
      </div>
    </div>
  );
}
