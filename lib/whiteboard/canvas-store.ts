import { create } from "zustand";
import type {
  CanvasNode,
  CanvasDocument,
  LayerType,
  ToolType,
  SaveStatus,
  Viewport,
} from "@/lib/types/app.types";
import { createEmptyDocument } from "@/lib/whiteboard/konva-utils";

// ============================================================
// Canvas Store — Zustand Overhauled for Tactical Refactoring
// ============================================================

const MAX_HISTORY = 50;

export interface TacticalLayer {
  id: string;
  name: string;
  isLocked: boolean;
  isVisible: boolean;
}

interface CanvasState {
  // Document & Elements
  document: CanvasDocument;
  nodes: CanvasNode[];

  // Selection
  selectedNodeIds: string[];

  // Tools
  activeTool: ToolType;
  activeColor: string;
  strokeWidth: number;
  activeLayer: LayerType;
  activeMarkerType: string | null;
  snapToGrid: boolean;

  // Viewport
  viewport: Viewport;

  // Modern Layer system (Allows reordering, custom names, lock & hide)
  layers: TacticalLayer[];
  layerVisibility: Record<string, boolean>; // backward compatibility

  // History & Action logging
  historyStack: CanvasNode[][];
  redoStack: CanvasNode[][];
  historyLogs: string[];
  redoLogs: string[];

  // Replay playback states
  isReplaying: boolean;
  replayProgress: number;

  // Style Clipboard
  styleClipboard: {
    color: string;
    strokeWidth: number;
    opacity?: number;
    fontSize?: number;
    isFilled?: boolean;
    fillOpacity?: number;
  } | null;

  // Save status
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  hasUnsavedChanges: boolean;

  // ---- Actions ----

  // Document
  loadDocument: (doc: CanvasDocument) => void;
  getDocument: () => CanvasDocument;

  // Node CRUD
  addNode: (node: CanvasNode) => void;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  deleteNode: (id: string) => void;
  deleteSelectedNodes: () => void;

  // Selection
  selectNode: (id: string, addToSelection?: boolean) => void;
  deselectAll: () => void;
  selectNodes: (ids: string[]) => void;

  // Tools
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setActiveLayer: (layer: LayerType) => void;
  setActiveMarker: (markerId: string | null) => void;
  toggleSnapToGrid: () => void;

  // Viewport
  setViewport: (viewport: Partial<Viewport>) => void;
  resetViewport: () => void;

  // Layer Actions
  addCustomLayer: (name: string) => void;
  renameLayer: (id: string, newName: string) => void;
  deleteLayer: (id: string) => void;
  setLayers: (layers: TacticalLayer[]) => void;
  toggleLayerLock: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;

  // History with logging
  pushHistory: (actionLabel?: string) => void;
  undo: () => void;
  redo: () => void;
  revertToHistoryStep: (index: number) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Replay Controls
  setReplaying: (isReplaying: boolean) => void;
  setReplayProgress: (progress: number) => void;

  // Copy Paste Styles
  copyStyle: (nodeId: string) => void;
  pasteStyle: (nodeId: string) => void;

  // Depth & Node Utilities
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  duplicateNode: (id: string) => void;
  toggleNodeLock: (id: string) => void;

  // Save status
  setSaveStatus: (status: SaveStatus) => void;
  markUnsavedChanges: () => void;
  markSaved: () => void;

  // Realtime diffs
  applyRemoteDiff: (
    op: "add" | "update" | "delete",
    nodeId: string,
    nodeData?: CanvasNode,
    version?: number,
    authoritative?: boolean
  ) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // ---- Initial State ----
  document: createEmptyDocument(),
  nodes: [],
  selectedNodeIds: [],

  activeTool: "select",
  activeColor: "#3b82f6",
  strokeWidth: 3,
  activeLayer: "team_rotations",
  activeMarkerType: null,
  snapToGrid: false,

  viewport: { x: 0, y: 0, scaleX: 1, scaleY: 1 },

  // Default tactical layer structures
  layers: [
    { id: "map", name: "Map Grid", isLocked: true, isVisible: true },
    { id: "team_rotations", name: "Team Rotations", isLocked: false, isVisible: true },
    { id: "enemy_rotations", name: "Enemy Rotations", isLocked: false, isVisible: true },
    { id: "zones", name: "Tactical Zones", isLocked: false, isVisible: true },
    { id: "utility", name: "Utility Spots", isLocked: false, isVisible: true },
    { id: "notes", name: "Strategic Notes", isLocked: false, isVisible: true },
    { id: "markers", name: "Tactical Markers", isLocked: false, isVisible: true },
    { id: "coach_notes", name: "Coach Notes", isLocked: false, isVisible: true },
  ],

