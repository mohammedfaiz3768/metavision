"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Clock,
  User as UserIcon,
  MousePointer,
  ArrowRight,
  Circle as CircleIcon,
  Square,
  PenTool,
  Type,
  X,
  Save,
  ChevronRight,
} from "lucide-react";
import type { Shape } from "./DrawingCanvas";

// Dynamically import DrawingCanvas with SSR disabled as it relies on Canvas API
const DrawingCanvas = dynamic(() => import("./DrawingCanvas"), { ssr: false });

interface VideoDetails {
  id: string;
  title: string;
  video_url: string;
  duration_seconds: number;
  created_at: string;
  team_id: string | null;
  uploaded_by: string;
}

interface Annotation {
  id: string;
  video_id: string;
  created_by: string;
  timestamp_seconds: number;
  canvas_data: any;
  note: string | null;
  created_at: string;
  profiles?: {
    username: string;
    in_game_name: string | null;
  } | null;
}

export default function MatchAnalysisPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Video playback states
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Resize canvas state
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 640, height: 360 });

  // Annotation/Drawing states
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [drawTool, setDrawTool] = useState<"select" | "arrow" | "circle" | "rect" | "free" | "text">("free");
  const [drawColor, setDrawColor] = useState("#EF4444"); // Default red
  const [activeShapes, setActiveShapes] = useState<Shape[]>([]);
  const [annotationNote, setAnnotationNote] = useState("");
  const [savingAnnotation, setSavingAnnotation] = useState(false);

  // User permissions
  const [canModify, setCanModify] = useState(false);

  // Load details, annotations and permission check
  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;

    async function loadVideoData() {
      try {
        setLoading(true);

        // Fetch video details
        const vRes = await fetch(`/api/videos/${videoId}`);
        if (!vRes.ok) throw new Error("Match recording not found");
        const videoData: VideoDetails = await vRes.json();
        setVideo(videoData);

        // Fetch annotations
        const aRes = await fetch(`/api/videos/${videoId}/annotations`);
        if (aRes.ok) {
          const annotationsData = await aRes.json();
          setAnnotations(annotationsData);
        }

        // Permission check: if team_id is null, uploader can edit. Otherwise, check role in team
        if (!videoData.team_id) {
          if (videoData.uploaded_by === currentUserId) {
            setCanModify(true);
          }
        } else {
          const { data: memberRole } = await supabase
            .from("team_members")
            .select("role")
            .eq("team_id", videoData.team_id)
            .eq("user_id", currentUserId)
            .maybeSingle() as any;

          if (memberRole && ["coach", "analyst", "IGL"].includes(memberRole.role)) {
            setCanModify(true);
          }
        }

      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load match recordings");
      } finally {
        setLoading(false);
      }
    }

    loadVideoData();
  }, [videoId, user, supabase]);

  // Adjust canvas dimensions when video dimensions change
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateDimensions = () => {
      const rect = videoElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasDimensions({ width: rect.width, height: rect.height });
      }
    };

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    observer.observe(videoElement);
    videoElement.addEventListener("loadedmetadata", updateDimensions);

    return () => {
      observer.disconnect();
      videoElement.removeEventListener("loadedmetadata", updateDimensions);
    };
  }, [video]);

  // Sync isPlaying with video ref
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      setIsPlaying(true);
      setIsAnnotating(false); // Disable canvas overlay while playing
      videoRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);

    // Auto-pause and show annotation if we run across a saved marker while playing (optional helper)
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    
    // Clear active temporary drawings when seeking
    setActiveShapes([]);
    setIsAnnotating(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleSpeedChange = (speed: string | null) => {
    if (!speed) return;
    const val = parseFloat(speed);
    setPlaybackSpeed(val);
    if (videoRef.current) {
      videoRef.current.playbackRate = val;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        toast.error("Error entering fullscreen mode");
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const seekTo = (seconds: number, shapes?: Shape[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    setIsPlaying(false);
    videoRef.current.pause();

    if (shapes) {
      setActiveShapes(shapes);
      setIsAnnotating(true);
    } else {
      // Look up if an annotation matches this second
      const match = annotations.find(a => Math.abs(a.timestamp_seconds - seconds) < 0.2);
      if (match) {
        setActiveShapes(match.canvas_data || []);
        setIsAnnotating(true);
      }
    }
  };

  const handleSaveAnnotation = async () => {
    if (activeShapes.length === 0) {
      toast.error("Please draw something before saving annotations");
      return;
    }

    setSavingAnnotation(true);

    try {
      const response = await fetch(`/api/videos/${videoId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp_seconds: currentTime,
          canvas_data: activeShapes,
          note: annotationNote,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save annotation");
      }

      const newAnnotation = await response.json();
      
      // Update annotations list
      setAnnotations(prev => {
        const updated = [...prev, newAnnotation];
        return updated.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
      });

      toast.success("Tactical annotation saved to timeline!");
      setAnnotationNote("");
      setIsAnnotating(false);
      setActiveShapes([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save annotation");
    } finally {
      setSavingAnnotation(false);
    }
  };

  const handleDeleteAnnotation = async (e: React.MouseEvent, annotationId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this tactical annotation?")) return;

    try {
      const res = await fetch(`/api/videos/${videoId}/annotations/${annotationId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete annotation");

      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      toast.success("Annotation removed");
      setIsAnnotating(false);
      setActiveShapes([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete annotation");
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading video analyzer...</span>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <h2 className="text-xl font-bold text-destructive">Video Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested match video could not be found.</p>
        <Button onClick={() => router.push("/video-analysis")} variant="outline">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header and Back Link */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => router.push("/video-analysis")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{video.title}</h1>
          <p className="text-sm text-muted-foreground">Esports Tactical Board — Video Analysis Mode</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left column: Video Player + Canvas Annotation Controls */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Custom Video Wrapper (Fullscreen Anchor) */}
          <div
            ref={containerRef}
            className="relative bg-[#121419] rounded-xl overflow-hidden shadow-2xl border border-border/80 flex items-center justify-center group"
          >
            {/* HTML5 Video element */}
            <video
              ref={videoRef}
              src={video.video_url}
              className="w-full h-auto aspect-video object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
            />

            {/* Absolute Overlay: Drawing Canvas */}
            {isAnnotating && !isPlaying && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto">
                <DrawingCanvas
                  width={canvasDimensions.width}
                  height={canvasDimensions.height}
                  tool={drawTool}
                  color={drawColor}
                  shapes={activeShapes}
                  onChange={setActiveShapes}
                />
              </div>
            )}

            {/* Custom Control Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col gap-3">
              
              {/* Scrub timeline / Seek Slider with annotation marker dots */}
              <div className="relative w-full flex items-center h-4 group/seek">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                />
                
                {/* Annotation marker dots fanned out */}
                {duration > 0 && annotations.map((ann) => {
                  const percent = (ann.timestamp_seconds / duration) * 100;
                  return (
                    <button
                      key={ann.id}
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white bg-primary hover:scale-125 transition-transform cursor-pointer"
                      style={{ left: `calc(${percent}% - 7px)` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        seekTo(ann.timestamp_seconds, ann.canvas_data);
                      }}
                      title={`Annotation at ${formatDuration(ann.timestamp_seconds)}`}
                    />
                  );
                })}
              </div>

              {/* Lower Controls */}
              <div className="flex items-center justify-between text-white text-sm">
                
                <div className="flex items-center gap-4">
                  {/* Play / Pause */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:bg-white/10 hover:text-white rounded-full"
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                  </Button>

                  {/* Time Indicator */}
                  <span className="font-mono text-xs text-white/80">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-white/10 hover:text-white rounded-full"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Playback speed */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60 font-mono">Speed:</span>
                    <Select
                      value={playbackSpeed.toString()}
                      onValueChange={handleSpeedChange}
                    >
                      <SelectTrigger className="h-7 w-20 bg-white/10 border-white/20 text-white text-xs font-mono">
                        <SelectValue placeholder="1x" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121419] border-border text-white text-xs font-mono">
                        <SelectItem value="0.25">0.25x</SelectItem>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1.0x</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2.0x</SelectItem>
                        <SelectItem value="3">3.0x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fullscreen */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:bg-white/10 hover:text-white rounded-full"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="h-5 w-5" />
                  </Button>
                </div>

              </div>

            </div>

          </div>

          {/* Drawing Canvas Toolbar (Only display when paused and user is allowed) */}
          {canModify && (
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4 space-y-4">
                
                {/* Mode Selectors */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isAnnotating ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsPlaying(false);
                        videoRef.current?.pause();
                        setIsAnnotating(!isAnnotating);
                      }}
                      className="gap-1.5"
                    >
                      {isAnnotating ? <X className="h-4 w-4" /> : <PenTool className="h-4 w-4" />}
                      {isAnnotating ? "Close Drawing Board" : "Open Drawing Board"}
                    </Button>

                    {isAnnotating && (
                      <div className="flex items-center gap-1 rounded-md border border-border p-1 bg-secondary/20">
                        <Button
                          variant={drawTool === "free" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDrawTool("free")}
                          title="Free Draw"
                        >
                          <PenTool className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawTool === "arrow" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDrawTool("arrow")}
                          title="Draw Arrow"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawTool === "circle" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDrawTool("circle")}
                          title="Draw Circle"
                        >
                          <CircleIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawTool === "rect" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDrawTool("rect")}
                          title="Draw Rectangle"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawTool === "text" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDrawTool("text")}
                          title="Place Text"
                        >
                          <Type className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Color Picker Swatches */}
                  {isAnnotating && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">Color:</span>
                      {[
                        "#EF4444", // red
                        "#EAB308", // yellow
                        "#10B981", // green
                        "#3B82F6", // blue
                        "#FFFFFF", // white
                        "#000000", // black
                      ].map((c) => (
                        <button
                          key={c}
                          className="h-6 w-6 rounded-full border border-border transition-transform hover:scale-110 cursor-pointer"
                          style={{
                            backgroundColor: c,
                            boxShadow: drawColor === c ? "0 0 0 2px rgb(99 102 241)" : "none",
                          }}
                          onClick={() => setDrawColor(c)}
                        />
                      ))}
                    </div>
                  )}

                  {isAnnotating && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveShapes([])}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Clear Board
                    </Button>
                  )}
                </div>

                {/* Save Annotation Form Overlay */}
                {isAnnotating && activeShapes.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-end gap-3 pt-3 border-t border-border/80">
                    <div className="flex-1 space-y-1.5 w-full">
                      <Label htmlFor="note" className="text-xs font-bold font-mono uppercase text-muted-foreground">
                        Annotation Commentary / Coach Note
                      </Label>
                      <Input
                        id="note"
                        placeholder="e.g. Check flank angle, rotate left from river..."
                        value={annotationNote}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnotationNote(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <Button
                      onClick={handleSaveAnnotation}
                      disabled={savingAnnotation}
                      className="gap-2 w-full sm:w-auto shrink-0"
                    >
                      {savingAnnotation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save to Timeline
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>
          )}

        </div>

        {/* Right column: Sidebar annotation listings */}
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-sm h-[500px] flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base">Tactical Annotations</CardTitle>
              <CardDescription className="text-xs">
                Timestamped overlays saved on this match recording
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-border">
              {annotations.length > 0 ? (
                annotations.map((ann) => {
                  const creator = ann.profiles?.in_game_name || ann.profiles?.username || "Staff";
                  const isActive = Math.abs(currentTime - ann.timestamp_seconds) < 0.3;

                  return (
                    <div
                      key={ann.id}
                      className={`p-3 space-y-2 hover:bg-secondary/40 transition-colors cursor-pointer text-sm ${
                        isActive ? "bg-primary/5 border-l-2 border-primary" : ""
                      }`}
                      onClick={() => seekTo(ann.timestamp_seconds, ann.canvas_data)}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(ann.timestamp_seconds)}
                        </Badge>
                        
                        {canModify && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                            onClick={(e) => handleDeleteAnnotation(e, ann.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {ann.note && (
                        <p className="text-xs leading-relaxed text-foreground font-medium">
                          {ann.note}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <UserIcon className="h-3 w-3" />
                        <span>Annotated by: <span className="text-foreground">{creator}</span></span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-muted-foreground space-y-2">
                  <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 animate-pulse" />
                  <p className="text-xs">No annotations saved yet.</p>
                  {canModify && (
                    <p className="text-[10px] max-w-[180px] mx-auto">
                      Pause the recording and open the Drawing Board to add the first marker!
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}
