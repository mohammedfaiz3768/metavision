"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trophy, Eye, EyeOff, Trash2, ArrowRight, Settings2, Upload } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";

interface AnalysisTournament {
  id: string;
  name: string;
  is_published: boolean;
  thumbnail_url?: string | null;
  created_at: string;
}

export default function AnalysisBoardsPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  // Drag & Drop State
  const [dragActive, setDragActive] = useState(false);

  // Edit State
  const [editingTournament, setEditingTournament] = useState<AnalysisTournament | null>(null);
  const [editName, setEditName] = useState("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("");

  // Fetch analysis tournaments
  const { data: tournaments, isLoading } = useQuery<AnalysisTournament[]>({
    queryKey: ["analysis-tournaments"],
    queryFn: async () => {
      const res = await fetch("/api/owner/analysis");
      if (!res.ok) throw new Error("Failed to fetch tournaments list");
      return res.json();
    },
  });

  // Create Tournament Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; thumbnail_url?: string | null }) => {
      const res = await fetch("/api/owner/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-tournaments"] });
      toast.success("Analysis board tournament created successfully!");
      setIsCreateModalOpen(false);
      setName("");
      setThumbnailUrl("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not create tournament");
    },
  });

  // Edit Tournament Mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, name, thumbnail_url }: { id: string; name: string; thumbnail_url: string }) => {
      const res = await fetch(`/api/owner/analysis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, thumbnail_url: thumbnail_url.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to update campaign details");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-tournaments"] });
      toast.success("Campaign details updated successfully!");
      setEditingTournament(null);
      setEditName("");
      setEditThumbnailUrl("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update campaign details");
    },
  });

  // Toggle Publish Mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const res = await fetch(`/api/owner/analysis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-tournaments"] });
      toast.success("Tournament visibility updated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to toggle visibility");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/owner/analysis/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-tournaments"] });
      toast.success("Tournament strategy campaign deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, thumbnail_url: thumbnailUrl.trim() || null });
  };

  const handleTogglePublish = (id: string, currentStatus: boolean) => {
    togglePublishMutation.mutate({ id, is_published: !currentStatus });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this strategic campaign? This will remove all associated logo slots, stages, matches, and whiteboards forever.")) {
      deleteMutation.mutate(id);
    }
  };

  // Drag-and-drop helpers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, isEdit: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File size exceeds 3MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditThumbnailUrl(reader.result as string);
      } else {
        setThumbnailUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File size exceeds 3MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditThumbnailUrl(reader.result as string);
      } else {
        setThumbnailUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <span className="text-sm text-slate-650 animate-pulse font-semibold">Preloading strategy registries...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <PageHeader
          title="Interactive Strategy Campaigns"
          description="Create interactive whiteboard strategy map databases for official pro-tournaments."
        />
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold px-4 py-2 rounded-[8px] transition-all duration-150 shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Grid List */}
      {!tournaments || tournaments.length === 0 ? (
        <Card className="border border-[#E5E7EB] bg-white p-6 rounded-[16px] relative overflow-hidden text-center shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#6366F1] to-transparent" />
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Trophy className="h-10 w-10 text-[#6366F1] mb-4" />
            <h3 className="font-bold text-sm text-slate-900">No Campaigns Registered</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Register a professional tournament strategy folder to upload team logos and draw tactical matches.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-sm flex items-center gap-1.5 cursor-pointer mx-auto mt-4"
            >
              Register First Folder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <Card key={t.id} className="relative overflow-hidden border border-slate-200 bg-white transition-all duration-300 group rounded-[12px] shadow-sm hover:shadow-md flex flex-col justify-between text-slate-800 hover:border-[#6366F1]/50">
              
              {/* Thumbnail Container (shows full logo inside a beautiful aspect-ratio boundary) */}
              <div className="w-full h-40 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
                {t.thumbnail_url ? (
                  <img
                    src={t.thumbnail_url}
                    alt={t.name}
                    className="object-contain max-h-full max-w-full group-hover:scale-[1.03] transition-transform duration-500 filter drop-shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Trophy className="h-8 w-8 text-[#6366F1] opacity-70" />
                    <span className="text-[9px] font-semibold text-[#6366F1]/70 tracking-wider uppercase font-mono">No Thumbnail</span>
                  </div>
                )}
              </div>

              {/* Details & Actions below the thumbnail */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Interactive Folder</span>
                    <Badge
                      className={
                        t.is_published
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-bold hover:bg-emerald-100/70 shadow-none"
                          : "bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-mono font-bold hover:bg-amber-100/70 shadow-none"
                      }
                    >
                      {t.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>

                  <CardTitle className="text-sm font-bold text-slate-800 mt-2.5 line-clamp-2 group-hover:text-[#6366F1] transition-colors leading-tight">
                    {t.name}
                  </CardTitle>

                  <div className="text-xs mt-3 space-y-0.5">
                    <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Created Date</span>
                    <p className="font-semibold font-mono text-slate-500 text-[10px]">
                      {format(new Date(t.created_at), "MMMM dd, yyyy")}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="border-t border-slate-100 my-2.5" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon-xs"
                        variant="outline"
                        className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 hover:text-slate-900 rounded-[8px] cursor-pointer shadow-none h-7 w-7 flex items-center justify-center transition-colors"
                        title={t.is_published ? "Make Draft (Hide from Observers)" : "Publish (Show to Observers)"}
                        onClick={() => handleTogglePublish(t.id, t.is_published)}
                      >
                        {t.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="outline"
                        className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 hover:text-slate-900 rounded-[8px] cursor-pointer shadow-none h-7 w-7 flex items-center justify-center transition-colors"
                        title="Edit Campaign Details"
                        onClick={() => {
                          setEditingTournament(t);
                          setEditName(t.name);
                          setEditThumbnailUrl(t.thumbnail_url || "");
                        }}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="destructive"
                        className="h-7 w-7 bg-red-50 text-red-650 border border-red-200 hover:bg-red-100 rounded-[8px] transition-colors cursor-pointer flex items-center justify-center"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Link href={`/owner/analysis-boards/${t.id}`}>
                      <span className="inline-flex items-center gap-1.2 text-xs font-semibold text-[#6366F1] hover:text-white bg-indigo-50 hover:bg-[#6366F1] py-1.5 px-3 rounded-[8px] transition-all cursor-pointer border border-indigo-100 font-mono shadow-sm">
                        Edit Campaign
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* DIALOG: CREATE TOURNAMENT */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-white border border-[#E5E7EB] sm:max-w-md rounded-[12px] p-6 text-slate-800 shadow-lg">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader className="pb-3 border-b border-[#E5E7EB]">
              <DialogTitle className="text-slate-900 font-bold text-lg">Create Analysis Campaign</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Setup a new tournament folder which groups stages, matches strategy boards, and 12-slots logo panels.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Tournament Folder Name</Label>
                <Input
                  placeholder="e.g. Esports Premier League Season 8"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white border-[#E5E7EB] text-slate-900 text-xs h-9 rounded-[8px] focus-visible:ring-[#6366F1] placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Thumbnail Image (Drag & Drop, Max 3MB)</Label>
                <div
                  onDragEnter={(e) => handleDrag(e)}
                  onDragOver={(e) => handleDrag(e)}
                  onDragLeave={(e) => handleDrag(e)}
                  onDrop={(e) => handleDrop(e, false)}
                  className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[12px] p-6 text-center transition-all ${
                    dragActive
                      ? "border-[#6366F1] bg-[#6366F1]/5 scale-[1.01]"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                  } cursor-pointer select-none`}
                  onClick={() => document.getElementById("create-banner-upload")?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    id="create-banner-upload"
                    className="hidden"
                    onChange={(e) => handleFileInputChange(e, false)}
                  />
                  {thumbnailUrl ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 group">
                      <img
                        src={thumbnailUrl}
                        alt="Preview"
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-6 w-6 text-white animate-bounce-short" />
                        <span className="text-[10px] text-white font-mono font-bold uppercase ml-1.5">Change Banner</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-[#6366F1]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Drag your banner image here</p>
                        <p className="text-[10px] text-slate-450 mt-0.5">PNG, JPG, or JPEG up to 3MB (or click to browse)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-[#E5E7EB] rounded-[8px] text-xs h-9 px-4 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createMutation.isPending}
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold px-4 py-2 rounded-[8px] transition-all duration-150 shadow-sm flex items-center gap-1.5 cursor-pointer h-9"
              >
                {createMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Create Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT TOURNAMENT */}
      <Dialog open={editingTournament !== null} onOpenChange={(open) => !open && setEditingTournament(null)}>
        <DialogContent className="bg-white border border-[#E5E7EB] sm:max-w-md rounded-[12px] p-6 text-slate-800 shadow-lg">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!editingTournament || !editName.trim()) return;
            editMutation.mutate({
              id: editingTournament.id,
              name: editName,
              thumbnail_url: editThumbnailUrl,
            });
          }}>
            <DialogHeader className="pb-3 border-b border-[#E5E7EB]">
              <DialogTitle className="text-slate-900 font-bold text-lg">Edit Campaign Details</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Update the tournament folder name and custom thumbnail image.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Tournament Folder Name</Label>
                <Input
                  placeholder="e.g. Esports Premier League Season 8"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="bg-white border-[#E5E7EB] text-slate-900 text-xs h-9 rounded-[8px] focus-visible:ring-[#6366F1] placeholder-slate-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Thumbnail Image (Drag & Drop, Max 3MB)</Label>
                <div
                  onDragEnter={(e) => handleDrag(e)}
                  onDragOver={(e) => handleDrag(e)}
                  onDragLeave={(e) => handleDrag(e)}
                  onDrop={(e) => handleDrop(e, true)}
                  className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[12px] p-6 text-center transition-all ${
                    dragActive
                      ? "border-[#6366F1] bg-[#6366F1]/5 scale-[1.01]"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                  } cursor-pointer select-none`}
                  onClick={() => document.getElementById("edit-banner-upload")?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    id="edit-banner-upload"
                    className="hidden"
                    onChange={(e) => handleFileInputChange(e, true)}
                  />
                  {editThumbnailUrl ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 group">
                      <img
                        src={editThumbnailUrl}
                        alt="Preview"
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-6 w-6 text-white animate-bounce-short" />
                        <span className="text-[10px] text-white font-mono font-bold uppercase ml-1.5">Change Banner</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-[#6366F1]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Drag your banner image here</p>
                        <p className="text-[10px] text-slate-450 mt-0.5">PNG, JPG, or JPEG up to 3MB (or click to browse)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingTournament(null)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-[#E5E7EB] rounded-[8px] text-xs h-9 px-4 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!editName.trim() || editMutation.isPending}
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold px-4 py-2 rounded-[8px] transition-all duration-150 shadow-sm flex items-center gap-1.5 cursor-pointer h-9"
              >
                {editMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