  layerVisibility: {
    map: true,
    team_rotations: true,
    enemy_rotations: true,
    zones: true,
    utility: true,
    notes: true,
    markers: true,
    coach_notes: true,
  },

  historyStack: [],
  redoStack: [],
  historyLogs: [],
  redoLogs: [],

  isReplaying: false,
  replayProgress: 0,
  styleClipboard: null,

  saveStatus: "idle",
  lastSavedAt: null,
  hasUnsavedChanges: false,

  // ---- Document ----

  loadDocument: (doc) => {
    set({
      document: doc,
      nodes: [...doc.nodes],
      historyStack: [],
      redoStack: [],
      historyLogs: [],
      redoLogs: [],
      selectedNodeIds: [],
      hasUnsavedChanges: false,
      saveStatus: "idle",
    });
  },

  getDocument: (): CanvasDocument => {
    const { nodes } = get();
    return {
      schemaVersion: 1,
      nodes: [...nodes],
    };
  },

  // ---- Node CRUD ----

  addNode: (node) => {
    const { pushHistory } = get();
    // Generate clean descriptive label based on type
    const actionLabel = `Added ${node.type.toUpperCase()}`;
    pushHistory(actionLabel);

    set((state) => ({
      nodes: [...state.nodes, node],
      hasUnsavedChanges: true,
    }));
  },

