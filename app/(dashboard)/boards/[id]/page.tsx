"use client";

import { use, useEffect, useState, useRef } from "react";
import { useTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { WhiteboardCanvas } from "@/components/whiteboard/WhiteboardCanvas";
import { WhiteboardToolbar } from "@/components/whiteboard/WhiteboardToolbar";
import { LayerPanel } from "@/components/whiteboard/LayerPanel";
import { MarkerPalette } from "@/components/whiteboard/MarkerPalette";
import { SaveIndicator } from "@/components/whiteboard/SaveIndicator";
import { ExportButton } from "@/components/whiteboard/ExportButton";
import { useAutoSave } from "@/components/whiteboard/hooks/useAutoSave";
import { useRealtime } from "@/hooks/useRealtime";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Settings2,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StrategyBoard } from "@/lib/types/app.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BoardPage({ params }: PageProps) {
  const { id: boardId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  const supabase = createClient();
  const stageRef = useRef<any>(null);

  const { loadDocument, hasUnsavedChanges, deselectAll } = useCanvasStore();

  const [copied, setCopied] = useState(false);
  const [sharingUrl, setSharingUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);

  // Keyboard shortcut to toggle whiteboard toolbar visibility: press 'H'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowToolbar((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ---- 1. Fetch Strategy Board Details ----
  const { data: board, isLoading: boardLoading, error: boardError, refetch: refetchBoard } = useQuery<StrategyBoard>({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to load strategy board");
      }
      const data = await response.json();
      return data as StrategyBoard;
    },
    enabled: !!boardId,
  });

  // ---- 2. Initialize Zustand Canvas Store on fetch success ----
  useEffect(() => {
    if (board?.canvas_data) {
      loadDocument(board.canvas_data);
      setIsPublic(board.is_public);
      if (board.is_public && board.public_token) {
        setSharingUrl(
          `${window.location.origin}/share/${board.public_token}`
        );
      }
    }
  }, [board, loadDocument]);

  // ---- 3. Offline Auto-Save and Draft Recovery Hook ----
  const {
    draftExists,
    draftTime,
    handleRecoverDraft,
    handleDiscardDraft,
  } = useAutoSave({ boardId, stageRef });

  // ---- 4. Real-time Teammate Cursors and shape syncing Hook ----
  const username = user?.email?.split("@")[0] || "Player";
  const { cursors, handleStageMouseMove } = useRealtime({
    boardId,
    userId: user?.id || "",
    username,
    stageRef,
  });

  // ---- 5. Toggle Share Link Functions ----
  const handleToggleShare = async () => {
    setSharingLoading(true);
    try {
      if (isPublic) {
        // Revoke sharing link
        const response = await fetch(`/api/boards/${boardId}/share`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to revoke share link");
        
        setIsPublic(false);
        setSharingUrl("");
        toast.success("Public sharing link deactivated successfully");
      } else {
        // Generate sharing link
        const response = await fetch(`/api/boards/${boardId}/share`, {
          method: "POST",
        });
        if (!response.ok) throw new Error("Failed to generate share link");
        const res = await response.json();

        setIsPublic(true);
        setSharingUrl(res.url);
        toast.success("HD public whiteboard share URL active!");
      }
      refetchBoard();
    } catch (err: any) {
      toast.error(err.message || "Sharing operation failed");
    } finally {
      setSharingLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!sharingUrl) return;
    navigator.clipboard.writeText(sharingUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Click empty canvas helper
  const handleWrapperClick = (e: React.MouseEvent) => {
    // If user clicked the container background, deselect active Konva transformer
    if (e.target === e.currentTarget) {
      deselectAll();
    }
  };

  if (boardLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Preloading vector arrays...</p>
      </div>
    );
  }

  if (boardError || !board) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Failed to load strategy board</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {boardError?.message || "Verify your connection and team authentication status."}
        </p>
        <Link href="/boards" className="mt-4">
          <Button>Back to Strategy Boards</Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="h-[calc(100vh-100px)] flex flex-col justify-between select-none relative"
      onClick={handleWrapperClick}
    >
      {/* 1. Whiteboard Top Navigation & Utility Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-3 select-none text-slate-900">
        <div className="flex items-center gap-3">
          <Link href="/boards">
            <Button variant="ghost" size="icon" className="h-8 w-8 border border-[#E5E7EB] text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 line-clamp-1 max-w-xs md:max-w-md">
                {board.title}
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#EEF2FF] border border-[#E0E7FF] text-[#6366F1] capitalize">
                {board.map}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1.5 leading-none select-none">
              Teammates online: {cursors.length + 1}
            </p>
          </div>
        </div>

        {/* Top utility widgets */}
        <div className="flex items-center gap-3">
          {/* Realtime Save status indicator */}
          <SaveIndicator />

          {/* Export PNG button */}
          <ExportButton stageRef={stageRef} boardTitle={board.title} />

          {/* Hide/Show drawing toolbar toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowToolbar(!showToolbar)}
            className="font-semibold gap-2 border border-[#E5E7EB] hover:border-[#6366F1]/30 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 text-[12px] px-3 h-8.5 rounded-[8px] transition-colors shadow-sm hidden md:flex"
            title="Toggle drawing toolbar visibility (Shortcut: H)"
          >
            {showToolbar ? (
              <EyeOff className="h-4 w-4 text-[#6366F1]" />
            ) : (
              <Eye className="h-4 w-4 text-[#6366F1]" />
            )}
            <span>{showToolbar ? "Hide Tools" : "Show Tools"}</span>
          </Button>

          {/* Share links generator */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="font-semibold gap-2 border border-[#E5E7EB] hover:border-[#6366F1]/30 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 text-[12px] px-3 h-8.5 rounded-[8px] transition-colors shadow-sm"
              >
                <Share2 className="h-4 w-4 text-[#6366F1]" />
                <span>Share</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 border border-[#E5E7EB] bg-white text-slate-800 shadow-md" align="end">
              <div className="space-y-3 p-1">
                <div className="space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">Deploy Public Strategy link</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Generate an HD read-only copy of this whiteboard. Teammates or external observers can inspect drawings in real-time.
                  </p>
                </div>
                
                {/* Share URL copy bar */}
                {isPublic && sharingUrl && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={sharingUrl}
                      readOnly
                      className="h-8 text-xs bg-slate-50 border border-[#E5E7EB] text-slate-800 rounded-[8px]"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 shrink-0 border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-[#10B981]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Deactivate/Activate button */}
                <Button
                  onClick={handleToggleShare}
                  disabled={sharingLoading}
                  className={isPublic ? "w-full h-8.5 font-semibold text-xs mt-1 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors" : "w-full h-8.5 font-semibold text-xs mt-1 bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-colors"}
                >
                  {sharingLoading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                  {isPublic ? "Deactivate Link" : "Activate Share Link"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 2. Whiteboard Workspace (Main split columns) */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0 select-none">
        {/* Left column: Tactical Panels (Layers + Markers) */}
        <div className="flex flex-col gap-4 max-h-full overflow-y-auto shrink-0 select-none scrollbar-thin pr-1 pb-4 no-scrollbar">
          {/* Sidebar Titles */}
          <div className="px-1 py-1.5 select-none">
            <h1 className="text-[20px] font-black text-slate-900 tracking-tight leading-none">STRATEGY BOARD</h1>
            <p className="text-[10px] font-extrabold text-slate-400 mt-1 uppercase tracking-widest font-mono">MAP EDITOR</p>
          </div>

          {/* Tactical Layers Control list */}
          <LayerPanel />

          {/* Emoji Tactical Marker Palette */}
          <MarkerPalette />
        </div>

        {/* Center column: Stage drawing board viewport */}
        <div className="flex-1 rounded-2xl border border-border overflow-hidden bg-card/10 select-none relative">
          <WhiteboardCanvas
            mapId={board.map}
            userId={user?.id || ""}
            username={username}
            realtimeCursors={cursors}
            realtimeMouseMoveHandler={handleStageMouseMove}
            stageRef={stageRef}
          />

          {/* Floating drawing toolbar (Horizontal) */}
          <div
            className={cn(
              "absolute bottom-4 left-1/2 -translate-x-1/2 z-10 select-none transition-all duration-300 ease-in-out",
              showToolbar
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-12 pointer-events-none"
            )}
          >
            <WhiteboardToolbar />
          </div>
        </div>
      </div>

      {/* 3. Offline Draft Recovery Confirmation Dialog */}
      <Dialog open={draftExists} onOpenChange={() => {}}>
        <DialogContent className="border-border max-w-md bg-card">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-primary text-sm font-semibold">
              <Settings2 className="h-5 w-5" />
              <span>Offline Recovery Service</span>
            </div>
            <DialogTitle className="text-lg font-bold">
              Unsaved changes found!
            </DialogTitle>
            <DialogDescription className="text-xs">
              We identified unsaved changes from <strong className="text-foreground">{draftTime || "recently"}</strong> stored as an offline local draft. Do you want to recover these whiteboard drawings or discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={handleDiscardDraft}>
              Discard Draft
            </Button>
            <Button onClick={handleRecoverDraft} className="font-semibold">
              Recover drawings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
