"use client";

import { use, useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapId, Match, MatchPlayer, MapEvent, TelemetryEventType } from "@/lib/types/app.types";
import { ArrowLeft, Loader2, Target, Shield, Compass, Sparkles, AlertTriangle, Play, HelpCircle, Save, RefreshCw, Undo2, Redo2, Trash2, MousePointer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MatchDetailResponse extends Match {
  players: MatchPlayer[];
  events: MapEvent[];
}

interface OptimisticEvent extends MapEvent {
  status: "pending" | "saved" | "error";
}

const ROTATION_COLORS = [
  { name: "Cyan", value: "#00FFFF", bg: "bg-[#00FFFF] border-cyan-200" },
  { name: "Yellow", value: "#FFFF00", bg: "bg-[#FFFF00] border-yellow-200" },
  { name: "Pink", value: "#FF69B4", bg: "bg-[#FF69B4] border-pink-200" },
  { name: "Orange", value: "#FF8C00", bg: "bg-[#FF8C00] border-orange-200" },
  { name: "Mint", value: "#00FF88", bg: "bg-[#00FF88] border-emerald-200" },
  { name: "Purple", value: "#BF5FFF", bg: "bg-[#BF5FFF] border-purple-200" },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MatchDetailPage({ params }: PageProps) {
  const { id: matchId } = use(params);
  const router = useRouter();
  const [matchData, setMatchData] = useState<MatchDetailResponse | null>(null);
  const [events, setEvents] = useState<OptimisticEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Plotting Telemetry States
  const [activePlotType, setActivePlotType] = useState<TelemetryEventType | null>(TelemetryEventType.Knock);
  const [selectedPlayerForEvent, setSelectedPlayerForEvent] = useState<string>("");
  const mapRef = useRef<HTMLDivElement>(null);
  const [draftRotationPath, setDraftRotationPath] = useState<{ x: number; y: number }[] | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Undo / Redo history for telemetry events
  const eventsHistoryRef = useRef<OptimisticEvent[][]>([]);
  const eventsRedoRef = useRef<OptimisticEvent[][]>([]);

  // Zoom & Pan Telemetry Viewport States
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [spacePressed, setSpacePressed] = useState<boolean>(false);
  const [selectedRotationColor, setSelectedRotationColor] = useState<string>("#00FFFF");

  useEffect(() => {
    setDraftRotationPath(null);
    setSelectedEventId(null);
  }, [activePlotType]);

  // Stable refs for undo/redo/delete callbacks (avoids stale closures in keyboard handler)
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const selectedEventIdRef = useRef(selectedEventId);
  selectedEventIdRef.current = selectedEventId;

  const pushEventsHistory = () => {
    eventsHistoryRef.current = [...eventsHistoryRef.current, [...eventsRef.current]];
    if (eventsHistoryRef.current.length > 40) eventsHistoryRef.current.shift();
    eventsRedoRef.current = [];
  };

  const undoEvent = () => {
    if (eventsHistoryRef.current.length === 0) return;
    const prev = eventsHistoryRef.current.pop()!;
    eventsRedoRef.current.push([...eventsRef.current]);
    setEvents(prev);
    setSelectedEventId(null);
  };

  const redoEvent = () => {
    if (eventsRedoRef.current.length === 0) return;
    const next = eventsRedoRef.current.pop()!;
    eventsHistoryRef.current.push([...eventsRef.current]);
    setEvents(next);
    setSelectedEventId(null);
  };

  const deleteSelectedEvent = () => {
    const sid = selectedEventIdRef.current;
    if (!sid) return;
    pushEventsHistory();
    setEvents((prev) => prev.filter((ev) => ev.id !== sid));
    setSelectedEventId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(true);
        if (e.target === document.body) {
          e.preventDefault();
        }
      }
      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoEvent();
        return;
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        e.preventDefault();
        redoEvent();
        return;
      }
      // Delete selected event
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEventIdRef.current) {
        e.preventDefault();
        deleteSelectedEvent();
        return;
      }
      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedEventId(null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Debounced Batch Save States
  const pendingEventsRef = useRef<OptimisticEvent[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // AI Coaching States
  const [aiReview, setAiReview] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLockMessage, setAiLockMessage] = useState("");

  const mapConfig = useMemo(() => {
    if (!matchData?.map) return null;
    const name = matchData.map;
    return {
      id: name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      path: `/maps/${name}.jpg`,
    };
  }, [matchData?.map]);

  const fetchMatchDetails = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      if (!response.ok) {
        throw new Error("Failed to load match record");
      }
      const data = await response.json();
      setMatchData(data);
      setSelectedPlayerForEvent(data.players?.[0]?.player_name || "");
      // Map loaded db events as 'saved' status initially
      setEvents(
        (data.events || []).map((e: MapEvent) => ({
          ...e,
          status: "saved",
        }))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch scorecard details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  // Debounced bulk upload saver
  const flushBatchEvents = async () => {
    const pendingToSave = [...pendingEventsRef.current];
    if (pendingToSave.length === 0) return;

    setIsSyncing(true);
    pendingEventsRef.current = []; // Clear pending ref queue

    try {
      const response = await fetch(`/api/matches/${matchId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: pendingToSave.map((e) => ({
            client_event_id: e.client_event_id,
            type: e.type,
            x: e.x,
            y: e.y,
            player_name: e.player_name,
            timestamp_ms: e.timestamp_ms,
            metadata: e.metadata ?? {},
            schema_version: e.schema_version,
          })),
        }),
      });

      if (!response.ok) throw new Error("Bulk telemetry save failed");

      // Transition pending events status to 'saved'
      const savedIds = new Set(pendingToSave.map((e) => e.client_event_id));
      setEvents((prev) =>
        prev.map((e) =>
          e.client_event_id && savedIds.has(e.client_event_id)
            ? { ...e, status: "saved" as const }
            : e
        )
      );
      toast.success(`Idempotently synced ${pendingToSave.length} telemetry coordinate plots!`);
    } catch (err: any) {
      console.error("Batch save error:", err);
      // Transition pending events status to 'error' to allow user retries
      const errorIds = new Set(pendingToSave.map((e) => e.client_event_id));
      setEvents((prev) =>
        prev.map((e) =>
          e.client_event_id && errorIds.has(e.client_event_id)
            ? { ...e, status: "error" as const }
            : e
        )
      );
      toast.error("Network sync failed. Mapped coordinates flagged for retry.");
    } finally {
      setIsSyncing(false);
    }
  };

  const getPlayerColor = (playerName: string | null): string => {
    if (!playerName) return "hsl(210, 100%, 65%)"; // default primary blue
    const colors = [
      "hsl(210, 100%, 65%)", // Vibrant Blue
      "hsl(280, 85%, 65%)",  // Vibrant Purple
      "hsl(330, 90%, 60%)",  // Vibrant Pink/Magenta
      "hsl(160, 85%, 45%)",  // Vibrant Emerald Green
      "hsl(35, 100%, 60%)",  // Vibrant Amber/Orange
      "hsl(190, 95%, 45%)",  // Vibrant Cyan
      "hsl(15, 95%, 60%)",   // Vibrant Coral/Red
    ];
    let hash = 0;
    for (let i = 0; i < playerName.length; i++) {
      hash = playerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const wasDraggingRef = useRef(false);
  const isDrawingPathRef = useRef(false);
  const isDraggingMapRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    wasDraggingRef.current = false;

    // Check if we should pan the map
    const shouldPan = isPanMode || spacePressed || ("button" in e && e.button === 1);
    if (shouldPan) {
      isDraggingMapRef.current = true;
      dragStartRef.current = { x: clientX - pan.x, y: clientY - pan.y };
      return;
    }

    // Ignore clicks that land on overlay buttons/controls
    const target = ("touches" in e ? (e as React.TouchEvent).target : (e as React.MouseEvent).target) as HTMLElement;
    if (target.closest && (target.closest("button") || target.closest("[data-overlay-controls]"))) return;

    // Check if we should draw freehand rotation path
    if (activePlotType === TelemetryEventType.Rotation) {
      isDrawingPathRef.current = true;
      
      const rect = mapRef.current.getBoundingClientRect();
      const containerX = clientX - rect.left;
      const containerY = clientY - rect.top;
      const x = ((containerX - pan.x) / zoom) / rect.width;
      const y = ((containerY - pan.y) / zoom) / rect.height;

      const newPoint = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };

      // Append to existing draft path so user can stop and resume drawing
      setDraftRotationPath((prev) => {
        if (prev && prev.length > 0) {
          return [...prev, newPoint];
        }
        return [newPoint];
      });
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    if (isDraggingMapRef.current) {
      wasDraggingRef.current = true;
      const newX = clientX - dragStartRef.current.x;
      const newY = clientY - dragStartRef.current.y;
      
      // Constrain panning to keep map within view boundaries
      const rect = mapRef.current.getBoundingClientRect();
      const maxPanX = rect.width * (zoom - 0.2);
      const maxPanY = rect.height * (zoom - 0.2);
      const constrainedX = Math.max(-maxPanX, Math.min(rect.width * 0.2, newX));
      const constrainedY = Math.max(-maxPanY, Math.min(rect.height * 0.2, newY));
      
      setPan({ x: constrainedX, y: constrainedY });
      return;
    }

    if (isDrawingPathRef.current && activePlotType === TelemetryEventType.Rotation) {
      wasDraggingRef.current = true;
      const rect = mapRef.current.getBoundingClientRect();
      const containerX = clientX - rect.left;
      const containerY = clientY - rect.top;
      const x = ((containerX - pan.x) / zoom) / rect.width;
      const y = ((containerY - pan.y) / zoom) / rect.height;

      const normX = Math.max(0, Math.min(1, x));
      const normY = Math.max(0, Math.min(1, y));

      setDraftRotationPath((prev) => {
        if (!prev) return [{ x: normX, y: normY }];
        const last = prev[prev.length - 1];
        const dist = Math.sqrt(Math.pow(normX - last.x, 2) + Math.pow(normY - last.y, 2));
        if (dist > 0.003) {
          return [...prev, { x: normX, y: normY }];
        }
        return prev;
      });
    }
  };

  const handlePointerUp = () => {
    isDraggingMapRef.current = false;

    if (isDrawingPathRef.current) {
      isDrawingPathRef.current = false;
      if (draftRotationPath && draftRotationPath.length < 2) {
        setDraftRotationPath(null);
      }
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || !matchData) return;
    
    // Ignore clicks on overlay buttons
    const target = e.target as HTMLElement;
    if (target.closest && (target.closest("button") || target.closest("[data-overlay-controls]"))) return;

    // Ignore marker placement triggers during dragging or active pan modes
    if (isPanMode || spacePressed || wasDraggingRef.current) return;
    if (activePlotType === TelemetryEventType.Rotation) return;

    // Select mode: clicking empty area deselects any selected event
    if (activePlotType === null) {
      setSelectedEventId(null);
      return;
    }

    const rect = mapRef.current.getBoundingClientRect();
    const containerX = e.clientX - rect.left;
    const containerY = e.clientY - rect.top;

    const x = ((containerX - pan.x) / zoom) / rect.width;
    const y = ((containerY - pan.y) / zoom) / rect.height;

    const finalX = Math.max(0, Math.min(1, x));
    const finalY = Math.max(0, Math.min(1, y));

    const newEvent: OptimisticEvent = {
      id: crypto.randomUUID(), // Temp database UUID
      client_event_id: crypto.randomUUID(), // authoritative idempotency UUID
      match_id: matchId,
      type: activePlotType!,
      x: finalX,
      y: finalY,
      player_name: selectedPlayerForEvent || null,
      timestamp_ms: Date.now() - new Date(matchData.played_at).getTime() || 0,
      metadata: {},
      schema_version: 1,
      deleted_at: null,
      created_at: new Date().toISOString(),
      status: "pending",
    };

    // Push undo history snapshot and plot immediately
    pushEventsHistory();
    setEvents((prev) => [...prev, newEvent]);
    pendingEventsRef.current.push(newEvent);

    // Debounce the save trigger (2-second threshold)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      flushBatchEvents();
    }, 2000);
  };

  const saveDraftRotationPath = () => {
    if (!draftRotationPath || draftRotationPath.length < 2 || !matchData) return;
    const firstPoint = draftRotationPath[0];

    const newEvent: OptimisticEvent = {
      id: crypto.randomUUID(),
      client_event_id: crypto.randomUUID(),
      match_id: matchId,
      type: TelemetryEventType.Rotation,
      x: firstPoint.x,
      y: firstPoint.y,
      player_name: selectedPlayerForEvent || null,
      timestamp_ms: Date.now() - new Date(matchData.played_at).getTime() || 0,
      metadata: {
        pathPoints: draftRotationPath,
        color: selectedRotationColor,
      },
      schema_version: 1,
      deleted_at: null,
      created_at: new Date().toISOString(),
      status: "pending",
    };

    pushEventsHistory();
    setEvents((prev) => [...prev, newEvent]);
    pendingEventsRef.current.push(newEvent);
    setDraftRotationPath(null);

    // Trigger debounced bulk telemetry batch sync
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      flushBatchEvents();
    }, 2000);
  };

  // Manual save trigger to retry error markers
  const retryFailedEvents = () => {
    const failedEvents = events.filter((e) => e.status === "error");
    if (failedEvents.length === 0) return;

    // Reset failed events to pending state and queue them
    setEvents((prev) =>
      prev.map((e) => (e.status === "error" ? { ...e, status: "pending" as const } : e))
    );
    pendingEventsRef.current.push(...failedEvents);
    flushBatchEvents();
  };

  // Compile AI Coach Review (caching and lock status handler)
  const triggerAiCoaching = async () => {
    setAiLoading(true);
    setAiLockMessage("AI Analyst is evaluating playzone choke sectors...");

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/matches/${matchId}/coach`, {
          method: "POST",
        });

        if (response.status === 202) {
          // Locked: Generation in progress, wait and poll
          const data = await response.json();
          setAiLockMessage(data.message || "AI Coach is currently analyzing match telemetry...");
          setTimeout(checkStatus, 3000);
        } else if (response.ok) {
          const data = await response.json();
          setAiReview(data.review);
          setAiLoading(false);
          toast.success("AI coaching analysis loaded successfully!");
        } else {
          throw new Error("Coaching compilation timed out");
        }
      } catch (err: any) {
        toast.error(err.message || "AI Coach encountered an error");
        setAiLoading(false);
      }
    };

    checkStatus();
  };

  const softDeleteMatch = async () => {
    if (!confirm("Are you sure you want to soft-delete this match scorecard? Telemetry will also be deactivated.")) return;
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
      toast.success("Match scorecard soft-deleted.");
      router.push("/matches");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete scorecard");
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">Loading tactical match files...</span>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-xl font-bold">Scorecard Not Found</h2>
        <Link href="/matches" className="mt-4">
          <Button>Back to Logs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/matches">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-border">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground capitalize">
              {matchData.map} Match breakdown
            </h1>
            <p className="text-xs text-muted-foreground">
              MAPPED PLACEMENT: Rank {matchData.placement} • SQUAD KILLS: {matchData.total_kills}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={softDeleteMatch} className="text-xs border-destructive/20 text-destructive hover:bg-destructive/10">
            Deactivate Scorecard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scorecard & Teammate stats (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Scorecard overview */}
          <Card className="border-border bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-border bg-secondary/15">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground"> Roster Scorecard</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-secondary/5 text-[9px] hover:bg-transparent">
                    <TableHead className="px-4 py-2 font-extrabold text-muted-foreground uppercase">Player</TableHead>
                    <TableHead className="px-2 py-2 text-center font-extrabold text-muted-foreground uppercase">Kills</TableHead>
                    <TableHead className="px-4 py-2 text-right font-extrabold text-muted-foreground uppercase">Damage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {matchData.players.map((p, idx) => (
                    <TableRow key={idx} className="border-border hover:bg-secondary/10">
                      <TableCell className="px-4 py-3 font-semibold text-xs flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", p.survived ? "bg-[hsl(160,70%,45%)]" : "bg-muted-foreground/30")} />
                        {p.player_name}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs font-mono font-medium">{p.kills}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-xs font-mono font-bold">{p.damage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Card 2: AI Coach analysis trigger */}
          <Card className="border-border bg-card/45 backdrop-blur-sm relative overflow-hidden group">
            {aiLoading && (
              <div className="absolute inset-0 bg-background/90 z-20 flex flex-col items-center justify-center p-4 text-center select-none gap-3">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">Analyzing Playzone Telemetry...</p>
                  <p className="text-[10px] text-muted-foreground animate-pulse leading-normal max-w-[200px] mx-auto">
                    {aiLockMessage}
                  </p>
                </div>
              </div>
            )}
            
            <CardHeader className="pb-3 border-b border-border bg-secondary/15">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                  Tactical AI Coach
                </CardTitle>
                {aiReview && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold">
                    Score: {aiReview.confidenceScore}/10
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {aiReview ? (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  <div className="p-3 rounded-lg bg-secondary/25 border border-border text-xs leading-relaxed text-muted-foreground font-medium italic">
                    {aiReview.summary}
                  </div>

                  {/* Grounded Strengths */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-[hsl(160,70%,45%)] uppercase tracking-wider">Tactical Strengths</span>
                    <ul className="space-y-2 list-none p-0 m-0">
                      {aiReview.strengths.map((s: any, idx: number) => (
                        <li key={idx} className="text-xs leading-normal text-foreground">
                          • {s.note}
                          <div className="text-[9px] text-muted-foreground pl-2.5 mt-0.5 font-mono">
                            Evidence: {s.evidence.join(", ")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Grounded Weaknesses */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-destructive uppercase tracking-wider">Skirmish Failures</span>
                    <ul className="space-y-2 list-none p-0 m-0">
                      {aiReview.weaknesses.map((w: any, idx: number) => (
                        <li key={idx} className="text-xs leading-normal text-foreground">
                          • {w.note}
                          <div className="text-[9px] text-muted-foreground pl-2.5 mt-0.5 font-mono">
                            Evidence: {w.evidence.join(", ")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Phase Ratings */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-secondary/15 border border-border text-center">
                      <p className="text-[9px] text-muted-foreground uppercase font-extrabold">Early</p>
                      <p className="text-sm font-black text-primary">{aiReview.earlyGame.rating}/10</p>
                    </div>
                    <div className="p-2 rounded bg-secondary/15 border border-border text-center">
                      <p className="text-[9px] text-muted-foreground uppercase font-extrabold">Mid</p>
                      <p className="text-sm font-black text-primary">{aiReview.midGame.rating}/10</p>
                    </div>
                    <div className="p-2 rounded bg-secondary/15 border border-border text-center">
                      <p className="text-[9px] text-muted-foreground uppercase font-extrabold">Late</p>
                      <p className="text-sm font-black text-primary">{aiReview.lateGame.rating}/10</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">Coach Guidelines</span>
                    <ul className="space-y-2 list-none p-0 m-0">
                      {aiReview.tacticalRecommendations.map((r: any, idx: number) => (
                        <li key={idx} className="text-xs leading-normal text-foreground">
                          • {r.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Generate an automated, grounded tactical breakdown of roster rotation mistakes, knocks spacing, and shooter damage form.
                  </p>
                  <Button type="button" onClick={triggerAiCoaching} className="w-full font-semibold gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Compile AI Coaching Review
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Telemetry Event Map Overlay (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-border bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-border bg-secondary/15 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Tactical Telemetry Plotter</CardTitle>
                <CardDescription className="text-xs">Click competitive map to record kills, deaths, or rotation battles.</CardDescription>
              </div>

              {/* Retry button for error batch saves */}
              {events.some((e) => e.status === "error") && (
                <Button
                  onClick={retryFailedEvents}
                  size="sm"
                  className="bg-destructive text-white hover:bg-destructive/90 text-[10px] h-7 gap-1 font-bold shadow"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Retry Failed Saves
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Plotting parameters selector bar */}
              <div className="flex flex-wrap items-center gap-3 bg-background/50 border border-border p-3 rounded-xl select-none">
                <div className="flex gap-1.5 shrink-0">
                  {/* Select mode toggle */}
                  <Button
                    type="button"
                    size="sm"
                    variant={activePlotType === null ? "default" : "outline"}
                    onClick={() => setActivePlotType(null)}
                    className={cn(
                      "text-[10px] font-bold h-7 px-2 gap-1",
                      activePlotType === null && "shadow"
                    )}
                    title="Select & manage placed markers"
                  >
                    <MousePointer className="h-3 w-3" />
                    Select
                  </Button>
                  <div className="h-5 w-[1px] bg-border" />
                  {Object.values(TelemetryEventType).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={activePlotType === t ? "default" : "outline"}
                      onClick={() => setActivePlotType(activePlotType === t ? null : t)}
                      className={cn(
                        "text-[10px] font-bold h-7 capitalize px-2.5",
                        activePlotType === t && "shadow"
                      )}
                    >
                      {t}
                    </Button>
                  ))}
                </div>

                <div className="h-4 w-[1px] bg-border hidden sm:block" />

                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span>Actor:</span>
                  <Select
                    value={selectedPlayerForEvent}
                    onValueChange={(val) => setSelectedPlayerForEvent(val || "")}
                  >
                    <SelectTrigger className="bg-background border-border text-[10px] h-7 px-2 font-bold w-28">
                      <SelectValue placeholder="Roster" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {matchData.players.map((p) => (
                        <SelectItem key={p.id} value={p.player_name} className="text-[10px] hover:bg-accent/30 font-semibold">
                          {p.player_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customizable Rotation Path Line Colors */}
                {activePlotType === TelemetryEventType.Rotation && (
                  <>
                    <div className="h-4 w-[1px] bg-border hidden md:block" />
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <span>Path Color:</span>
                      <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg p-1">
                        {ROTATION_COLORS.map((c) => {
                          const isSelected = selectedRotationColor === c.value;
                          return (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setSelectedRotationColor(c.value)}
                              className={cn(
                                "h-5 w-5 rounded-full border transition-all hover:scale-110 flex items-center justify-center cursor-pointer",
                                c.bg,
                                isSelected ? "border-white scale-105 shadow-sm opacity-100" : "border-transparent opacity-60"
                              )}
                              title={c.name}
                            >
                              {isSelected && <span className="h-1 w-1 bg-white rounded-full" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Undo / Redo / Delete controls */}
                <div className="h-4 w-[1px] bg-border hidden sm:block" />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={undoEvent}
                    disabled={eventsHistoryRef.current.length === 0}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground hover:bg-secondary/40 transition cursor-pointer disabled:cursor-default"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={redoEvent}
                    disabled={eventsRedoRef.current.length === 0}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground hover:bg-secondary/40 transition cursor-pointer disabled:cursor-default"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </button>
                  {selectedEventId && (
                    <button
                      type="button"
                      onClick={deleteSelectedEvent}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition cursor-pointer"
                      title="Delete selected (Del)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {isSyncing && (
                  <span className="text-[9px] text-primary animate-pulse font-bold ml-auto flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing coordinates...
                  </span>
                )}
              </div>

              {/* Map coordinate clicking viewport */}
              {mapConfig && (
                <div
                  ref={mapRef}
                  onClick={handleMapClick}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                  className={cn(
                    "relative aspect-square rounded-2xl border border-border overflow-hidden bg-[#0a0b0d] select-none group transition-all",
                    isPanMode || spacePressed ? "cursor-grab active:cursor-grabbing" : activePlotType === null ? "cursor-default" : "cursor-crosshair"
                  )}
                >
                  {/* Floating Draft Control Bar */}
                  {draftRotationPath && draftRotationPath.length > 0 && (
                    <div
                      data-overlay-controls
                      onMouseDown={(evt) => evt.stopPropagation()}
                      onTouchStart={(evt) => evt.stopPropagation()}
                      className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-background/95 backdrop-blur-md border border-border px-4 py-2 rounded-full shadow-xl flex items-center gap-3 text-xs font-semibold select-none"
                    >
                      <span className="text-primary font-bold animate-pulse flex items-center gap-1.5">
                        <Compass className="h-3.5 w-3.5" />
                        Drawing Path ({draftRotationPath.length} pts)
                      </span>
                      <div className="h-3 w-[1px] bg-border" />
                      <Button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          saveDraftRotationPath();
                        }}
                        disabled={draftRotationPath.length < 2}
                        className="h-6 px-3 text-[10px] font-extrabold bg-[hsl(160,70%,45%)] text-white hover:bg-[hsl(160,70%,40%)] rounded-full transition shadow-sm"
                      >
                        Complete Path
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          setDraftRotationPath(null);
                        }}
                        className="h-6 px-3 text-[10px] font-extrabold border-border text-muted-foreground hover:bg-secondary/40 rounded-full transition"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Floating Map Zoom Controls */}
                  <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 bg-background/90 backdrop-blur border border-border p-1 rounded-xl shadow-lg select-none">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(5, z + 0.5))}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold bg-secondary/40 border border-border hover:bg-secondary transition active:scale-95 cursor-pointer text-foreground"
                      title="Zoom In"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom((z) => {
                          const nextZ = Math.max(1, z - 0.5);
                          if (nextZ === 1) setPan({ x: 0, y: 0 });
                          return nextZ;
                        });
                      }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold bg-secondary/40 border border-border hover:bg-secondary transition active:scale-95 cursor-pointer text-foreground"
                      title="Zoom Out"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setPan({ x: 0, y: 0 });
                      }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-[9px] font-bold bg-secondary/40 border border-border hover:bg-secondary transition active:scale-95 cursor-pointer text-foreground"
                      title="Reset View"
                    >
                      ↺
                    </button>
                  </div>

                  {/* Floating Map Mode Toggle */}
                  <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 bg-background/90 backdrop-blur border border-border p-1 rounded-xl shadow-lg select-none text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIsPanMode(false)}
                      className={cn(
                        "h-7 px-2.5 rounded-lg flex items-center gap-1 transition cursor-pointer",
                        !isPanMode
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted-foreground hover:bg-secondary/40"
                      )}
                    >
                      <Target className="h-3 w-3" />
                      <span>Plot Mode</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPanMode(true)}
                      className={cn(
                        "h-7 px-2.5 rounded-lg flex items-center gap-1 transition cursor-pointer",
                        isPanMode
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted-foreground hover:bg-secondary/40"
                      )}
                    >
                      <Compass className="h-3 w-3" />
                      <span>Pan Mode</span>
                    </button>
                  </div>

                  {/* Transformed Zoomable Map Container */}
                  <div
                    className="w-full h-full relative"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: "0 0",
                      transition: isDraggingMapRef.current ? "none" : "transform 0.15s ease-out",
                    }}
                  >
                    <img
                      src={mapConfig.path}
                      alt={mapConfig.displayName}
                      className="object-cover w-full h-full opacity-90 select-none pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25 pointer-events-none" />

                    {/* Absolute SVG overlay layer for paths */}
                    <svg
                      viewBox="0 0 1000 1000"
                      className="absolute inset-0 pointer-events-none select-none w-full h-full z-0 animate-fade-in"
                    >
                      <style>{`
                        @keyframes flowDashes {
                          to {
                            stroke-dashoffset: -16;
                          }
                        }
                        @keyframes flowDashesDraft {
                          to {
                            stroke-dashoffset: -16;
                          }
                        }
                      `}</style>

                      {/* Render completed rotation paths */}
                      {events.map((e) => {
                        if (e.type !== "rotation") return null;
                        const pathPoints = e.metadata?.pathPoints as Array<{ x: number; y: number }> | undefined;
                        if (!pathPoints || pathPoints.length < 2) return null;

                        const pathData = pathPoints
                          .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x * 1000} ${p.y * 1000}`)
                          .join(" ");

                        // Dynamic color choice from metadata or fallback to teammate colors
                        const customColor = (e.metadata?.color as string) || getPlayerColor(e.player_name);

                        // Calculate arrowhead direction at the path's endpoint based on the final segment
                        const p1 = pathPoints[pathPoints.length - 2];
                        const p2 = pathPoints[pathPoints.length - 1];
                        const dx = (p2.x - p1.x) * 1000;
                        const dy = (p2.y - p1.y) * 1000;
                        const angle = Math.atan2(dy, dx);
                        
                        // Exact spec: pointerLength 14, pointerWidth 10, strokeWidth 3
                        const arrowLength = 14;
                        const arrowWidth = 10;
                        const x2 = p2.x * 1000;
                        const y2 = p2.y * 1000;
                        
                        const leftX = x2 - arrowLength * Math.cos(angle) + (arrowWidth / 2) * Math.sin(angle);
                        const leftY = y2 - arrowLength * Math.sin(angle) - (arrowWidth / 2) * Math.cos(angle);
                        const rightX = x2 - arrowLength * Math.cos(angle) - (arrowWidth / 2) * Math.sin(angle);
                        const rightY = y2 - arrowLength * Math.sin(angle) + (arrowWidth / 2) * Math.cos(angle);
                        
                        const arrowheadPoints = `${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`;

                        return (
                          <g key={e.id} className="transition-all duration-300">
                            {/* Glow Shadow Stroke (shadowBlur 6, shadowOpacity 0.4) */}
                            <path
                              d={pathData}
                              fill="none"
                              stroke={customColor}
                              strokeWidth={9}
                              opacity={0.4}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Wide solid base path (strokeWidth 5, opacity 0.92) */}
                            <path
                              d={pathData}
                              fill="none"
                              stroke={customColor}
                              strokeWidth={5}
                              opacity={0.92}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Bold short dashes overlay flowing forward A -> B */}
                            <path
                              d={pathData}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                strokeDasharray: "10, 6",
                                animation: "flowDashes 0.8s linear infinite",
                              }}
                            />
                            {/* Arrowhead indicator at B */}
                            <polygon
                              points={arrowheadPoints}
                              fill={customColor}
                              stroke={customColor}
                              strokeWidth={3}
                              strokeLinejoin="round"
                            />
                            {/* Start indicator circle A */}
                            <circle
                              cx={pathPoints[0].x * 1000}
                              cy={pathPoints[0].y * 1000}
                              r={3.5}
                              fill="#ffffff"
                              stroke={customColor}
                              strokeWidth={1.5}
                            />
                            {/* Label overlay near start point */}
                            <text
                              x={pathPoints[0].x * 1000}
                              y={pathPoints[0].y * 1000 - 6}
                              fill="#ffffff"
                              fontSize={10}
                              fontWeight="bold"
                              textAnchor="middle"
                              style={{
                                paintOrder: "stroke",
                                stroke: "#0a0b0d",
                                strokeWidth: 2,
                                strokeLinejoin: "round",
                              }}
                            >
                              {e.player_name ? e.player_name.split(" ")[0] : "Start"}
                            </text>
                          </g>
                        );
                      })}

                      {/* Render active drawing draft path */}
                      {draftRotationPath && draftRotationPath.length > 0 && (() => {
                        const pathData = draftRotationPath
                          .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x * 1000} ${p.y * 1000}`)
                          .join(" ");
                        const first = draftRotationPath[0];
                        const last = draftRotationPath[draftRotationPath.length - 1];
                        return (
                          <g>
                            {/* Glow shadow stroke */}
                            <path
                              d={pathData}
                              fill="none"
                              stroke={selectedRotationColor}
                              strokeWidth={8}
                              opacity={0.25}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Solid base stroke */}
                            <path
                              d={pathData}
                              fill="none"
                              stroke={selectedRotationColor}
                              strokeWidth={5}
                              opacity={0.85}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Bold short marching white dashes */}
                            <path
                              d={pathData}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                strokeDasharray: "10, 6",
                                animation: "flowDashesDraft 0.8s linear infinite",
                              }}
                            />
                            {/* Start indicator dot */}
                            <circle
                              cx={first.x * 1000}
                              cy={first.y * 1000}
                              r={4}
                              fill="#ffffff"
                              stroke={selectedRotationColor}
                              strokeWidth={1.5}
                            />
                            {/* End cursor dot */}
                            {draftRotationPath.length > 1 && (
                              <circle
                                cx={last.x * 1000}
                                cy={last.y * 1000}
                                r={3}
                                fill={selectedRotationColor}
                                stroke="#ffffff"
                                strokeWidth={1}
                                opacity={0.9}
                              />
                            )}
                          </g>
                        );
                      })()}
                    </svg>

                    {/* Render plotted glowing events overlay */}
                    {events.map((e) => {
                      // Rotation paths: render a clickable invisible hit zone for select mode
                      if (e.type === "rotation") {
                        if (activePlotType !== null) return null; // Only interactive in select mode
                        const pathPoints = e.metadata?.pathPoints as Array<{ x: number; y: number }> | undefined;
                        if (!pathPoints || pathPoints.length < 2) return null;
                        const isEventSelected = selectedEventId === e.id;
                        return (
                          <div
                            key={e.id}
                            className="absolute inset-0 z-10"
                            style={{ pointerEvents: "none" }}
                          >
                            <svg viewBox="0 0 1000 1000" className="w-full h-full">
                              {/* Invisible wide hit-area path for click detection */}
                              <path
                                d={pathPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x * 1000} ${p.y * 1000}`).join(" ")}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={20}
                                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                                onClick={(evt) => {
                                  evt.stopPropagation();
                                  setSelectedEventId(isEventSelected ? null : e.id);
                                }}
                              />
                              {/* Selection highlight ring */}
                              {isEventSelected && (
                                <path
                                  d={pathPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x * 1000} ${p.y * 1000}`).join(" ")}
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth={10}
                                  opacity={0.35}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeDasharray="6, 4"
                                  style={{ pointerEvents: "none" }}
                                />
                              )}
                            </svg>
                          </div>
                        );
                      }

                      // Match visual styling depending on telemetry category
                      let colorClass = "bg-[hsl(160,70%,45%)] border-white"; // default knock
                      let icon = null;

                      if (e.type === "knock") {
                        colorClass = "bg-[hsl(35,100%,50%)] border-white ring-1 ring-orange-500/20 animate-pulse";
                        icon = <Target className="h-1 w-1 text-white" />;
                      } else if (e.type === "death") {
                        colorClass = "bg-destructive border-white ring-1 ring-destructive/20";
                        icon = <span className="text-[4px] font-black text-white leading-none">☠️</span>;
                      } else if (e.type === "fight") {
                        colorClass = "bg-[hsl(280,65%,55%)] border-white ring-1 ring-purple-500/20";
                        icon = <Shield className="h-1 w-1 text-white" />;
                      } else if (e.type === "revive") {
                        colorClass = "bg-[hsl(160,70%,45%)] border-white ring-1 ring-emerald-500/20";
                        icon = <span className="text-[4px] font-bold text-white leading-none">+</span>;
                      } else if (e.type === "utility") {
                        colorClass = "bg-[hsl(280,75%,45%)] border-white ring-1 ring-violet-500/20";
                        icon = <span className="text-[4px] leading-none">💣</span>;
                      } else if (e.type === "vehicle") {
                        colorClass = "bg-[hsl(200,90%,50%)] border-white ring-1 ring-blue-500/20";
                        icon = <span className="text-[4px] leading-none">🚗</span>;
                      }

                      // Overlay transaction status modifications
                      const isPending = e.status === "pending";
                      const isError = e.status === "error";
                      const isEventSelected = selectedEventId === e.id;

                      return (
                        <div
                          key={e.id}
                          className={cn(
                            "absolute h-2.5 w-2.5 rounded-full border border-[0.5px] shadow-sm transition-all duration-300 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10",
                            colorClass,
                            isPending && "animate-ping opacity-60 scale-125 border-dashed",
                            isError && "border-2 border-destructive bg-transparent scale-110 shadow-lg ring-2 ring-destructive/40",
                            isEventSelected && "ring-2 ring-white scale-150 shadow-lg z-20",
                            activePlotType === null && "cursor-pointer hover:scale-[1.8]"
                          )}
                          style={{ left: `${e.x * 100}%`, top: `${e.y * 100}%` }}
                          title={`${e.player_name || "Unknown"} (${e.type})${activePlotType === null ? " — click to select" : ""}`}
                          onClick={(evt) => {
                            if (activePlotType !== null) return; // Only interactive in select mode
                            evt.stopPropagation();
                            setSelectedEventId(isEventSelected ? null : e.id);
                          }}
                        >
                          {!isError && icon}
                          {isError && (
                            <span className="h-0.5 w-0.5 bg-destructive rounded-full absolute" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