  updateNode: (id, updates) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? { ...n, ...updates, version: n.version + 1, updatedAt: Date.now() }
          : n
      ),
      hasUnsavedChanges: true,
    }));
  },

  deleteNode: (id) => {
    const { pushHistory, nodes } = get();
    const node = nodes.find((n) => n.id === id);
    const label = node ? `Deleted ${node.type.toUpperCase()}` : "Deleted Drawing";
    
    pushHistory(label);
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      selectedNodeIds: state.selectedNodeIds.filter((nid) => nid !== id),
      hasUnsavedChanges: true,
    }));
  },

  deleteSelectedNodes: () => {
    const { selectedNodeIds, pushHistory, nodes } = get();
    if (selectedNodeIds.length === 0) return;

    const firstNode = nodes.find((n) => n.id === selectedNodeIds[0]);
    const label = selectedNodeIds.length > 1
      ? `Deleted ${selectedNodeIds.length} Objects`
      : firstNode
      ? `Deleted ${firstNode.type.toUpperCase()}`
      : "Deleted Object";

    pushHistory(label);
    set((state) => ({
      nodes: state.nodes.filter((n) => !state.selectedNodeIds.includes(n.id)),
      selectedNodeIds: [],
      hasUnsavedChanges: true,
    }));
  },

  // ---- Selection ----

  selectNode: (id, addToSelection = false) => {
    set((state) => {
      // Prevent selecting locked elements
      const node = state.nodes.find((n) => n.id === id);
      if (node) {
        const assignedLayer = state.layers.find((l) => l.id === node.layer);
        if (assignedLayer?.isLocked) return state; // locked layer -> skip
      }

      if (addToSelection) {
        const isAlreadySelected = state.selectedNodeIds.includes(id);
        return {
          selectedNodeIds: isAlreadySelected
            ? state.selectedNodeIds.filter((nid) => nid !== id)
            : [...state.selectedNodeIds, id],
        };
      }
      return { selectedNodeIds: [id] };
    });
  },

  deselectAll: () => set({ selectedNodeIds: [] }),

  selectNodes: (ids) => {
    set((state) => {
      // Filter out locked items
      const filterable = ids.filter((id) => {
        const node = state.nodes.find((n) => n.id === id);
        if (!node) return false;
        const layer = state.layers.find((l) => l.id === node.layer);
        return !layer?.isLocked;
      });
      return { selectedNodeIds: filterable };
    });
  },

  // ---- Tools ----

  setTool: (tool) => set({ activeTool: tool, selectedNodeIds: [] }),
  setColor: (color) => set({ activeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setActiveMarker: (markerId) => set({ activeMarkerType: markerId }),
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  // ---- Viewport ----

  setViewport: (viewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    })),

  resetViewport: () =>
    set({ viewport: { x: 0, y: 0, scaleX: 1, scaleY: 1 } }),

  // ---- Layer Actions ----

  addCustomLayer: (name) => {
    const id = "custom_" + Date.now();
    set((state) => {
      const newLayer = { id, name, isLocked: false, isVisible: true };
      return {
        layers: [...state.layers, newLayer],
        layerVisibility: { ...state.layerVisibility, [id]: true },
      };
    });
  },

  renameLayer: (id, newName) => {
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, name: newName } : l)),
    }));
  },

  deleteLayer: (id) => {
    // Avoid deleting core default layers
    if (["map", "team_rotations", "enemy_rotations", "zones", "utility", "notes", "markers", "coach_notes"].includes(id)) return;

    set((state) => {
      const filteredLayers = state.layers.filter((l) => l.id !== id);
      const filteredNodes = state.nodes.filter((n) => n.layer !== id);
      
      const nextVisibility = { ...state.layerVisibility };
      delete nextVisibility[id];

      return {
        layers: filteredLayers,
        nodes: filteredNodes,
        layerVisibility: nextVisibility,
        selectedNodeIds: state.selectedNodeIds.filter((nid) => {
          const node = state.nodes.find((n) => n.id === nid);
          return node?.layer !== id;
        }),
        hasUnsavedChanges: true,
      };
    });
  },

  setLayers: (layers) => {
    const nextVisibility = {} as Record<string, boolean>;
    layers.forEach((l) => {
      nextVisibility[l.id] = l.isVisible;
    });
    set({ layers, layerVisibility: nextVisibility });
  },

  toggleLayerLock: (id) => {
    set((state) => {
      const updated = state.layers.map((l) =>
        l.id === id ? { ...l, isLocked: !l.isLocked } : l
      );
      
      // Deselect all items that belong to the locked layer
      const isNowLocked = updated.find((l) => l.id === id)?.isLocked ?? false;
      let nextSelectedIds = [...state.selectedNodeIds];
      if (isNowLocked) {
        nextSelectedIds = state.selectedNodeIds.filter((nid) => {
          const node = state.nodes.find((n) => n.id === nid);
          return node?.layer !== id;
        });
      }

      return {
        layers: updated,
        selectedNodeIds: nextSelectedIds,
      };
    });
  },

  toggleLayerVisibility: (id) => {
    set((state) => {
      const updated = state.layers.map((l) =>
        l.id === id ? { ...l, isVisible: !l.isVisible } : l
      );
      const isVisible = updated.find((l) => l.id === id)?.isVisible ?? true;
      return {
        layers: updated,
        layerVisibility: {
          ...state.layerVisibility,
          [id]: isVisible,
        },
      };
    });
  },

  // ---- History With Change Logs ----

  pushHistory: (actionLabel = "Tactical Change") => {
    set((state) => {
      const newHistory = [...state.historyStack, [...state.nodes]];
      const newLogs = [...state.historyLogs, actionLabel];
      
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        newLogs.shift();
      }

      return {
        historyStack: newHistory,
        historyLogs: newLogs,
        redoStack: [], // clear redo
        redoLogs: [],
      };
    });
  },

  undo: () => {
    const { historyStack, nodes, historyLogs } = get();
    if (historyStack.length === 0) return;

    const previousNodes = historyStack[historyStack.length - 1];
    const previousLog = historyLogs[historyLogs.length - 1] ?? "Tactical Change";

    set((state) => ({
      nodes: previousNodes,
      historyStack: state.historyStack.slice(0, -1),
      historyLogs: state.historyLogs.slice(0, -1),
      redoStack: [...state.redoStack, [...nodes]],
      redoLogs: [...state.redoLogs, previousLog],
      selectedNodeIds: [],
      hasUnsavedChanges: true,
    }));
  },

  redo: () => {
    const { redoStack, nodes, redoLogs } = get();
    if (redoStack.length === 0) return;

    const nextNodes = redoStack[redoStack.length - 1];
    const nextLog = redoLogs[redoLogs.length - 1] ?? "Tactical Change";

    set((state) => ({
      nodes: nextNodes,
      redoStack: state.redoStack.slice(0, -1),
      redoLogs: state.redoLogs.slice(0, -1),
      historyStack: [...state.historyStack, [...nodes]],
      historyLogs: [...state.historyLogs, nextLog],
      selectedNodeIds: [],
      hasUnsavedChanges: true,
    }));
  },

  revertToHistoryStep: (index) => {
    const { historyStack, nodes, historyLogs } = get();
    if (index < 0 || index >= historyStack.length) return;

    const targetNodes = historyStack[index];
    const newHistoryStack = historyStack.slice(0, index);
    const newHistoryLogs = historyLogs.slice(0, index);

    const newRedoStack = [...historyStack.slice(index), [...nodes]];
    const newRedoLogs = [...historyLogs.slice(index), "State Restored"];

    set({
      nodes: targetNodes,
      historyStack: newHistoryStack,
      historyLogs: newHistoryLogs,
      redoStack: newRedoStack,
      redoLogs: newRedoLogs,
      selectedNodeIds: [],
      hasUnsavedChanges: true,
    });
  },

  canUndo: () => get().historyStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  // ---- Replay Controls ----
  setReplaying: (isReplaying) => set({ isReplaying }),
  setReplayProgress: (replayProgress) => set({ replayProgress }),

  // ---- Style Clipboard ----
  copyStyle: (nodeId) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    set({
      styleClipboard: {
        color: node.color,
        strokeWidth: node.strokeWidth,
        opacity: node.opacity,
        fontSize: node.fontSize,
        isFilled: node.isFilled,
        fillOpacity: node.fillOpacity,
      },
    });
  },

  pasteStyle: (nodeId) => {
    const { styleClipboard, pushHistory } = get();
    if (!styleClipboard) return;

    pushHistory("Pasted Style");
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              ...styleClipboard,
              version: n.version + 1,
              updatedAt: Date.now(),
            }
          : n
      ),
      hasUnsavedChanges: true,
    }));
  },

  bringToFront: (id) => {
    const { pushHistory } = get();
    pushHistory("Bring to Front");
    set((state) => {
      const node = state.nodes.find((n) => n.id === id);
      if (!node) return {};
      const remaining = state.nodes.filter((n) => n.id !== id);
      return {
        nodes: [...remaining, node],
        hasUnsavedChanges: true,
      };
    });
  },

  sendToBack: (id) => {
    const { pushHistory } = get();
    pushHistory("Send to Back");
    set((state) => {
      const node = state.nodes.find((n) => n.id === id);
      if (!node) return {};
      const remaining = state.nodes.filter((n) => n.id !== id);
      return {
        nodes: [node, ...remaining],
        hasUnsavedChanges: true,
      };
    });
  },

  duplicateNode: (id) => {
    const { pushHistory } = get();
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;

    pushHistory("Duplicate Object");
    
    // Fallback compliant UUIDv4 generator
    const newId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    set((state) => {
      const duplicated: CanvasNode = {
        ...node,
        id: newId,
        x: Math.min(0.95, node.x + 0.03),
        y: Math.min(0.95, node.y + 0.03),
        version: 1,
        updatedAt: Date.now(),
      };
      return {
        nodes: [...state.nodes, duplicated],
        selectedNodeIds: [newId],
        hasUnsavedChanges: true,
      };
    });
  },

  toggleNodeLock: (id) => {
    const { pushHistory } = get();
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    
    const isLocked = node.isLocked ?? false;
    pushHistory(isLocked ? "Unlocked Object" : "Locked Object");
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, isLocked: !n.isLocked } : n
      ),
      hasUnsavedChanges: true,
    }));
  },

  // ---- Save Status ----

  setSaveStatus: (status) => set({ saveStatus: status }),
  markUnsavedChanges: () => set({ hasUnsavedChanges: true }),
  markSaved: () =>
    set({ hasUnsavedChanges: false, saveStatus: "saved", lastSavedAt: Date.now() }),

  // ---- Realtime Diffs ----

  applyRemoteDiff: (op, nodeId, nodeData, version, authoritative) => {
    set((state) => {
      const newNodes = [...state.nodes];

      switch (op) {
        case "add": {
          if (newNodes.some((n) => n.id === nodeId) || !nodeData) {
            return state;
          }
          return { nodes: [...newNodes, nodeData] };
        }
        case "update": {
          if (!nodeData) return state;
          const idx = newNodes.findIndex((n) => n.id === nodeId);
          if (idx === -1) return state;

          const localNode = newNodes[idx];
          const incomingVersion = version ?? nodeData.version;

          if (
            incomingVersion > localNode.version ||
            (authoritative && incomingVersion >= localNode.version)
          ) {
            newNodes[idx] = { ...nodeData };
            return { nodes: newNodes };
          }
          return state;
        }
        case "delete": {
          const filtered = newNodes.filter((n) => n.id !== nodeId);
          if (filtered.length === newNodes.length) return state;
          return {
            nodes: filtered,
            selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
          };
        }
        default:
          return state;
      }
    });
  },
}));
