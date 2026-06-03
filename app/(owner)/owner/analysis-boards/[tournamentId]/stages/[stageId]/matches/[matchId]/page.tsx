"use client";

import React, { use, useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { WhiteboardCanvas } from "@/components/whiteboard/WhiteboardCanvas";
import { WhiteboardToolbar } from "@/components/whiteboard/WhiteboardToolbar";
import { LogoUploadPanel } from "@/components/analysis-board/LogoUploadPanel";
import { AssetsStorePanel } from "@/components/whiteboard/AssetsStorePanel";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Save,
  Video,
  Link as LinkIcon,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  History,
  CopyIcon,
  Palette,
  Undo,
  Redo,
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
    layers,
    selectedNodeIds,
    activeTool,
    setTool,
    activeLayer,
    setActiveLayer,
    historyLogs,
    revertToHistoryStep,
    copyStyle,
    pasteStyle,
    styleClipboard,
    addCustomLayer,
    renameLayer,
    deleteLayer,
    toggleLayerLock,
    toggleLayerVisibility,
    loadDocument,
    addNode,
    updateNode,
    deleteSelectedNodes,
    deselectAll,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasStore();

  const [videoUrl, setVideoUrl] = useState("");
  const [activeTextNode, setActiveTextNode] = useState<CanvasNode | null>(null);

  // Active right sidebar tab
  const [activeTab, setActiveTab] = useState<"layers" | "properties" | "settings" | "history" | "assets">("layers");

  // Dynamic layer creation state
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState("");

  // Auto-switch tab to properties when an object is selected
  useEffect(() => {
    if (selectedNodeIds.length === 1) {
      setActiveTab("properties");
    } else if (activeTab === "properties") {
      setActiveTab("layers");
    }
  }, [selectedNodeIds]);

  // Keyboard shortcuts
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

      const key = e.key.toLowerCase();
      if (key === "v") { e.preventDefault(); setTool("select"); }
      else if (key === "h") { e.preventDefault(); setTool("pan"); }
      else if (key === "t") { e.preventDefault(); setTool("text"); }
      else if (key === "d") { e.preventDefault(); setTool("freedraw"); }
      else if (key === "p") { e.preventDefault(); setTool("rotation"); }
      else if (key === "e") { e.preventDefault(); setTool("eraser"); }
      else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelectedNodes();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool, deleteSelectedNodes]);

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
      type: "logo-marker" as any,
      layer: "rotations",
      x: 0.5,
      y: 0.5,
      radius: 0.035,
      markerType: logoUrl,
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
    
    if (videoUrl.trim() && !videoUrl.startsWith("http://") && !videoUrl.startsWith("https://")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    updateNode(activeTextNode.id, {
      linkedUrl: videoUrl.trim() || undefined,
    } as any);

    toast.success("Video URL successfully annotated to text node!");
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

  // Standard quick color swatch grid
  const QUICK_COLORS = [
    "#EF4444", "#F97316", "#EAB308", "#22C55E", "#10B981", 
    "#06B6D4", "#3B82F6", "#6366F1", "#A855F7", "#EC4899", 
    "#FFFFFF", "#94A3B8", "#475569", "#000000"
  ];

  if (matchLoading) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-[#0B0C10] text-slate-100 rounded-[24px] border border-slate-900 shadow-2xl">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-400">Loading strategy workspace...</p>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-[#0B0C10] text-slate-100 rounded-[24px] border border-slate-900 shadow-2xl p-6">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-white">Failed to load strategy board</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">
          Verify your permissions and server connection.
        </p>
        <Link href={`/owner/analysis-boards/${tournamentId}`} className="mt-4">
          <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-[#1C1E26]">Back to stages</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col justify-between select-none relative bg-[#0B0C10] p-4 text-slate-100 rounded-[24px] border border-slate-900 shadow-2xl">
      
      {/* 1. TOP HEADER & UTILITIES BAR */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 select-none">
        <div className="flex items-center gap-3">
          <Link href={`/owner/analysis-boards/${tournamentId}`}>
            <Button variant="ghost" size="icon" className="h-8.5 w-8.5 border border-slate-800 bg-[#13151D] hover:bg-[#1C1E26] text-slate-400 hover:text-slate-100 rounded-[10px] shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-white line-clamp-1 max-w-xs md:max-w-md">
                {match.match_name} Strategy Canvas
              </h2>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-900/50 text-indigo-400">
                {match.map}
              </span>
            </div>
          </div>
        </div>

        {/* Action controls */}
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

          {/* Attach video link helper popover */}
          {activeTextNode && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="border-slate-800 bg-[#13151D] hover:bg-[#1C1E26] text-rose-400 hover:text-rose-300 font-semibold gap-1.5 h-8.5 rounded-[10px] shadow-sm">
                  <Video className="h-4 w-4 animate-pulse" />
                  <span>Attach Video</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 border border-slate-800 bg-[#13151D] text-slate-300 shadow-2xl rounded-2xl p-4" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1">
                      <LinkIcon className="h-3.5 w-3.5 text-cyan-500" /> Link Video URL
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Attach YouTube or Instagram clips to this text node.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="bg-[#1C1E26] border-slate-800 text-xs h-8 text-slate-100"
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

          {/* Save & Exit button */}
          <Button
            size="sm"
            variant="outline"
            className="border-slate-800 bg-[#13151D] hover:bg-amber-600 text-amber-400 hover:text-white font-semibold gap-1.5 h-8.5 px-4 font-mono uppercase tracking-wider transition-colors shadow-sm rounded-[10px]"
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
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 h-8.5 px-4 font-mono uppercase tracking-wider shadow-sm rounded-[10px]"
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

      {/* 2. 3-PANEL WORKSPACE GRID LAYOUT */}
      <div className="flex-1 flex gap-3.5 overflow-hidden min-h-0 select-none">
        
        {/* PANEL 1: LEFT VERTICAL TOOLBELT */}
        <div className="shrink-0 flex items-stretch select-none relative z-20">
          <WhiteboardToolbar onAddLogo={() => {
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
            mapId={match.map}
            userId={user?.id || ""}
            username={user?.email?.split("@")[0] || "Owner"}
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
              onClick={() => setActiveTab("settings")}
              className={cn(
                "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                activeTab === "settings" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-100"
              )}
            >
              Logos
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
                      <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddLayer(false)} className="text-[10px] h-6 py-0 px-2.5 text-slate-400">Cancel</Button>
                      <Button size="sm" type="submit" className="text-[10px] h-6 py-0 px-2.5 bg-indigo-600 text-white">Save</Button>
                    </div>
                  </form>
                )}

                {/* Layers scrollable stack */}
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
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
                      <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide cursor-pointer select-none" htmlFor="match-shape-fill-toggle">
                        Fill Area Highlight
                      </label>
                      <input
                        type="checkbox"
                        id="match-shape-fill-toggle"
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

                {/* Text specific attributes */}
                {selectedNode.type === "text" && (
                  <div className="space-y-3.5 border-t border-slate-800/60 pt-3">
                    <label className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-wide">Text Formatting</label>
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

                {/* Marker specific attributes */}
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

            {/* TAB C: LOGOS / ROSTER PANEL */}
            {activeTab === "settings" && (
              <div className="space-y-4 select-none">
                <div className="border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">Roster Markers</span>
                </div>
                <LogoUploadPanel
                  tournamentId={tournamentId}
                  onAddMarkerToCanvas={handleAddLogoMarker}
                />
              </div>
            )}

            {/* TAB E: ASSETS STORE PANEL */}
            {activeTab === "assets" && (
              <div className="space-y-4 select-none flex flex-col h-full min-h-0">
                <div className="border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">Assets Store</span>
                </div>
                <AssetsStorePanel
                  allowUpload={true}
                  onAddAsset={({ name, url, isCircular }) => {
                    const nodeId = `logo-marker-${Date.now()}`;
                    const newNode: CanvasNode = {
                      id: nodeId,
                      type: "logo-marker" as any,
                      layer: activeLayer,
                      x: 0.5,
                      y: 0.5,
                      radius: 0.035,
                      markerType: url,
                      text: name,
                      color: "#ffffff",
                      strokeWidth: 1,
                      isCircular,
                      createdBy: user?.id || "",
                      updatedBy: user?.id || "",
                      updatedAt: Date.now(),
                      version: 1,
                    };
                    addNode(newNode);
                    toast.success(`Placed "${name}" on canvas!`);
                  }}
                />
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
    </div>
  );
}
