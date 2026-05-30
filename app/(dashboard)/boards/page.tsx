"use client";

import { useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Map,
  Plus,
  Trash2,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { canDeleteBoard } from "@/lib/types/app.types";
import type { StrategyBoard } from "@/lib/types/app.types";

export default function BoardsPage() {
  const { currentTeam, currentMembership } = useTeam();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [boardToDelete, setBoardToDelete] = useState<StrategyBoard | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch strategy boards for active team
  const { data: boards, isLoading } = useQuery<StrategyBoard[]>({
    queryKey: ["team-boards", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return [];
      const { data, error } = await supabase
        .from("strategy_boards")
        .select("*")
        .eq("team_id", currentTeam.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as StrategyBoard[];
    },
    enabled: !!currentTeam,
  });

  // Soft delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (boardId: string) => {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete board");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-boards", currentTeam?.id] });
      toast.success("Strategy board deleted successfully");
      setDeleteConfirmOpen(false);
      setBoardToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete strategy board");
    },
    onSettled: () => {
      setDeleting(false);
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, board: StrategyBoard) => {
    e.stopPropagation();
    setBoardToDelete(board);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!boardToDelete) return;
    setDeleting(true);
    deleteMutation.mutate(boardToDelete.id);
  };

  const isAllowedToDelete = currentMembership
    ? canDeleteBoard(currentMembership.role)
    : false;

  if (!currentTeam) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-white">
        <div className="w-12 h-12 rounded-full bg-[#1E1F28] flex items-center justify-center mb-4 border border-[#2A2B35]">
          <Map className="w-5 h-5 text-[#6B7280]" />
        </div>
        <p className="text-[15px] font-semibold text-white mb-1">No active roster</p>
        <p className="text-[13px] text-[#9CA3AF] mb-4">Please join or create a team from your dashboard to view strategy boards.</p>
        <Link href="/dashboard">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-[#111827]">
      {/* Page Title & Header info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Strategy Boards</h1>
          <p className="text-[13px] text-[#4B5563] mt-1">Review and plan drop zones, rotations, and utility locations on Free Fire competitive maps.</p>
        </div>
        <Link href="/boards/new">
          <Button className="bg-primary hover:bg-primary/90 text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            Create Board
          </Button>
        </Link>
      </div>

      {/* Main Boards View */}
      {isLoading ? (
        <div className="h-[250px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-[#4B5563] animate-pulse font-mono">Loading blueprints...</p>
        </div>
      ) : !boards || boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#E5E7EB] rounded-[12px] bg-white shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#E5E7EB]">
            <Map className="w-5 h-5 text-[#4B5563]" />
          </div>
          <p className="text-[15px] font-semibold text-[#111827] mb-1">No strategy boards found</p>
          <p className="text-[13px] text-[#4B5563] mb-4 max-w-sm">Boards store tactical paths, circles, and player setups. Create your first board to start coaching.</p>
          <Link href="/boards/new">
            <Button className="bg-primary hover:bg-primary/90 text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer">
              <Plus className="h-4 w-4" />
              Build first board
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {boards.map((board) => (
            <div
              key={board.id}
              className="relative overflow-hidden rounded-[12px] bg-white border border-[#E5E7EB] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col justify-between group"
              onClick={() => router.push(`/boards/${board.id}`)}
            >
              {/* Map Preview Image Card */}
              <div className="relative aspect-video w-full border-b border-[#E5E7EB] bg-slate-50 overflow-hidden flex items-center justify-center">
                <img
                  src={`/maps/${board.map}.jpg`}
                  alt={board.map}
                  className="object-cover w-full h-full opacity-80 group-hover:scale-[1.03] transition-transform duration-300"
                />
                
                {/* Map Tag badge */}
                <span className="absolute bottom-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {board.map}
                </span>

                {/* Public status share badge */}
                {board.is_public && (
                  <span className="absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 select-none border border-emerald-200">
                    <Share2 className="h-2.5 w-2.5" />
                    Public
                  </span>
                )}

                {/* Delete button (displays on hover) */}
                {isAllowedToDelete && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2.5 right-2.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-600 hover:bg-rose-700 text-white rounded-md p-0 flex items-center justify-center cursor-pointer"
                    onClick={(e) => handleDeleteClick(e, board)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Board Details */}
              <CardHeader className="p-4 space-y-1">
                <CardTitle className="text-[15px] font-bold text-[#111827] mb-1 group-hover:text-primary transition-colors line-clamp-1">
                  {board.title}
                </CardTitle>
                <CardDescription className="text-[11px] text-[#4B5563] flex items-center gap-1.5 pt-0.5">
                  <Clock className="h-3.5 w-3.5 text-[#9CA3AF]" />
                  Edited {new Date(board.updated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              
              <CardFooter className="px-4 pb-4 pt-0 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">
                  Map V1.0 Schema
                </span>
                <span className="text-primary font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all text-[11px] uppercase tracking-wide">
                  Open Board
                  <ChevronRight className="h-3.5 w-3.5 text-primary" />
                </span>
              </CardFooter>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="border-[#2A2B35] max-w-md bg-[#13141A] text-white">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-rose-500 text-sm font-semibold">
              <AlertCircle className="h-5 w-5" />
              <span>Deconstruction Alert</span>
            </div>
            <DialogTitle className="text-lg font-bold text-white">
              Delete Strategy Board?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9CA3AF]">
              This action soft-deletes the board titled &quot;
              <strong className="text-white">{boardToDelete?.title}</strong>
              &quot;. Roster members will no longer be able to access these drawings. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              disabled={deleting}
              className="border border-[#2A2B35] text-slate-300 hover:bg-[#1E1F28] hover:text-white"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
              onClick={handleConfirmDelete}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
