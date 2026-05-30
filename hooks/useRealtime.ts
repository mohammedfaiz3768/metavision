"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { z } from "zod";
import type { CanvasNode, LayerType, CursorPosition } from "@/lib/types/app.types";

// ============================================================
// Zod Realtime Payloads Validation
// ============================================================

const LayerTypeSchema = z.enum(["rotations", "enemy_routes", "zones", "utility", "notes", "custom"]);

const CanvasNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["freedraw", "arrow", "circle", "rect", "text", "marker"]),
  layer: LayerTypeSchema,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  points: z.array(z.number()).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  rotation: z.number().optional(),
  color: z.string(),
  strokeWidth: z.number().min(1).max(10),
  opacity: z.number().optional(),
  fontSize: z.number().optional(),
  text: z.string().optional(),
  markerType: z.string().optional(),
  pointerLength: z.number().optional(),
  pointerWidth: z.number().optional(),
  createdBy: z.string(),
  updatedBy: z.string(),
  updatedAt: z.number(),
  version: z.number().int().min(0),
});

const CanvasDiffSchema = z.object({
  op: z.enum(["add", "update", "delete"]),
  layer: LayerTypeSchema,
  nodeId: z.string().uuid(),
  nodeData: CanvasNodeSchema.optional(),
  version: z.number().int().min(0),
  authoritative: z.boolean().optional(),
});

interface UseRealtimeProps {
  boardId: string;
  userId: string;
  username: string;
  stageRef: React.RefObject<any>;
}

export function useRealtime({
  boardId,
  userId,
  username,
  stageRef,
}: UseRealtimeProps) {
  const supabase = createClient();
  const { applyRemoteDiff, nodes } = useCanvasStore();
  
  const [activeCursors, setActiveCursors] = useState<Record<string, CursorPosition>>({});
  const channelRef = useRef<any>(null);
  const localVersionTracker = useRef<Record<string, number>>({});

  // Generate a distinct color for this user session's cursor
  const localCursorColor = useRef<string>(
    `hsl(${Math.floor(Math.random() * 360)}, 85%, 60%)`
  );

  useEffect(() => {
    if (!boardId) return;

    // 1. Establish Channel Subscription
    const channel = supabase.channel(`board-realtime-${boardId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    // 2. Presence — Syncing Live Cursors
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const cursors: Record<string, CursorPosition> = {};

        Object.keys(state).forEach((usrId) => {
          if (usrId === userId) return; // skip self
          const presData: any = state[usrId]?.[0];
          if (presData && presData.x !== undefined && presData.y !== undefined) {
            cursors[usrId] = {
              user_id: usrId,
              username: presData.username || "Anonymous Teammate",
              x: presData.x,
              y: presData.y,
              color: presData.color || "hsl(210, 100%, 60%)",
            };
          }
        });

        setActiveCursors(cursors);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        // Log teammates entering strategy board
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        setActiveCursors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      });

    // 3. Broadcasts — Syncing Whiteboard Shapes (add, update, delete)
    channel.on("broadcast", { event: "canvas-diff" }, ({ payload }) => {
      // client-side validation check of incoming realtime diffs using Zod schemas!
      const parsed = CanvasDiffSchema.safeParse(payload);
      if (!parsed.success) {
        console.warn("Malformed realtime diff payload rejected:", parsed.error);
        return; // silently discard
      }

      const { op, nodeId, nodeData, version, authoritative } = parsed.data;
      
      // Update local tracking so we don't re-broadcast what we just got
      if (version !== undefined) {
        localVersionTracker.current[nodeId] = version;
      } else if (nodeData) {
        localVersionTracker.current[nodeId] = nodeData.version;
      }

      applyRemoteDiff(
        op,
        nodeId,
        nodeData as CanvasNode,
        version,
        authoritative
      );
    });

    // 4. Connect Channel
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Set initial user presence details
        await channel.track({
          username,
          color: localCursorColor.current,
          x: 0.5,
          y: 0.5,
        });
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [boardId, userId, username]);

  // ---- 5. Broadcast Local Operations ----
  // Sync local changes to other clients when they happen locally
  useEffect(() => {
    if (!channelRef.current) return;

    nodes.forEach((node) => {
      const lastSyncedVer = localVersionTracker.current[node.id] || 0;
      if (node.version > lastSyncedVer) {
        // Broadcast local mutation!
        channelRef.current.send({
          type: "broadcast",
          event: "canvas-diff",
          payload: {
            op: lastSyncedVer === 0 ? "add" : "update",
            layer: node.layer,
            nodeId: node.id,
            nodeData: node,
            version: node.version,
            authoritative: true, // we generated it, so it is authoritative
          },
        });
        localVersionTracker.current[node.id] = node.version;
      }
    });

    // Handle deletes (if a node disappears from state)
    const trackedKeys = Object.keys(localVersionTracker.current);
    trackedKeys.forEach((nodeId) => {
      const stillExists = nodes.some((n) => n.id === nodeId);
      if (!stillExists) {
        // Broadcast delete operation
        const currentVer = localVersionTracker.current[nodeId] || 1;
        channelRef.current.send({
          type: "broadcast",
          event: "canvas-diff",
          payload: {
            op: "delete",
            layer: "custom", // placeholder layer
            nodeId,
            version: currentVer + 1,
          },
        });
        delete localVersionTracker.current[nodeId];
      }
    });
  }, [nodes]);

  // ---- 6. Broadcast Cursor Positions ----
  const handleStageMouseMove = (e: any) => {
    if (!channelRef.current) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Viewport transform adjustments
    const transform = stage.getAbsoluteTransform().copy().invert();
    const stagePos = transform.point(pos);

    // Convert to normalized coordinates (0-1)
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const xNorm = Math.max(0, Math.min(1, stagePos.x / stageWidth));
    const yNorm = Math.max(0, Math.min(1, stagePos.y / stageHeight));

    // Update Presence information (throttled inside Supabase implicitly)
    channelRef.current.track({
      username,
      color: localCursorColor.current,
      x: xNorm,
      y: yNorm,
    });
  };

  return {
    cursors: Object.values(activeCursors),
    handleStageMouseMove,
    cursorColor: localCursorColor.current,
  };
}
