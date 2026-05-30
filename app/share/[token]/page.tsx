"use client";

import { use, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { WhiteboardCanvas } from "@/components/whiteboard/WhiteboardCanvas";
import { LayerPanel } from "@/components/whiteboard/LayerPanel";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  Compass,
  Loader2,
  AlertTriangle,
  Eye,
  Crosshair,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { StrategyBoard } from "@/lib/types/app.types";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function PublicSharePage({ params }: PageProps) {
  const { token } = use(params);
  const supabase = createClient();
  const stageRef = useRef<any>(null);

  const { loadDocument } = useCanvasStore();

  // ---- 1. Fetch Board by Public Token and Reconstruct Nodes ----
  const { data: board, isLoading, error } = useQuery<StrategyBoard>({
    queryKey: ["public-board", token],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("strategy_boards") as any)
        .select("*")
        .eq("public_token", token)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        throw new Error("This strategy blueprint does not exist, has been revoked, or is private.");
      }

      // Query persistent shape nodes dynamically
      const { data: dbNodes, error: nodesError } = await (supabase
        .from("board_nodes") as any)
        .select("*")
        .eq("board_id", data.id)
        .is("deleted_at", null);

      if (!nodesError && dbNodes) {
        const reconstructedNodes = dbNodes.map((dbNode: any) => ({
          id: dbNode.id,
          type: dbNode.type,
          layer: dbNode.layer,
          x: dbNode.x,
          y: dbNode.y,
          min_x: dbNode.min_x,
          min_y: dbNode.min_y,
          max_x: dbNode.max_x,
          max_y: dbNode.max_y,
          lockedBy: dbNode.locked_by,
          lockExpiresAt: dbNode.lock_expires_at,
          createdBy: dbNode.created_by || "",
          updatedBy: dbNode.created_by || "",
          version: dbNode.version,
          updatedAt: new Date(dbNode.updated_at).getTime(),
          ...dbNode.node_json,
        }));

        data.canvas_data = {
          schemaVersion: 1,
          nodes: reconstructedNodes,
        };
      }

      return data as StrategyBoard;
    },
    enabled: !!token,
  });

  // ---- 2. Load into Zustand Store (Forces selected nodes to clear) ----
  useEffect(() => {
    if (board?.canvas_data) {
      loadDocument(board.canvas_data);
    }
  }, [board, loadDocument]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">Loading tactical vector grid...</span>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex flex-col items-center justify-center text-center px-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Strategy Board Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          The public link you are attempting to visit has been deactivated or does not exist.
        </p>
        <Link href="/" className="mt-4">
          <Button variant="outline">Back to Landing</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-foreground flex flex-col select-none">
      {/* Read-Only Top Header */}
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between select-none">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold tracking-tight">FF Intel Observer</span>
          </div>
          <span className="h-4 w-[1px] bg-border" />
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold text-foreground">
              {board.title}
            </h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-semibold capitalize tracking-wide select-none">
              {board.map}
            </span>
          </div>
        </div>

        {/* Read-only Badge indicator */}
        <div className="flex items-center gap-2 select-none">
          <div className="px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Read Only Access
          </div>
        </div>
      </header>

      {/* Main split viewport */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0 select-none">
        {/* Left Side: Layers panel ONLY (allows hiding/showing rotations/utility, but marker placing is disabled since they have no palette!) */}
        <div className="flex flex-col gap-4 shrink-0 select-none">
          <LayerPanel />

          <Card className="bg-card/25 border-border w-64 select-none">
            <div className="p-3.5 space-y-1.5">
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                Interaction Instructions
              </span>
              <p className="text-[10px] text-muted-foreground leading-normal">
                Use your mouse scroll wheel to zoom. Click and drag the canvas to pan across Bermuda, Kalahari, or Nexterra maps. Toggling layer eye icons hides vector groups.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Side: The canvas locked in select mode with mock userId so drawing is prohibited */}
        <div className="flex-1 rounded-2xl border border-border overflow-hidden bg-card/10 select-none relative">
          <WhiteboardCanvas
            mapId={board.map}
            userId="observer"
            username="Observer"
          />
        </div>
      </div>
    </div>
  );
}
