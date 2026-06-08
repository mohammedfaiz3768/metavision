"use client";

import { use, useEffect, useState, useRef } from "react";
import { useTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { WhiteboardCanvas } from "@/components/whiteboard/WhiteboardCanvas";
import { WhiteboardToolbar } from "@/components/whiteboard/WhiteboardToolbar";
import { SaveIndicator } from "@/components/whiteboard/SaveIndicator";
import { ExportButton } from "@/components/whiteboard/ExportButton";
import { AssetsStorePanel } from "@/components/whiteboard/AssetsStorePanel";
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
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Play,
  Pause,
  Plus,
  Grid,
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  History,
  CopyIcon,
  Palette,
  Undo,
  Redo,
  Video,
  Link as LinkIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StrategyBoard, CanvasNode } from "@/lib/types/app.types";

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

  const {
    nodes,
    layers,
    selectedNodeIds,
    activeTool,
    setTool,
    activeLayer,
    setActiveLayer,
    historyLogs,
    revertToHistoryStep,
    isReplaying,
    setReplaying,
    replayProgress,
    setReplayProgress,
    copyStyle,
    pasteStyle,
    styleClipboard,
    addCustomLayer,
    renameLayer,
    deleteLayer,
    toggleLayerLock,
    toggleLayerVisibility,
    updateNode,
    deleteSelectedNodes,
    loadDocument,
    deselectAll,
    snapToGrid,
    toggleSnapToGrid,
    undo,
    redo,
    canUndo,
    canRedo,
    pendingLogo,
    setPendingLogo,
  } = useCanvasStore();

  const [copied, setCopied] = useState(false);
  const [sharingUrl, setSharingUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);

  // Active right sidebar tab: 'properties' | 'layers' | 'settings' | 'history' | 'assets'
  const [activeTab, setActiveTab] = useState<"properties" | "layers" | "settings" | "history" | "assets">("layers");

  // Dynamic layer creation state
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState("");

  const [activeTextNode, setActiveTextNode] = useState<CanvasNode | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

  // Track if a text node is selected to attach video/link URLs
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

  // Attach video URL or link to active selected Text node
  const handleAttachVideoLink = () => {
    if (!activeTextNode) return;
    
    if (videoUrl.trim() && !videoUrl.startsWith("http://") && !videoUrl.startsWith("https://")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    updateNode(activeTextNode.id, {
      linkedUrl: videoUrl.trim() || undefined,
    } as any);

    toast.success("Link URL successfully annotated to text node!");
  };

  // Auto-switch tab to properties when an object is selected
  useEffect(() => {
    if (selectedNodeIds.length === 1) {
      setActiveTab("properties");
    } else if (activeTab === "properties") {
      setActiveTab("layers");
    }
  }, [selectedNodeIds]);

  // Timeline replay animation tick loop (≈33 FPS smooth animations)
  useEffect(() => {
    let timer: any;
    if (isReplaying) {
      timer = setInterval(() => {
        setReplayProgress((replayProgress + 0.01) % 1.01);
      }, 30);
    }
    return () => clearInterval(timer);
  }, [isReplaying, replayProgress, setReplayProgress]);

  // Keyboard shortcut definitions (V = Select, H = Hand/Pan, T = Text, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return; // ignore in form fields
      }

      const key = e.key.toLowerCase();
      if (key === "v") {
        e.preventDefault();
        setTool("select");
      } else if (key === "h") {
        e.preventDefault();
        setTool("pan");
      } else if (key === "t") {
        e.preventDefault();
        setTool("text");
      } else if (key === "d") {
        e.preventDefault();
        setTool("freedraw");
      } else if (key === "p") {
        e.preventDefault();
        setTool("rotation");
      } else if (key === "e") {
        e.preventDefault();
        setTool("eraser");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelectedNodes();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (useCanvasStore.getState().activeTool === "logo-place") {
          setPendingLogo(null);
        }
        setTool("select");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool, deleteSelectedNodes, setPendingLogo]);

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
        const response = await fetch(`/api/boards/${boardId}/share`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to revoke share link");
        
        setIsPublic(false);
        setSharingUrl("");
        toast.success("Public sharing link deactivated successfully");
      } else {
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

  // Find active single selected node for properties panel
  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find((n) => n.id === selectedNodeIds[0])
    : null;

  // Add custom layer handler
  const handleAddLayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayerName.trim()) return;
    addCustomLayer(newLayerName.trim());
    setNewLayerName("");
    setShowAddLayer(false);
    toast.success("Custom tactical layer added!");
  };

  // Rename layer handler
  const handleSaveRenameLayer = (id: string) => {
    if (!editingLayerName.trim()) return;
    renameLayer(id, editingLayerName.trim());
    setEditingLayerId(null);
    setEditingLayerName("");
    toast.success("Layer renamed successfully!");
  };

  // Standard Microsoft Word-style quick color swatch grid
  const QUICK_COLORS = [
    "#EF4444", "#F97316", "#EAB308", "#22C55E", "#10B981", 
    "#06B6D4", "#3B82F6", "#6366F1", "#A855F7", "#EC4899", 
    "#FFFFFF", "#94A3B8", "#475569", "#000000"
  ];

  if (boardLoading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-[#0B0C10] text-slate-100 rounded-[24px] border border-slate-900 shadow-2xl">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-400">Loading strategy workspace...</p>
      </div>
    );
  }

  if (boardError || !board) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-[#0B0C10] text-slate-100 rounded-[24px] border border-slate-900 shadow-2xl p-6">
        <p className="text-sm font-semibold text-red-400 mb-4">
          {boardError ? (boardError as Error).message : "Whiteboard workspace not found"}
        </p>
        <Link href="/boards">
          <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-[#1C1E26]">
            Back to Strategy Boards
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col justify-between select-none relative bg-[#0B0C10] p-4 text-slate-100 rounded-[24px] border border-slate-900 shadow-2xl">
      
      {/* 1. TOP HEADER & UTILITIES BAR */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 select-none">
        <div className="flex items-center gap-3">
          <Link href="/boards">
            <Button variant="ghost" size="icon" className="h-8.5 w-8.5 border border-slate-800 bg-[#13151D] hover:bg-[#1C1E26] text-slate-400 hover:text-slate-100 rounded-[10px] shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-white line-clamp-1 max-w-xs md:max-w-md">
                {board.title}
              </h2>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-900/50 text-indigo-400">
                {board.map}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Teammates Online: {cursors.length + 1}
            </p>
          </div>
        </div>

        {/* Action button widgets */}
        <div className="flex items-center gap-3">
          {/* Undo & Redo buttons */}
          <div className="flex items-center bg-[#13151D] border border-slate-800 rounded-[10px] p-0.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => undo()}
              disabled={!canUndo()}
              title="Undo Action (Ctrl+Z)"
              className="h-7.5 w-7.5 text-slate-400 hover:text-slate-100 hover:bg-[#1C1E26] rounded-[8px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <div className="w-[1px] h-4 bg-slate-800" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => redo()}
              disabled={!canRedo()}
              title="Redo Action (Ctrl+Y)"
              className="h-7.5 w-7.5 text-slate-400 hover:text-slate-100 hover:bg-[#1C1E26] rounded-[8px] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <SaveIndicator />
          <ExportButton stageRef={stageRef} boardTitle={board.title} />

          {/* Attach video link helper popover */}
          {activeTextNode && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="border-slate-800 bg-[#13151D] hover:bg-[#1C1E26] text-rose-400 hover:text-rose-300 font-semibold gap-1.5 h-8.5 rounded-[10px] shadow-sm">
                  <Video className="h-4 w-4 animate-pulse" />
                  <span>Attach Link</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 border border-slate-800 bg-[#13151D] text-slate-300 shadow-2xl rounded-2xl p-4 animate-in fade-in-50 duration-200" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1">
                      <LinkIcon className="h-3.5 w-3.5 text-cyan-500" /> Link URL annotation
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Attach external web pages, YouTube clips, or documents to this text node.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="e.g. https://example.com"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="bg-[#1C1E26] border-slate-800 text-xs h-8 text-slate-100 focus-visible:ring-1 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-xs font-bold uppercase tracking-wider h-8 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                    onClick={handleAttachVideoLink}
                  >
                    Save Annotation URL
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Dynamic Share popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="font-bold gap-2 border border-slate-800 hover:border-slate-700 bg-[#13151D] hover:bg-[#1C1E26] text-[12px] px-3.5 h-8.5 rounded-[10px] shadow-md cursor-pointer transition text-indigo-400 hover:text-indigo-300"
              >
                <Share2 className="h-4 w-4" />
                <span>Share Workspace</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 border border-slate-800 bg-[#13151D] text-slate-300 shadow-2xl rounded-2xl p-4" align="end">
              <div className="space-y-3 select-none">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">Public Tactical View</h4>
                  <p className="text-[9.5px] text-slate-450 leading-relaxed mt-0.5">
                    Generate an HD read-only copy of this tactical board. Observers will sync drawings in real time.
                  </p>
                </div>
                
                {isPublic && sharingUrl && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={sharingUrl}
                      readOnly
                      className="h-8.5 text-xs bg-[#1C1E26] border border-slate-800 text-slate-100 rounded-lg"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8.5 w-8.5 shrink-0 border border-slate-800 bg-[#1C1E26] hover:bg-slate-800 text-slate-400 hover:text-white"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handleToggleShare}
                  disabled={sharingLoading}
                  className={cn(
                    "w-full h-8.5 font-bold text-xs rounded-lg transition-all",
                    isPublic
                      ? "border border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  )}
                >
                  {sharingLoading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                  {isPublic ? "Revoke Public Link" : "Activate Share Link"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 2. 3-PANEL WORKSPACE GRID LAYOUT */}
      <div className="flex-1 flex gap-3.5 overflow-hidden min-h-0 select-none">
        
        {/* PANEL 1: LEFT SLIDER VERTICAL TOOLBELT */}
        <div className="shrink-0 flex items-stretch select-none relative z-20">
          <WhiteboardToolbar onAddLogo={() => {
            // Setup simple logo insertion
            const nodeId = "logo_" + Date.now();
            updateNode(nodeId, {
              id: nodeId,
              type: "logo-marker" as any,
              x: 0.5,
              y: 0.5,
              color: "#ffffff",
              strokeWidth: 2,
              createdBy: user?.id || "",
              updatedBy: user?.id || "",
              updatedAt: Date.now(),
              version: 1
            });
            toast.success("Team logo canvas slot inserted!");
          }} />
        </div>

        {/* PANEL 2: CENTER LARGE FOCUS CANVAS */}
        <div className="flex-grow rounded-[16px] border border-slate-900 overflow-hidden bg-[#0A0C10] select-none relative">
          <WhiteboardCanvas
            mapId={board.map}
            userId={user?.id || ""}
            username={username}
            realtimeCursors={cursors}
            realtimeMouseMoveHandler={handleStageMouseMove}
            stageRef={stageRef}
          />
        </div>

        {/* PANEL 3: RIGHT CONTEXT-SENSITIVE DECK */}
        <div className="w-[280px] bg-[#13151D]/90 backdrop-blur-md border border-slate-800/80 rounded-[16px] p-4 flex flex-col gap-4 max-h-full overflow-y-auto scrollbar-thin shadow-2xl select-none">
          
          {/* Tab Selector Buttons */}
          <div className="grid grid-cols-5 gap-0.5 bg-[#1C1E26] p-0.5 rounded-xl border border-slate-800/40 shrink-0">
            <button
              onClick={() => setActiveTab("layers")}
              className={cn(
                "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                activeTab === "layers" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-100"
              )}
            >
              Layers
            </button>
            <button
              onClick={() => {
                if (selectedNodeIds.length === 1) {
                  setActiveTab("properties");
                } else {
                  toast.info("Select a shape to open properties!");
                }
              }}
              className={cn(
                "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                activeTab === "properties" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-100",
                selectedNodeIds.length !== 1 && "opacity-50 cursor-not-allowed"
              )}
            >
              Props
            </button>
            <button
              onClick={() => setActiveTab("assets")}
              className={cn(
                "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                activeTab === "assets" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-100"
              )}
            >
              Store
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={cn(
                "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                activeTab === "settings" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-100"
              )}
            >
              Config
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                activeTab === "history" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-100"
              )}
            >
              History
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-0.5 space-y-4 no-scrollbar">
            
            {/* TAB A: LAYERS PANEL */}
            {activeTab === "layers" && (
              <div className="space-y-4 select-none">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">Tactical Layers</span>
                  <button
                    onClick={() => setShowAddLayer(!showAddLayer)}
                    className="h-6 w-6 rounded-md bg-[#1C1E26] hover:bg-[#252833] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 cursor-pointer shadow"
                    title="Add Custom Layer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Inline Add Layer Form */}
                {showAddLayer && (
                  <form onSubmit={handleAddLayer} className="bg-[#1C1E26] p-2.5 rounded-xl border border-slate-800/60 space-y-2">
                    <Input
                      placeholder="e.g. Utility Lines"
                      value={newLayerName}
                      onChange={(e) => setNewLayerName(e.target.value)}
                      className="h-7 text-xs bg-[#0B0C10] border border-slate-800 text-slate-100"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button size="xs" variant="ghost" type="button" onClick={() => setShowAddLayer(false)} className="text-[10px] h-6 py-0 px-2.5">Cancel</Button>
                      <Button size="xs" type="submit" className="text-[10px] h-6 py-0 px-2.5 bg-indigo-600 text-white">Save</Button>
                    </div>
                  </form>
                )}

                {/* Layers scrollable stack */}
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {layers.map((layer) => {
                    const isActive = activeLayer === layer.id;
                    const isDefault = ["map", "team_rotations", "enemy_rotations", "zones", "utility", "notes", "markers", "coach_notes"].includes(layer.id);
                    
                    return (
                      <div
                        key={layer.id}
                        onClick={() => setActiveLayer(layer.id as any)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer",
                          isActive
                            ? "bg-[#1C1E26] border-indigo-500/50 shadow"
                            : "bg-[#1C1E26]/40 border-transparent hover:border-slate-800/40 hover:bg-[#1C1E26]/60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", isActive ? "bg-indigo-400 animate-pulse" : "bg-slate-600")} />
                          {editingLayerId === layer.id ? (
                            <input
                              type="text"
                              value={editingLayerName}
                              onChange={(e) => setEditingLayerName(e.target.value)}
                              onBlur={() => handleSaveRenameLayer(layer.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRenameLayer(layer.id);
                                if (e.key === "Escape") setEditingLayerId(null);
                              }}
                              className="bg-[#0B0C10] border border-slate-800 text-[11px] font-bold text-white px-1 py-0.5 rounded w-full outline-none"
                              autoFocus
                            />
                          ) : (
                            <span 
                              onDoubleClick={() => {
                                setEditingLayerId(layer.id);
                                setEditingLayerName(layer.name);
                              }}
                              className="text-[11px] font-bold text-slate-200 line-clamp-1 flex-1 leading-none select-none"
                            >
                              {layer.name}
                            </span>
                          )}
                        </div>

                        {/* Layer Actions lock, eye, trash */}
                        <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleLayerLock(layer.id)}
                            className="h-5.5 w-5.5 flex items-center justify-center text-slate-500 hover:text-slate-350 cursor-pointer"
                          >
                            {layer.isLocked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={() => toggleLayerVisibility(layer.id)}
                            className="h-5.5 w-5.5 flex items-center justify-center text-slate-500 hover:text-slate-350 cursor-pointer"
                          >
                            {layer.isVisible ? <Eye className="h-3.5 w-3.5 text-indigo-400" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          {!isDefault && (
                            <button
                              onClick={() => deleteLayer(layer.id)}
                              className="h-5.5 w-5.5 flex items-center justify-center text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-800/60 pt-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">Drawing Target:</span>
                  <p className="text-[11px] font-extrabold text-indigo-400 mt-1 font-sans">
                    {layers.find((l) => l.id === activeLayer)?.name || "Team Rotations"}
                  </p>
                </div>
              </div>
            )}

            {/* TAB B: OBJECT PROPERTIES TAB */}
            {activeTab === "properties" && selectedNode && (
              <div className="space-y-4 select-none">
                <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">Object Settings</span>
                  <span className="text-[9px] font-bold text-slate-500 font-mono uppercase bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                    {selectedNode.type}
                  </span>
                </div>

                {/* Layer Assignment */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide">Assign Layer</label>
                  <select
                    value={selectedNode.layer}
                    onChange={(e) => updateNode(selectedNode.id, { layer: e.target.value })}
                    className="w-full bg-[#1C1E26] border border-slate-800 text-[11px] font-bold text-slate-200 h-8 rounded-lg px-2 outline-none cursor-pointer"
                  >
                    {layers.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {/* Color swatches picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide">Brush Color</label>
                  <div className="grid grid-cols-7 gap-1 bg-[#1C1E26] p-2 border border-slate-800/40 rounded-xl">
                    {QUICK_COLORS.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => updateNode(selectedNode.id, { color: hex })}
                        className={cn(
                          "h-5.5 w-5.5 rounded border shadow-sm transition hover:scale-110 active:scale-95 cursor-pointer shrink-0",
                          selectedNode.color === hex ? "border-white ring-1 ring-white/50" : "border-slate-800"
                        )}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Stroke Thickness slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide">Thickness</label>
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">{selectedNode.strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={selectedNode.strokeWidth}
                    onChange={(e) => updateNode(selectedNode.id, { strokeWidth: parseInt(e.target.value) })}
                    className="w-full h-1 bg-[#1C1E26] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Opacity slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide">Opacity</label>
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">
                      {Math.round((selectedNode.opacity ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={selectedNode.opacity ?? 1}
                    onChange={(e) => updateNode(selectedNode.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-[#1C1E26] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Shape Fill Settings */}
                {(selectedNode.type === "circle" || selectedNode.type === "rect") && (
                  <div className="space-y-3 pt-2.5 border-t border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide cursor-pointer select-none" htmlFor="shape-fill-toggle">
                        Fill Area Highlight
                      </label>
                      <input
                        type="checkbox"
                        id="shape-fill-toggle"
                        checked={!!selectedNode.isFilled}
                        onChange={(e) => updateNode(selectedNode.id, { isFilled: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-800 bg-[#1C1E26] accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    {selectedNode.isFilled && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide">Fill Opacity</label>
                          <span className="text-[10px] font-bold text-indigo-400 font-mono">
                            {Math.round((selectedNode.fillOpacity ?? 0.35) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="1"
                          step="0.05"
                          value={selectedNode.fillOpacity ?? 0.35}
                          onChange={(e) => updateNode(selectedNode.id, { fillOpacity: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-[#1C1E26] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Text specific attributes (Fonts, Alignment) */}
                {selectedNode.type === "text" && (
                  <div className="space-y-3.5 border-t border-slate-800/60 pt-3">
                    <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide">Text Formatting</label>
                    
                    {/* Font size */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-slate-400">Font Size</span>
                        <span className="text-[10px] font-bold text-indigo-400 font-mono">{selectedNode.fontSize ?? 16}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="64"
                        step="2"
                        value={selectedNode.fontSize ?? 16}
                        onChange={(e) => updateNode(selectedNode.id, { fontSize: parseInt(e.target.value) })}
                        className="w-full h-1 bg-[#1C1E26] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Marker specific attributes (Labels, teams) */}
                {selectedNode.type === "marker" && (
                  <div className="space-y-3 border-t border-slate-800/60 pt-3">
                    <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide">Tactical Marker</label>
                    <div className="space-y-1.5">
                      <span className="text-[10.5px] font-bold text-slate-400">Label Text</span>
                      <Input
                        value={selectedNode.text || ""}
                        placeholder="e.g. Player A"
                        onChange={(e) => updateNode(selectedNode.id, { text: e.target.value })}
                        className="h-8 text-xs bg-[#1C1E26] border border-slate-800 text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {/* Standard operations */}
                <div className="border-t border-slate-800/60 pt-3 flex flex-col gap-2">
                  <Button
                    onClick={() => copyStyle(selectedNode.id)}
                    className="w-full h-8 font-bold text-[11px] rounded-lg border border-slate-800 bg-[#1C1E26] hover:bg-[#252833] text-slate-300 flex items-center justify-center gap-1.5"
                  >
                    <CopyIcon className="h-3.5 w-3.5" />
                    <span>Copy Styling</span>
                  </Button>
                  {styleClipboard && (
                    <Button
                      onClick={() => pasteStyle(selectedNode.id)}
                      className="w-full h-8 font-bold text-[11px] rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5"
                    >
                      <Palette className="h-3.5 w-3.5" />
                      <span>Paste Style</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* TAB E: ASSETS STORE PANEL */}
            {activeTab === "assets" && (
              <div className="space-y-4 select-none flex flex-col h-full min-h-0">
                <div className="border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">Assets Store</span>
                </div>
                <AssetsStorePanel
                  allowUpload={currentTeam?.owner_id === user?.id}
                  activeAssetUrl={pendingLogo?.url ?? null}
                  onAddAsset={({ name, url, isCircular }) => {
                    setPendingLogo({ name, url, isCircular });
                    setTool("logo-place");
                    toast.info(`Select a location on the map to place "${name}"`);
                  }}
                />
              </div>
            )}

            {/* TAB C: CONFIGURATION BOARD SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-4 select-none">
                <div className="border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">Board Settings</span>
                </div>

                {/* Grid controls */}
                <div className="bg-[#1C1E26]/40 p-3.5 border border-slate-800/50 rounded-xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">Snap to Grid</span>
                      <span className="text-[9.5px] text-slate-500">Locks drawings to 15px coordinates</span>
                    </div>
                    <button
                      onClick={toggleSnapToGrid}
                      className={cn(
                        "h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer relative",
                        snapToGrid ? "bg-emerald-600" : "bg-slate-700"
                      )}
                    >
                      <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition shadow", snapToGrid && "translate-x-5")} />
                    </button>
                  </div>
                </div>

                {/* Replay Playback Deck */}
                <div className="bg-[#1C1E26]/40 p-3.5 border border-slate-800/50 rounded-xl space-y-3.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300">Timeline Player</span>
                    <span className="text-[9.5px] text-slate-500">Play, Pause or Scrub teammate rotations</span>
                  </div>

                  {/* Play Pause trigger */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setReplaying(!isReplaying)}
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer",
                        isReplaying
                          ? "bg-rose-950/20 border-rose-900/50 text-rose-400 hover:text-rose-300 shadow animate-pulse"
                          : "bg-indigo-600/20 border-indigo-500/30 text-indigo-400 hover:text-indigo-300 shadow"
                      )}
                    >
                      {isReplaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <span className="text-[10px] font-bold text-slate-300 font-mono leading-none">
                        {isReplaying ? "PLAYING" : "PAUSED"}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono mt-1">
                        Timeline: {Math.round(replayProgress * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Timeline Scrubbing slider */}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={replayProgress}
                    onChange={(e) => setReplayProgress(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* TAB D: ACTION HISTORY LOG STACK */}
            {activeTab === "history" && (
              <div className="space-y-4 select-none">
                <div className="border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">Action History</span>
                </div>

                <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {historyLogs.length === 0 ? (
                    <div className="text-center py-6 text-slate-550 space-y-1">
                      <History className="h-6 w-6 text-slate-650 mx-auto opacity-40" />
                      <p className="text-[10px] font-bold">No draw events logged yet</p>
                      <p className="text-[9px]">History stack fills as you edit</p>
                    </div>
                  ) : (
                    // Reverse maps so latest actions appear at top
                    [...historyLogs].reverse().map((log, index) => {
                      const actualIndex = historyLogs.length - 1 - index;
                      return (
                        <div
                          key={index}
                          onClick={() => {
                            revertToHistoryStep(actualIndex);
                            toast.info(`Restored whiteboard step ${actualIndex + 1}!`);
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg bg-[#1C1E26]/40 hover:bg-[#1C1E26] border border-transparent hover:border-slate-800/40 text-left cursor-pointer transition select-none group"
                        >
                          <span className="text-[10px] font-bold text-slate-300 group-hover:text-white truncate">
                            {log}
                          </span>
                          <span className="text-[8px] text-slate-500 font-mono shrink-0 ml-2">
                            Step {actualIndex + 1}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* 3. OFFLINE LOCAL DRAFT RECOVERY DIALOG */}
      <Dialog open={draftExists} onOpenChange={() => {}}>
        <DialogContent className="border-slate-800 bg-[#13151D] text-slate-200 max-w-md rounded-2xl shadow-2xl">
          <DialogHeader className="space-y-2 select-none">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold font-mono">
              <Settings2 className="h-5 w-5" />
              <span>OFFLINE DRAFT DETECTED</span>
            </div>
            <DialogTitle className="text-lg font-extrabold text-white">
              Unsaved draft recovered!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 leading-relaxed mt-1">
              We identified unsaved changes from <strong className="text-slate-200">{draftTime || "recently"}</strong> stored as an offline local draft. Do you want to recover these whiteboard drawings or discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={handleDiscardDraft} className="border border-slate-800 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold px-4 h-8.5">
              Discard Draft
            </Button>
            <Button onClick={handleRecoverDraft} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold px-4 h-8.5 shadow-md">
              Recover drawings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
