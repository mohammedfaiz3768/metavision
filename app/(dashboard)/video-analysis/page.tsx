"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Video, Trash2, Calendar, Clock, User as UserIcon, Search, Play } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface VideoItem {
  id: string;
  title: string;
  video_url: string;
  duration_seconds: number;
  created_at: string;
  team_id: string | null;
  uploaded_by: string;
  profiles?: {
    username: string;
    in_game_name: string | null;
  } | null;
}

export default function VideoAnalysisDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient() as any;

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  // Role check
  const [isStaff, setIsStaff] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;

    async function loadDashboardData() {
      try {
        setLoading(true);

        // Fetch team members role
        const { data: memberData } = await supabase
          .from("team_members")
          .select("team_id, role")
          .eq("user_id", currentUserId)
          .maybeSingle() as any;

        if (memberData) {
          setTeamId(memberData.team_id);
          // Only Coaches, Analysts, and IGLs are allowed to upload
          if (["coach", "analyst", "IGL"].includes(memberData.role)) {
            setIsStaff(true);
          }
        } else {
          // Solo players can upload to their personal workspace
          setIsStaff(true);
        }

        // Fetch videos
        const res = await fetch("/api/videos");
        if (!res.ok) throw new Error("Failed to load match videos");
        const data = await res.json();
        setVideos(data);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user, supabase]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading video library...</span>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 2500 * 1024 * 1024) {
        toast.error("File size exceeds 2.5GB maximum limit");
        return;
      }
      setSelectedFile(file);
      if (!videoTitle) {
        // Pre-fill title with filename without extension
        setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !videoTitle.trim()) {
      toast.error("Please provide a title and select a video file");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload file to storage
      const fileExt = selectedFile.name.split(".").pop() || "mp4";
      const filePath = `${user?.id}/${Date.now()}.${fileExt}`;

      setUploadProgress(20);

      // Perform upload with progress feedback (simulated progress updates)
      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 5 : prev));
      }, 500);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("match-videos")
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      clearInterval(interval);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setUploadProgress(90);

      // 2. Get Public Url
      const { data: { publicUrl } } = supabase.storage
        .from("match-videos")
        .getPublicUrl(filePath);

      // 3. Get Video duration (using HTML5 video element)
      let duration = 0;
      try {
        duration = await new Promise<number>((resolve) => {
          const videoElement = document.createElement("video");
          videoElement.preload = "metadata";
          videoElement.src = URL.createObjectURL(selectedFile);
          videoElement.onloadedmetadata = () => {
            resolve(videoElement.duration);
          };
          videoElement.onerror = () => {
            resolve(0);
          };
        });
      } catch (dErr) {
        console.error("Failed to parse video metadata duration:", dErr);
      }

      // 4. Register in database
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: videoTitle,
          video_url: publicUrl,
          duration_seconds: duration,
          team_id: teamId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to register video in database");
      }

      const newVideo = await res.json();
      setVideos([newVideo, ...videos]);

      toast.success("Match video uploaded successfully!");
      setUploadOpen(false);
      setVideoTitle("");
      setSelectedFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload video");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const filteredVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tactical Video Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Review gameplay recordings, draw annotations on paused frames, and build timestamp timelines.
          </p>
        </div>

        {isStaff && (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger render={
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Match Video
              </Button>
            } />
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle>Upload Match Recording</DialogTitle>
                <DialogDescription>
                  Supported formats: MP4, WebM (Max 2.5GB). Duration is auto-detected.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Match Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Scrim Round 3 - Bermuda"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    required
                    disabled={uploading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="video-file">Select Recording</Label>
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={handleFileChange}
                    required
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      Size: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  )}
                </div>

                {uploading && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs">
                      <span>Uploading match file...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadOpen(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading || !selectedFile}>
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Start Upload"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter match videos by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      {/* Videos List Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => {
            const uploaderName = video.profiles?.in_game_name || video.profiles?.username || "Unknown Staff";
            const timeAgo = formatDistanceToNow(new Date(video.created_at), { addSuffix: true });

            return (
              <Card key={video.id} className="border-border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
                <CardHeader className="p-0 relative group cursor-pointer" onClick={() => router.push(`/video-analysis/${video.id}`)}>
                  {/* Decorative Video Cover Container */}
                  <div className="aspect-video w-full bg-[#121419] flex items-center justify-center relative">
                    <Video className="h-12 w-12 text-muted-foreground/30 group-hover:scale-110 transition-transform" />
                    
                    {/* Hover play overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                        <Play className="h-6 w-6 ml-0.5 fill-current" />
                      </div>
                    </div>

                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold font-mono text-white tracking-wide">
                      {formatDuration(video.duration_seconds)}
                    </div>
                    {video.team_id ? (
                      <Badge className="absolute top-2 left-2 bg-[#6366F1] text-white hover:bg-[#6366F1]">
                        Team Match
                      </Badge>
                    ) : (
                      <Badge className="absolute top-2 left-2 bg-emerald-600 text-white hover:bg-emerald-600">
                        Personal
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 flex-1">
                  <h3
                    className="font-bold text-base hover:text-primary transition-colors cursor-pointer line-clamp-1"
                    onClick={() => router.push(`/video-analysis/${video.id}`)}
                  >
                    {video.title}
                  </h3>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5" />
                      <span>Uploaded by: <span className="text-foreground">{uploaderName}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{timeAgo}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t border-border/50 flex justify-between items-center bg-secondary/10">
                  <span className="text-[10px] font-mono text-muted-foreground">ID: {video.id.slice(0, 8)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary-foreground hover:bg-primary gap-1"
                    onClick={() => router.push(`/video-analysis/${video.id}`)}
                  >
                    Analyze Match
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-lg border border-dashed border-border space-y-3">
          <Video className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <h3 className="font-bold text-lg">No Match Recordings Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery ? "No recordings match your filter title." : "Upload gameplay recordings of team tournaments or custom scrims to annotate and review."}
          </p>
        </div>
      )}

    </div>
  );
}
