import { z } from "zod";
import type { CanvasNode, CanvasNodeType, LayerType } from "@/lib/types/app.types";

// ============================================================
// Zod Base Schemas
// ============================================================

const LayerTypeSchema = z.enum([
  "rotations",
  "enemy_routes",
  "zones",
  "utility",
  "notes",
  "custom",
]);

export const BaseNodeSchema = z.object({
  id: z.string().uuid(),
  layer: LayerTypeSchema,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  color: z.string().max(30),
  strokeWidth: z.number().min(1).max(20),
  opacity: z.number().min(0).max(1).optional(),
  isLocked: z.boolean().optional(),
  createdBy: z.string(),
  updatedBy: z.string(),
  updatedAt: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
});

// ============================================================
// Shape Union Sub-schemas
// ============================================================

export const FreeDrawNodeSchema = BaseNodeSchema.extend({
  type: z.literal("freedraw"),
  points: z.array(z.number().min(0).max(1)).max(1000), // Normalised coordinates flat array
});

export const RotationNodeSchema = BaseNodeSchema.extend({
  type: z.literal("rotation"),
  points: z.array(z.number().min(0).max(1)).max(400),
});

export const TextNodeSchema = BaseNodeSchema.extend({
  type: z.literal("text"),
  text: z.string().max(1000),
  fontSize: z.number().min(8).max(72),
  width: z.number().min(0).max(1).optional(),
  height: z.number().min(0).max(1).optional(),
});

export const CircleNodeSchema = BaseNodeSchema.extend({
  type: z.literal("circle"),
  radius: z.number().min(0.0001).max(1),
});

export const RectNodeSchema = BaseNodeSchema.extend({
  type: z.literal("rect"),
  width: z.number().min(0.0001).max(1),
  height: z.number().min(0.0001).max(1),
  rotation: z.number().optional(),
});

export const ArrowNodeSchema = BaseNodeSchema.extend({
  type: z.literal("arrow"),
  points: z.array(z.number().min(0).max(1)).length(4), // Flat [x1, y1, x2, y2]
  pointerLength: z.number().min(1).max(50).optional(),
  pointerWidth: z.number().min(1).max(50).optional(),
});

export const MarkerNodeSchema = BaseNodeSchema.extend({
  type: z.literal("marker"),
  markerType: z.string().max(50),
});

// Master Discriminated Union Schema
export const CanvasNodeSchema = z.discriminatedUnion("type", [
  FreeDrawNodeSchema,
  RotationNodeSchema,
  TextNodeSchema,
  CircleNodeSchema,
  RectNodeSchema,
  ArrowNodeSchema,
  MarkerNodeSchema,
]);

// ============================================================
// Server-Authoritative Bounding Box Calculator
// ============================================================

export interface BoundingBox {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

/**
 * Server-authoritatively computes a node's bounding box based purely on shape coordinates.
 * Client-submitted bounding box values are treated only as suggestions.
 */
export function calculateAuthoritativeBounds(node: any): BoundingBox {
  const padding = 0.005; // Base coordinate padding for strokes / bounds culling safety
  
  let min_x = node.x;
  let min_y = node.y;
  let max_x = node.x;
  let max_y = node.y;

  switch (node.type as CanvasNodeType) {
    case "freedraw":
    case "rotation": {
      const pts = node.points || [];
      if (pts.length >= 2) {
        min_x = pts[0];
        max_x = pts[0];
        min_y = pts[1];
        max_y = pts[1];

        for (let i = 0; i < pts.length; i += 2) {
          const x = pts[i];
          const y = pts[i + 1];
          if (x !== undefined && y !== undefined) {
            if (x < min_x) min_x = x;
            if (x > max_x) max_x = x;
            if (y < min_y) min_y = y;
            if (y > max_y) max_y = y;
          }
        }
      }
      break;
    }
    
    case "arrow": {
      const pts = node.points || [];
      if (pts.length === 4) {
        min_x = Math.min(pts[0], pts[2]);
        max_x = Math.max(pts[0], pts[2]);
        min_y = Math.min(pts[1], pts[3]);
        max_y = Math.max(pts[1], pts[3]);
      }
      break;
    }

    case "circle": {
      const radius = node.radius || 0.01;
      min_x = node.x - radius;
      max_x = node.x + radius;
      min_y = node.y - radius;
      max_y = node.y + radius;
      break;
    }

    case "rect": {
      const width = node.width || 0.01;
      const height = node.height || 0.01;
      min_x = node.x;
      max_x = node.x + width;
      min_y = node.y;
      max_y = node.y + height;
      break;
    }

    case "text": {
      // Approximate bounds based on fontSize/height normalized
      const width = node.width || 0.1;
      const height = node.height || 0.04;
      min_x = node.x;
      max_x = node.x + width;
      min_y = node.y;
      max_y = node.y + height;
      break;
    }

    case "marker": {
      // Tactical markers have standard size limits (e.g. 0.03 width/height)
      const markerSize = 0.03;
      min_x = node.x - markerSize / 2;
      max_x = node.x + markerSize / 2;
      min_y = node.y - markerSize / 2;
      max_y = node.y + markerSize / 2;
      break;
    }
  }

  // Constrain inside standard normalized canvas grid coordinates (0.0 to 1.0)
  return {
    min_x: Math.max(0, Math.min(1, min_x - padding)),
    min_y: Math.max(0, Math.min(1, min_y - padding)),
    max_x: Math.max(0, Math.min(1, max_x + padding)),
    max_y: Math.max(0, Math.min(1, max_y + padding)),
  };
}

// ============================================================
// Vector Points / Rendering Complexity Cost Checker
// ============================================================

const MAX_TOTAL_POINTS = 100000;
const MAX_NODE_POINTS = 500;

/**
 * Calculates complexity weight for a node
 */
export function calculateNodePointsWeight(node: any): number {
  if (node.type === "freedraw" || node.type === "rotation") {
    return Math.min(MAX_NODE_POINTS, (node.points || []).length / 2);
  }
  return 4; // Geometric shapes and annotations carry standard minor weight
}
