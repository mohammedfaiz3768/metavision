"use client";

import { useEffect, useState, useRef } from "react";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { estimatePayloadSize, MAX_PAYLOAD_BYTES } from "@/lib/whiteboard/konva-utils";
import type { CanvasDocument } from "@/lib/types/app.types";

interface UseAutoSaveProps {
  boardId: string;
  stageRef: React.RefObject<any>;
}

export function useAutoSave({ boardId, stageRef }: UseAutoSaveProps) {
  const {
    nodes,
    hasUnsavedChanges,
    saveStatus,
    setSaveStatus,
    markSaved,
    loadDocument,
    getDocument,
    markUnsavedChanges,
  } = useCanvasStore();

  const supabase = createClient();
  const [draftExists, setDraftExists] = useState(false);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const [draftDoc, setDraftDoc] = useState<CanvasDocument | null>(null);

  const lastSavedNodesJson = useRef<string>("");
  const lastThumbnailTime = useRef<number>(0);
  const autosaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const localDraftTimeout = useRef<NodeJS.Timeout | null>(null);

  // ---- 1. Check for Offline Draft on Load ----
  useEffect(() => {
    const checkDraft = async () => {
      try {
        const draftStr = localStorage.getItem(`ff-intel-draft-${boardId}`);
        if (!draftStr) return;

        const parsedDraft = JSON.parse(draftStr);
        if (!parsedDraft || !Array.isArray(parsedDraft.nodes)) return;

        // Fetch current DB nodes to verify if they differ
        const { data: boardData, error } = await (supabase
          .from("strategy_boards") as any)
          .select("canvas_data")
          .eq("id", boardId)
          .single();

        if (error || !boardData) return;

        const dbDoc = boardData.canvas_data as unknown as CanvasDocument;
        const dbNodes = dbDoc?.nodes || [];

        // If length or node IDs differ, show draft recovery dialog
        const dbNodesJson = JSON.stringify(dbNodes);
        const draftNodesJson = JSON.stringify(parsedDraft.nodes);

        if (dbNodesJson !== draftNodesJson) {
          setDraftDoc(parsedDraft);
          setDraftExists(true);
          
          // Get draft saved timestamp
          const draftMetaStr = localStorage.getItem(`ff-intel-draft-meta-${boardId}`);
          if (draftMetaStr) {
            const meta = JSON.parse(draftMetaStr);
            if (meta.timestamp) {
              setDraftTime(new Date(meta.timestamp).toLocaleTimeString());
            }
          }
        }
      } catch (e) {
        console.warn("Failed to retrieve local draft recovery:", e);
      }
    };

    checkDraft();
  }, [boardId]);

  // Clean up drafts older than 7 days on app load
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      keys.forEach((key) => {
        if (key.startsWith("ff-intel-draft-meta-")) {
          const metaStr = localStorage.getItem(key);
          if (metaStr) {
            const meta = JSON.parse(metaStr);
            if (meta.timestamp && now - meta.timestamp > sevenDays) {
              const bId = key.replace("ff-intel-draft-meta-", "");
              localStorage.removeItem(`ff-intel-draft-${bId}`);
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (e) {
      console.warn("Offline draft garbage collection failed:", e);
    }
  }, []);

  // ---- 2. Save Draft to LocalStorage (1s Debounce) ----
  useEffect(() => {
    if (nodes.length === 0 && lastSavedNodesJson.current === "") return;

    if (localDraftTimeout.current) clearTimeout(localDraftTimeout.current);

    localDraftTimeout.current = setTimeout(() => {
      const currentDoc = getDocument();
      const currentNodesJson = JSON.stringify(currentDoc.nodes);

      // Only save if it differs from the last DB saved version
      if (currentNodesJson !== lastSavedNodesJson.current) {
        localStorage.setItem(`ff-intel-draft-${boardId}`, JSON.stringify(currentDoc));
        localStorage.setItem(
          `ff-intel-draft-meta-${boardId}`,
          JSON.stringify({ timestamp: Date.now() })
        );
      }
    }, 1000);

    return () => {
      if (localDraftTimeout.current) clearTimeout(localDraftTimeout.current);
    };
  }, [nodes, boardId]);

  // ---- 3. Save to DB (2s Debounce) ----
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);

    setSaveStatus("saving");

    autosaveTimeout.current = setTimeout(async () => {
      const currentDoc = getDocument();
      const payloadSize = estimatePayloadSize(currentDoc);

      // Warn if payload exceeds size limit (500KB)
      if (payloadSize > MAX_PAYLOAD_BYTES) {
        console.warn(
          `Payload Warning: Canvas document size (${(payloadSize / 1024).toFixed(
            1
          )}KB) exceeds recommended 500KB threshold.`
        );
      }

      try {
        // A. Generate thumbnail on successful DB save (Throttle: 15s)
        let thumbnailUrl = null;
        const now = Date.now();

        if (stageRef.current && now - lastThumbnailTime.current >= 15000) {
          // Wrap in requestIdleCallback or setTimeout to avoid blocking thread
          const generateThumbnail = () => {
            try {
              const stage = stageRef.current;
              if (!stage) return null;
              // Scale down image to 320px wide to minimize base64 payload size
              const dataUrl = stage.toDataURL({
                pixelRatio: 320 / stage.width(),
                mimeType: "image/jpeg",
                quality: 0.7,
              });
              lastThumbnailTime.current = Date.now();
              return dataUrl;
            } catch (err) {
              console.warn("Failed to generate preview thumbnail:", err);
              return null;
            }
          };

          if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            (window as any).requestIdleCallback(() => {
              const dataUrl = generateThumbnail();
              saveBoardToDb(currentDoc, dataUrl);
            });
            return;
          } else {
            thumbnailUrl = generateThumbnail();
          }
        }

        await saveBoardToDb(currentDoc, thumbnailUrl);
      } catch (err: any) {
        console.error("Autosave execution failed:", err);
        setSaveStatus("error");
      }
    }, 2000);

    return () => {
      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    };
  }, [nodes, hasUnsavedChanges, boardId]);

  // DB Save Helper
  const saveBoardToDb = async (currentDoc: CanvasDocument, thumbnailUrl: string | null) => {
    const updates: Record<string, any> = {
      canvas_data: currentDoc,
      updated_at: new Date().toISOString(),
    };

    if (thumbnailUrl) {
      updates.thumbnail_url = thumbnailUrl;
    }

    const { error } = await (supabase
      .from("strategy_boards") as any)
      .update(updates)
      .eq("id", boardId);

    if (error) {
      setSaveStatus("error");
      toast.error(`Autosave failed: ${error.message}`);
      return;
    }

    // Success! Update local states and clear draft
    lastSavedNodesJson.current = JSON.stringify(currentDoc.nodes);
    localStorage.removeItem(`ff-intel-draft-${boardId}`);
    localStorage.removeItem(`ff-intel-draft-meta-${boardId}`);
    markSaved();
  };

  // ---- 4. Recover & Discard Draft Handlers ----
  const handleRecoverDraft = () => {
    if (draftDoc) {
      loadDocument(draftDoc);
      markUnsavedChanges(); // mark unsaved changes so it pushes to DB
      toast.success("Recovered unsaved whiteboard progress!");
    }
    setDraftExists(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(`ff-intel-draft-${boardId}`);
    localStorage.removeItem(`ff-intel-draft-meta-${boardId}`);
    setDraftExists(false);
    toast.success("Discarded local draft");
  };

  return {
    draftExists,
    draftTime,
    handleRecoverDraft,
    handleDiscardDraft,
  };
}
