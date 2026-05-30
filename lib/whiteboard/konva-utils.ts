import { v4 as uuidv4 } from "uuid";
import type { CanvasNode, CanvasDocument } from "@/lib/types/app.types";

// ============================================================
// Coordinate Normalization
// ============================================================

/** Convert screen pixel position to normalized 0-1 coordinate */
export function screenToNormalized(
  screenX: number,
  screenY: number,
  stageWidth: number,
  stageHeight: number
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(1, screenX / stageWidth)),
    y: Math.max(0, Math.min(1, screenY / stageHeight)),
  };
}

/** Convert normalized 0-1 coordinate to screen pixel position */
export function normalizedToScreen(
  normX: number,
  normY: number,
  stageWidth: number,
  stageHeight: number
): { x: number; y: number } {
  return {
    x: normX * stageWidth,
    y: normY * stageHeight,
  };
}

/** Normalize a flat points array [x1,y1,x2,y2,...] */
export function normalizePoints(
  points: number[],
  stageWidth: number,
  stageHeight: number
): number[] {
  const normalized: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    normalized.push(
      Math.max(0, Math.min(1, points[i] / stageWidth)),
      Math.max(0, Math.min(1, points[i + 1] / stageHeight))
    );
  }
  return normalized;
}

/** Denormalize a flat points array back to screen coordinates */
export function denormalizePoints(
  points: number[],
  stageWidth: number,
  stageHeight: number
): number[] {
  const denormalized: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    denormalized.push(points[i] * stageWidth, points[i + 1] * stageHeight);
  }
  return denormalized;
}

// ============================================================
// Douglas-Peucker Point Simplification
// ============================================================

/** Perpendicular distance from point to line segment */
function perpendicularDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Douglas-Peucker simplification for flat point arrays [x1,y1,x2,y2,...]
 * All values should be normalized 0-1.
 * epsilon=0.002 ≈ 2px tolerance on a 1024px canvas — imperceptible.
 */
export function simplifyPoints(
  points: number[],
  epsilon: number = 0.002
): number[] {
  if (points.length <= 4) return points; // 2 points or fewer, nothing to simplify

  const numPoints = points.length / 2;
  const keep = new Array(numPoints).fill(false);
  keep[0] = true;
  keep[numPoints - 1] = true;

  const stack: [number, number][] = [[0, numPoints - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = start;

    const x1 = points[start * 2];
    const y1 = points[start * 2 + 1];
    const x2 = points[end * 2];
    const y2 = points[end * 2 + 1];

    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistance(
        points[i * 2],
        points[i * 2 + 1],
        x1,
        y1,
        x2,
        y2
      );
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon) {
      keep[maxIdx] = true;
      stack.push([start, maxIdx]);
      stack.push([maxIdx, end]);
    }
  }

  const simplified: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    if (keep[i]) {
      simplified.push(points[i * 2], points[i * 2 + 1]);
    }
  }

  return simplified;
}

/**
 * Distance threshold filter — skip points closer than threshold from previous point.
 * Used during live drawing to prevent 120hz mice from generating excessive points.
 * threshold is in screen pixels.
 */
export function filterClosePoints(
  points: number[],
  threshold: number = 3
): number[] {
  if (points.length <= 2) return points;

  const filtered: number[] = [points[0], points[1]];
  let lastX = points[0];
  let lastY = points[1];

  for (let i = 2; i < points.length; i += 2) {
    const dx = points[i] - lastX;
    const dy = points[i + 1] - lastY;
    if (dx * dx + dy * dy >= threshold * threshold) {
      filtered.push(points[i], points[i + 1]);
      lastX = points[i];
      lastY = points[i + 1];
    }
  }

  // Always keep last point
  const lastIdx = points.length - 2;
  if (
    filtered[filtered.length - 2] !== points[lastIdx] ||
    filtered[filtered.length - 1] !== points[lastIdx + 1]
  ) {
    filtered.push(points[lastIdx], points[lastIdx + 1]);
  }

  return filtered;
}

// ============================================================
// Canvas Document Helpers
// ============================================================

const CURRENT_SCHEMA_VERSION = 1 as const;

export function createEmptyDocument(): CanvasDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    nodes: [],
  };
}

/** Generate a new node ID */
export function generateNodeId(): string {
  return uuidv4();
}

/**
 * Migrate canvas data from any version to current.
 * Handles legacy data (no schemaVersion) and future migrations.
 */
export function migrateCanvasData(data: unknown): CanvasDocument {
  if (!data || typeof data !== "object") {
    return createEmptyDocument();
  }

  const doc = data as Record<string, unknown>;

  // Legacy: no schemaVersion — treat as empty or attempt migration
  if (!("schemaVersion" in doc)) {
    // Check if it's a raw nodes array
    if (Array.isArray(doc.nodes)) {
      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        nodes: doc.nodes as CanvasNode[],
      };
    }
    return createEmptyDocument();
  }

  // Already current version
  if (doc.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return doc as unknown as CanvasDocument;
  }

  // Future: add migration functions here
  // if (doc.schemaVersion === 1) doc = migrateV1toV2(doc);
  // if (doc.schemaVersion === 2) doc = migrateV2toV3(doc);

  return doc as unknown as CanvasDocument;
}

/** Estimate payload size of canvas document in bytes */
export function estimatePayloadSize(doc: CanvasDocument): number {
  return new Blob([JSON.stringify(doc)]).size;
}

/** Maximum recommended payload size (500KB) */
export const MAX_PAYLOAD_BYTES = 500 * 1024;

/** Maximum recommended nodes per board */
export const MAX_NODES = 3000;

/** Warning threshold for nodes */
export const WARN_NODES = 2500;
