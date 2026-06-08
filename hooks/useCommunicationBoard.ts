"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CalloutRow {
  id: string;
  team_id: string;
  map_id: string;
  building_id: string;
  callout_text: string;
  updated_by: string;
  updated_at: string;
}

interface FetchResponse {
  callouts: CalloutRow[];
  userRole: string;
  teamId: string;
}

export function useCommunicationBoard(mapId: string) {
  const queryClient = useQueryClient();
  const [localCallouts, setLocalCallouts] = useState<Record<string, string>>({});
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("saved");

  // Keep a reference of values to avoid stale closures in timeouts and blur handlers
  const localCalloutsRef = useRef<Record<string, string>>({});
  localCalloutsRef.current = localCallouts;

  const debounceTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch team callouts for this map
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<FetchResponse>({
    queryKey: ["building-callouts", mapId],
    queryFn: async () => {
      const res = await fetch(`/api/communication/${mapId}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
  });

  const userRole = data?.userRole || "player";
  const teamId = data?.teamId || "";
  const isEditable = ["coach", "analyst", "IGL"].includes(userRole);

  // Initialize local state when data is loaded
  useEffect(() => {
    if (data?.callouts) {
      const initial: Record<string, string> = {};
      data.callouts.forEach((c) => {
        initial[c.building_id] = c.callout_text;
      });
      setLocalCallouts(initial);
      setDirtyMap({});
      setSavingMap({});
      setSaveStatus("saved");
    }
  }, [data]);

  // Mutation to save single callout
  const saveMutation = useMutation({
    mutationFn: async ({
      buildingId,
      text,
    }: {
      buildingId: string;
      text: string;
    }) => {
      const res = await fetch(`/api/communication/${mapId}/${buildingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callout_text: text,
          team_id: teamId,
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Clear dirty flag for this building
      setDirtyMap((prev) => {
        const next = { ...prev };
        delete next[variables.buildingId];
        // If no more dirty keys, status is saved
        if (Object.keys(next).length === 0) {
          setSaveStatus("saved");
        }
        return next;
      });
    },
    onError: (err) => {
      setSaveStatus("error");
      toast.error(`Failed to save callout: ${(err as Error).message}`);
    },
  });

  // Individual building save function
  const saveBuildingCallout = useCallback(
    async (buildingId: string, text: string) => {
      if (!isEditable || !teamId) return;
      setSaveStatus("saving");
      setSavingMap((prev) => ({ ...prev, [buildingId]: true }));
      try {
        await saveMutation.mutateAsync({ buildingId, text });
      } catch {
        // Error toast is handled in mutation onError
      } finally {
        setSavingMap((prev) => {
          const next = { ...prev };
          delete next[buildingId];
          return next;
        });
      }
    },
    [isEditable, teamId, saveMutation]
  );

  // Update handler (typing)
  const updateCallout = useCallback(
    (buildingId: string, text: string) => {
      if (!isEditable) return;

      // 1. Update local state immediately (optimistic UI update)
      setLocalCallouts((prev) => ({
        ...prev,
        [buildingId]: text,
      }));

      // 2. Mark as dirty
      setDirtyMap((prev) => ({
        ...prev,
        [buildingId]: true,
      }));
      setSaveStatus("idle"); // Unsaves state

      // 3. Clear existing debounce timeout
      if (debounceTimeoutsRef.current[buildingId]) {
        clearTimeout(debounceTimeoutsRef.current[buildingId]);
      }

      // 4. Set debounce timeout for 800ms
      debounceTimeoutsRef.current[buildingId] = setTimeout(() => {
        saveBuildingCallout(buildingId, text);
      }, 800);
    },
    [isEditable, saveBuildingCallout]
  );

  // Blur handler (saves immediately if dirty)
  const handleBlur = useCallback(
    (buildingId: string) => {
      if (!isEditable) return;

      // Clear any pending debounce timeout
      if (debounceTimeoutsRef.current[buildingId]) {
        clearTimeout(debounceTimeoutsRef.current[buildingId]);
      }

      // Save immediately if dirty
      if (dirtyMap[buildingId]) {
        const currentVal = localCalloutsRef.current[buildingId] || "";
        saveBuildingCallout(buildingId, currentVal);
      }
    },
    [isEditable, dirtyMap, saveBuildingCallout]
  );

  // Save All button (parallel saves using Promise.all)
  const saveAll = useCallback(async () => {
    if (!isEditable || !teamId) return;

    const dirtyIds = Object.keys(dirtyMap).filter((id) => dirtyMap[id]);
    if (dirtyIds.length === 0) {
      toast.info("All changes are already saved.");
      return;
    }

    setSaveStatus("saving");
    // Set all dirty ids to saving
    const newSaving: Record<string, boolean> = {};
    dirtyIds.forEach((id) => {
      newSaving[id] = true;
    });
    setSavingMap((prev) => ({ ...prev, ...newSaving }));

    try {
      // Cancel all pending timeouts
      Object.keys(debounceTimeoutsRef.current).forEach((id) => {
        clearTimeout(debounceTimeoutsRef.current[id]);
      });

      await Promise.all(
        dirtyIds.map((id) => {
          const text = localCalloutsRef.current[id] || "";
          return saveMutation.mutateAsync({ buildingId: id, text });
        })
      );
      toast.success("All callouts saved successfully!");
      setSaveStatus("saved");
    } catch (err: any) {
      setSaveStatus("error");
      toast.error(`Save All failed: ${err.message}`);
    } finally {
      setSavingMap((prev) => {
        const next = { ...prev };
        dirtyIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
    }
  }, [isEditable, teamId, dirtyMap, saveMutation]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(debounceTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const hasChanges = Object.keys(dirtyMap).length > 0;

  return {
    localCallouts,
    updateCallout,
    handleBlur,
    saveAll,
    hasChanges,
    saveStatus,
    isLoading,
    error,
    userRole,
    isEditable,
    refetch,
    dirtyMap,
    savingMap,
  };
}
