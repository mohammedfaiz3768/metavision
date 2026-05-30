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
// Canvas Store — Zustand
// ============================================================

const MAX_HISTORY = 50;

interface CanvasState {
  // Document
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

  // Viewport (local only, never persisted)
  viewport: Viewport;

  // Layer visibility
  layerVisibility: Record<LayerType, boolean>;

  // History (full-snapshot, capped at 50 — temporary architecture)
  historyStack: CanvasNode[][];
  redoStack: CanvasNode[][];

  // Save state machine
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

  // Layer visibility
  toggleLayerVisibility: (layer: LayerType) => void;
  setLayerVisibility: (layer: LayerType, visible: boolean) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Save status
  setSaveStatus: (status: SaveStatus) => void;
  markUnsavedChanges: () => void;
  markSaved: () => void;

  // Realtime — apply incoming diff (version-checked)
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
  activeLayer: "rotations",
  activeMarkerType: null,
  snapToGrid: false,

  viewport: { x: 0, y: 0, scaleX: 1, scaleY: 1 },

  layerVisibility: {
    rotations: true,
    enemy_routes: true,
    zones: true,
    utility: true,
    notes: true,
    custom: true,
  },

  historyStack: [],
  redoStack: [],

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
    pushHistory();
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
    const { pushHistory } = get();
    pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      selectedNodeIds: state.selectedNodeIds.filter((nid) => nid !== id),
      hasUnsavedChanges: true,
    }));
  },

  deleteSelectedNodes: () => {
    const { selectedNodeIds, pushHistory } = get();
    if (selectedNodeIds.length === 0) return;
    pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => !state.selectedNodeIds.includes(n.id)),
      selectedNodeIds: [],
      hasUnsavedChanges: true,
    }));
  },

  // ---- Selection ----

  selectNode: (id, addToSelection = false) => {
    set((state) => {
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

  selectNodes: (ids) => set({ selectedNodeIds: ids }),

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

  // ---- Layer Visibility ----

  toggleLayerVisibility: (layer) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    })),

  setLayerVisibility: (layer, visible) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: visible,
      },
    })),

  // ---- History ----

  pushHistory: () => {
    set((state) => {
      const newHistory = [...state.historyStack, [...state.nodes]];
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return {
        historyStack: newHistory,
        redoStack: [], // clear redo on new action
      };
    });
  },

  undo: () => {
    const { historyStack, nodes } = get();
    if (historyStack.length === 0) return;

    const previousNodes = historyStack[historyStack.length - 1];
    set((state) => ({
      nodes: previousNodes,
      historyStack: state.historyStack.slice(0, -1),
      redoStack: [...state.redoStack, [...nodes]],
      selectedNodeIds: [],
      hasUnsavedChanges: true,
    }));
  },

  redo: () => {
    const { redoStack, nodes } = get();
    if (redoStack.length === 0) return;

    const nextNodes = redoStack[redoStack.length - 1];
    set((state) => ({
      nodes: nextNodes,
      redoStack: state.redoStack.slice(0, -1),
      historyStack: [...state.historyStack, [...nodes]],
      selectedNodeIds: [],
      hasUnsavedChanges: true,
    }));
  },

  canUndo: () => get().historyStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  // ---- Save Status ----

  setSaveStatus: (status) => set({ saveStatus: status }),
  markUnsavedChanges: () => set({ hasUnsavedChanges: true }),
  markSaved: () =>
    set({ hasUnsavedChanges: false, saveStatus: "saved", lastSavedAt: Date.now() }),

  // ---- Realtime ----

  applyRemoteDiff: (op, nodeId, nodeData, version, authoritative) => {
    set((state) => {
      const newNodes = [...state.nodes];

      switch (op) {
        case "add": {
          // Idempotent: skip if node already exists
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

          // Version-based conflict resolution
          // Apply only if incoming version > local version
          // Or if it's an authoritative update (dragend)
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
          // Idempotent: skip if node doesn't exist
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
